"""
Opportunity Matching API Routes
"""

from flask import Blueprint, request, jsonify
from datetime import datetime, timedelta
import logging

from ..services.matching_service import MatchingService
from ..models.matching import MatchingRequest, MatchingResult, MatchingFeedback
from ..models.user import User
from ..middleware.auth import require_auth
from ..schemas.matching_schemas import CreateMatchingRequestSchema, MatchingFeedbackSchema
from marshmallow import ValidationError as MarshmallowValidationError

# Enhanced middleware for production
from ..middleware.error_handler import handle_errors, validate_request_json, ValidationError


logger = logging.getLogger(__name__)

matching_bp = Blueprint('matching', __name__, url_prefix='/api/matching')


@matching_bp.route('/create', methods=['POST'])
@require_auth
@handle_errors
@validate_request_json(['title', 'required_skills'])
def create_matching_request():
    """
    Create a new matching request
    """
    try:
        data = request.json
        
        # Validate input with Marshmallow schema
        schema = CreateMatchingRequestSchema()
        try:
            validated_data = schema.load(data)
        except MarshmallowValidationError as e:
            raise ValidationError("Invalid input data", payload={'errors': e.messages})
        
        from flask import g
        user_address = g.wallet_address
        # Create matching request
        matching_request = MatchingRequest(
            seeker_address=user_address,
            title=data['title'],
            description=data.get('description'),
            category=data.get('category'),
            required_skills=data['required_skills'],
            budget_min=data.get('budget', {}).get('min'),
            budget_max=data.get('budget', {}).get('max'),
            hours_per_week=data.get('hours_per_week'),
            duration_weeks=data.get('duration_weeks'),
            start_date=datetime.fromisoformat(data['start_date'].replace('Z', '+00:00')) if data.get('start_date') else None,
            status='active',
            expires_at=datetime.utcnow() + timedelta(days=30)  # Expire after 30 days
        )
        
        # Save to database
        from ..main import db
        db.session.add(matching_request)
        db.session.commit()

        # Run matching algorithm
        matching_service = MatchingService(db.session)

        # Get candidate profiles from blockchain/database
        # TODO: Implement proper candidate fetching
        candidate_profiles = _fetch_candidate_profiles(data['required_skills'])

        # Calculate matches
        matches = matching_service.find_matches(
            seeker_requirements={
                'required_skills': data['required_skills'],
                'budget': data.get('budget'),
                'hours_per_week': data.get('hours_per_week'),
                'duration_weeks': data.get('duration_weeks'),
                'start_date': data.get('start_date')
            },
            candidate_profiles=candidate_profiles,
            limit=20
        )
        
        # Save results to database
        for match in matches:
            result = MatchingResult(
                request_id=matching_request.id,
                provider_address=match['provider_address'],
                total_score=match['total_score'],
                skill_score=match['dimension_scores']['skill_match'],
                availability_score=match['dimension_scores']['availability'],
                reputation_score=match['dimension_scores']['reputation'],
                price_score=match['dimension_scores']['price'],
                network_score=match['dimension_scores']['network'],
                responsiveness_score=match['dimension_scores']['responsiveness'],
                match_quality=match['match_quality'],
                matched_skills=match['matched_skills'],
                recommendations=match['recommendations']
            )
            db.session.add(result)
        
        db.session.commit()
        
        logger.info(f"Created matching request {matching_request.id} for {user_address} with {len(matches)} matches")
        
        return jsonify({
            'success': True,
            'request_id': matching_request.id,
            'matches_found': len(matches),
            'matches': [m for m in matches][:10]  # Return top 10
        }), 201
            
    except Exception as e:
        logger.error(f"Error creating matching request: {str(e)}")
        return jsonify({'error': 'Failed to create matching request', 'details': str(e)}), 500


@matching_bp.route('/results/<int:request_id>', methods=['GET'])
@require_auth
def get_matching_results(request_id):
    """
    Get matching results for a request
    """
    try:
        user_address = request.user_address
        min_score = request.args.get('min_score', 0, type=float)
        limit = request.args.get('limit', 20, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        from ..main import db
        
        # Get matching request
        matching_request = db.session.query(MatchingRequest).filter_by(
            id=request_id,
            seeker_address=user_address
        ).first()
        
        if not matching_request:
            return jsonify({'error': 'Matching request not found'}), 404
        
        # Get results
        results_query = db.session.query(MatchingResult).filter(
            MatchingResult.request_id == request_id,
            MatchingResult.total_score >= min_score
        ).order_by(MatchingResult.total_score.desc())
        
        total_count = results_query.count()
        results = results_query.offset(offset).limit(limit).all()
        
        # Enrich with provider profiles
        enriched_results = []
        for result in results:
            result_dict = result.to_dict()
            
            # Get provider profile from database
            provider = db.session.query(User).filter_by(
                wallet_address=result.provider_address
            ).first()
            
            if provider:
                result_dict['provider_profile'] = {
                    'name': provider.name,
                    'title': provider.title,
                    'company': provider.company,
                    'avatar_url': provider.avatar_url,
                    'is_verified': provider.is_verified
                }
            
            enriched_results.append(result_dict)
        
        return jsonify({
            'success': True,
            'request': matching_request.to_dict(),
            'total_count': total_count,
            'results': enriched_results,
            'pagination': {
                'limit': limit,
                'offset': offset,
                'has_more': (offset + limit) < total_count
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting matching results: {str(e)}")
        return jsonify({'error': 'Failed to get matching results', 'details': str(e)}), 500


@matching_bp.route('/my-requests', methods=['GET'])
@require_auth
def get_my_requests():
    """
    Get all matching requests created by the user
    """
    try:
        user_address = request.user_address
        status = request.args.get('status')
        limit = request.args.get('limit', 20, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        from ..main import db
        
        query = db.session.query(MatchingRequest).filter_by(
            seeker_address=user_address
        )
        
        if status:
            query = query.filter_by(status=status)
        
        query = query.order_by(MatchingRequest.created_at.desc())
        
        total_count = query.count()
        requests = query.offset(offset).limit(limit).all()
        
        # Include match counts
        results = []
        for req in requests:
            req_dict = req.to_dict()
            req_dict['matches_count'] = len(req.results)
            req_dict['high_quality_matches'] = sum(1 for r in req.results if r.total_score >= 80)
            results.append(req_dict)
        
        return jsonify({
            'success': True,
            'total_count': total_count,
            'requests': results,
            'pagination': {
                'limit': limit,
                'offset': offset,
                'has_more': (offset + limit) < total_count
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting user requests: {str(e)}")
        return jsonify({'error': 'Failed to get requests', 'details': str(e)}), 500


@matching_bp.route('/feedback', methods=['POST'])
@require_auth
@validate_request_json(['result_id', 'rating'])
def submit_feedback():
    """
    Submit feedback on a match
    """
    try:
        data = request.json
        user_address = request.user_address
        
        # Validate input with Marshmallow schema
        schema = MatchingFeedbackSchema()
        try:
            validated_data = schema.load(data)
        except MarshmallowValidationError as e:
            raise ValidationError("Invalid input data", payload={'errors': e.messages})

        from ..main import db
        
        # Get the result
        result = db.session.query(MatchingResult).filter_by(id=validated_data['result_id']).first()
        
        if not result:
            return jsonify({'error': 'Matching result not found'}), 404
        
        # Check if user is the seeker
        if result.request.seeker_address != user_address:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Create feedback entry
        feedback = MatchingFeedback(
            result_id=validated_data['result_id'],
            user_address=user_address,
            rating=validated_data['rating'],
            is_successful=validated_data.get('is_successful'),
            feedback_text=validated_data.get('feedback_text'),
            skill_match_rating=validated_data.get('detailed_ratings', {}).get('skill_match'),
            communication_rating=validated_data.get('detailed_ratings', {}).get('communication'),
            professionalism_rating=validated_data.get('detailed_ratings', {}).get('professionalism'),
            value_rating=validated_data.get('detailed_ratings', {}).get('value')
        )
        
        db.session.add(feedback)
        db.session.commit()
        
        logger.info(f"Feedback submitted for result {result.id} by {user_address}")
        
        return jsonify({
            'success': True,
            'message': 'Feedback submitted successfully'
        }), 201
        
    except Exception as e:
        logger.error(f"Error submitting feedback: {str(e)}")
        return jsonify({'error': 'Failed to submit feedback', 'details': str(e)}), 500


@matching_bp.route('/results/<int:result_id>/viewed', methods=['POST'])
@require_auth
def mark_result_viewed(result_id):
    """
    Mark a matching result as viewed by the seeker
    """
    try:
        user_address = request.user_address
        from ..main import db
        
        result = db.session.query(MatchingResult).filter_by(id=result_id).first()
        
        if not result:
            return jsonify({'error': 'Result not found'}), 404
        
        if result.request.seeker_address != user_address:
            return jsonify({'error': 'Unauthorized'}), 403
            
        result.is_viewed = True
        db.session.commit()
        
        return jsonify({'success': True}), 200
        
    except Exception as e:
        logger.error(f"Error marking result as viewed: {str(e)}")
        return jsonify({'error': 'Failed to mark as viewed', 'details': str(e)}), 500


def _fetch_candidate_profiles(required_skills):
    """
    Placeholder for fetching candidate profiles.
    In a real application, this would query a database or another service.
    """
    # TODO: Replace with actual data source
    return [
        {
            'provider_address': '0x123',
            'skills': ['python', 'flask', 'javascript'],
            'availability': {'hours_per_week': 30, 'start_date': '2025-12-01'},
            'reputation': 4.8,
            'hourly_rate': 75,
            'past_collaborations': ['0xabc']
        },
        {
            'provider_address': '0x456',
            'skills': ['python', 'fastapi', 'vue'],
            'availability': {'hours_per_week': 40, 'start_date': '2025-11-20'},
            'reputation': 4.5,
            'hourly_rate': 80,
            'past_collaborations': ['0xdef']
        }
    ]

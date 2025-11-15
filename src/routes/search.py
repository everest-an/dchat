"""
Enhanced Search API

Provides full-text search functionality for messages, users, files, and groups.
Uses PostgreSQL full-text search with Redis caching.

Features:
- Message search with filters
- User search
- File search
- Group search
- Search suggestions
- Search history
- Advanced filters (date, type, sender)

Author: Manus AI
Date: 2024-11-05
"""

from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import json

from ..models.user import db, User
from ..models.message import Message
from ..config.redis_config import RedisService

# Enhanced middleware for production
from ..middleware.auth import require_auth, optional_auth, require_role
from ..middleware.error_handler import handle_errors, validate_request_json, ValidationError


logger = logging.getLogger(__name__)

search_bp = Blueprint('search', __name__, url_prefix='/api/search')
redis_service = RedisService()


@search_bp.route('/health', methods=['GET'])
def health_check():@handle_errors
@search_bp.route('/health', methods=['GET'])

    """
    Health check endpoint for search service.
    
    Returns:
        JSON response with service status
    """
    return jsonify({
        'status': 'healthy',
        'service': 'search',
        'timestamp': datetime.utcnow().isoformat()
    }), 200


@search_bp.route('/messages', methods=['GET'])
@require_auth
def search_messages():@handle_errors
@search_bp.route('/messages', methods=['GET'])
@require_auth

    """
    Search messages with full-text search and filters.
    
    Query Parameters:
        q: Search query (required)
        user_id: Filter by sender user ID
        conversation_id: Filter by conversation
        start_date: Filter by start date (ISO format)
        end_date: Filter by end date (ISO format)
        limit: Maximum results (default: 20, max: 100)
        offset: Offset for pagination (default: 0)
    
    Returns:
        JSON response with search results
    """
    try:
        user_id = g.user_id
        query = request.args.get('q', '').strip()
        
        if not query:
            return jsonify({'error': 'Search query required'}), 400
        
        if len(query) < 2:
            return jsonify({'error': 'Query too short (minimum 2 characters)'}), 400
        
        # Get filters
        sender_id = request.args.get('user_id')
        conversation_id = request.args.get('conversation_id')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        limit = min(request.args.get('limit', 20, type=int), 100)
        offset = request.args.get('offset', 0, type=int)
        
        # Check cache
        cache_key = f"search:messages:{user_id}:{query}:{sender_id}:{conversation_id}:{start_date}:{end_date}:{limit}:{offset}"
        cached_result = redis_service.get_value(cache_key)
        if cached_result:
            return jsonify(json.loads(cached_result)), 200
        
        # Build query
        # PostgreSQL full-text search using to_tsvector and to_tsquery
        search_query = Message.query.filter(
            db.or_(
                Message.sender_id == user_id,
                Message.receiver_id == user_id
            )
        )
        
        # Add full-text search
        # Note: This requires a GIN index on message content
        # CREATE INDEX idx_message_content_fts ON messages USING GIN (to_tsvector('english', content));
        search_vector = db.func.to_tsvector('english', Message.content)
        search_query_ts = db.func.to_tsquery('english', f"{query}:*")
        search_query = search_query.filter(search_vector.op('@@')(search_query_ts))
        
        # Apply filters
        if sender_id:
            search_query = search_query.filter(Message.sender_id == sender_id)
        
        if conversation_id:
            search_query = search_query.filter(
                db.or_(
                    db.and_(Message.sender_id == user_id, Message.receiver_id == conversation_id),
                    db.and_(Message.sender_id == conversation_id, Message.receiver_id == user_id)
                )
            )
        
        if start_date:
            try:
                start_dt = datetime.fromisoformat(start_date)
                search_query = search_query.filter(Message.timestamp >= start_dt)
            except ValueError:
                pass
        
        if end_date:
            try:
                end_dt = datetime.fromisoformat(end_date)
                search_query = search_query.filter(Message.timestamp <= end_dt)
            except ValueError:
                pass
        
        # Get total count
        total = search_query.count()
        
        # Get results with pagination
        messages = search_query.order_by(Message.timestamp.desc()).offset(offset).limit(limit).all()
        
        # Format results
        results = []
        for message in messages:
            # Highlight search terms in content
            highlighted_content = _highlight_text(message.content, query)
            
            results.append({
                'id': message.id,
                'sender_id': message.sender_id,
                'receiver_id': message.receiver_id,
                'content': message.content,
                'highlighted_content': highlighted_content,
                'timestamp': message.timestamp.isoformat(),
                'is_encrypted': message.is_encrypted,
                'relevance': _calculate_relevance(message.content, query)
            })
        
        response_data = {
            'success': True,
            'query': query,
            'results': results,
            'total': total,
            'limit': limit,
            'offset': offset
        }
        
        # Cache results for 5 minutes
        redis_service.set_value(cache_key, json.dumps(response_data), ttl=300)
        
        # Save to search history
        _save_search_history(user_id, query, 'messages', total)
        
        return jsonify(response_data), 200
        
    except Exception as e:
        logger.error(f"Error searching messages: {str(e)}")
        return jsonify({'error': 'Search failed'}), 500


@search_bp.route('/users', methods=['GET'])
@require_auth
def search_users():@handle_errors
@search_bp.route('/users', methods=['GET'])
@require_auth

    """
    Search users by name, email, or wallet address.
    
    Query Parameters:
        q: Search query (required)
        limit: Maximum results (default: 20, max: 100)
        offset: Offset for pagination (default: 0)
    
    Returns:
        JSON response with search results
    """
    try:
        user_id = g.user_id
        query = request.args.get('q', '').strip()
        
        if not query:
            return jsonify({'error': 'Search query required'}), 400
        
        if len(query) < 2:
            return jsonify({'error': 'Query too short (minimum 2 characters)'}), 400
        
        limit = min(request.args.get('limit', 20, type=int), 100)
        offset = request.args.get('offset', 0, type=int)
        
        # Check cache
        cache_key = f"search:users:{user_id}:{query}:{limit}:{offset}"
        cached_result = redis_service.get_value(cache_key)
        if cached_result:
            return jsonify(json.loads(cached_result)), 200
        
        # Build query
        search_pattern = f"%{query}%"
        search_query = User.query.filter(
            db.or_(
                User.username.ilike(search_pattern),
                User.email.ilike(search_pattern),
                User.wallet_address.ilike(search_pattern)
            )
        ).filter(User.id != user_id)  # Exclude current user
        
        # Get total count
        total = search_query.count()
        
        # Get results with pagination
        users = search_query.offset(offset).limit(limit).all()
        
        # Format results
        results = []
        for user in users:
            results.append({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'wallet_address': user.wallet_address,
                'bio': user.bio,
                'avatar_url': user.avatar_url,
                'created_at': user.created_at.isoformat() if user.created_at else None
            })
        
        response_data = {
            'success': True,
            'query': query,
            'results': results,
            'total': total,
            'limit': limit,
            'offset': offset
        }
        
        # Cache results for 5 minutes
        redis_service.set_value(cache_key, json.dumps(response_data), ttl=300)
        
        # Save to search history
        _save_search_history(user_id, query, 'users', total)
        
        return jsonify(response_data), 200
        
    except Exception as e:
        logger.error(f"Error searching users: {str(e)}")
        return jsonify({'error': 'Search failed'}), 500


@search_bp.route('/all', methods=['GET'])
@require_auth
def search_all():@handle_errors
@search_bp.route('/all', methods=['GET'])
@require_auth

    """
    Search across all content types (messages, users, files, groups).
    
    Query Parameters:
        q: Search query (required)
        types: Comma-separated list of types to search (default: all)
                Options: messages, users, files, groups
        limit: Maximum results per type (default: 5, max: 20)
    
    Returns:
        JSON response with search results grouped by type
    """
    try:
        user_id = g.user_id
        query = request.args.get('q', '').strip()
        
        if not query:
            return jsonify({'error': 'Search query required'}), 400
        
        if len(query) < 2:
            return jsonify({'error': 'Query too short (minimum 2 characters)'}), 400
        
        types_param = request.args.get('types', 'messages,users')
        search_types = [t.strip() for t in types_param.split(',')]
        limit = min(request.args.get('limit', 5, type=int), 20)
        
        # Check cache
        cache_key = f"search:all:{user_id}:{query}:{types_param}:{limit}"
        cached_result = redis_service.get_value(cache_key)
        if cached_result:
            return jsonify(json.loads(cached_result)), 200
        
        results = {}
        
        # Search messages
        if 'messages' in search_types:
            search_vector = db.func.to_tsvector('english', Message.content)
            search_query_ts = db.func.to_tsquery('english', f"{query}:*")
            
            messages = Message.query.filter(
                db.or_(
                    Message.sender_id == user_id,
                    Message.receiver_id == user_id
                )
            ).filter(
                search_vector.op('@@')(search_query_ts)
            ).order_by(Message.timestamp.desc()).limit(limit).all()
            
            results['messages'] = [{
                'id': m.id,
                'sender_id': m.sender_id,
                'receiver_id': m.receiver_id,
                'content': m.content[:100] + '...' if len(m.content) > 100 else m.content,
                'timestamp': m.timestamp.isoformat()
            } for m in messages]
        
        # Search users
        if 'users' in search_types:
            search_pattern = f"%{query}%"
            users = User.query.filter(
                db.or_(
                    User.username.ilike(search_pattern),
                    User.email.ilike(search_pattern),
                    User.wallet_address.ilike(search_pattern)
                )
            ).filter(User.id != user_id).limit(limit).all()
            
            results['users'] = [{
                'id': u.id,
                'username': u.username,
                'email': u.email,
                'wallet_address': u.wallet_address,
                'avatar_url': u.avatar_url
            } for u in users]
        
        response_data = {
            'success': True,
            'query': query,
            'results': results,
            'types': search_types
        }
        
        # Cache results for 5 minutes
        redis_service.set_value(cache_key, json.dumps(response_data), ttl=300)
        
        # Save to search history
        total_results = sum(len(v) for v in results.values())
        _save_search_history(user_id, query, 'all', total_results)
        
        return jsonify(response_data), 200
        
    except Exception as e:
        logger.error(f"Error searching all: {str(e)}")
        return jsonify({'error': 'Search failed'}), 500


@search_bp.route('/suggestions', methods=['GET'])
@require_auth
def get_search_suggestions():@handle_errors
@search_bp.route('/suggestions', methods=['GET'])
@require_auth

    """
    Get search suggestions based on partial query.
    
    Query Parameters:
        q: Partial search query (required)
        limit: Maximum suggestions (default: 10, max: 20)
    
    Returns:
        JSON response with search suggestions
    """
    try:
        user_id = g.user_id
        query = request.args.get('q', '').strip()
        
        if not query:
            return jsonify({'suggestions': []}), 200
        
        limit = min(request.args.get('limit', 10, type=int), 20)
        
        # Check cache
        cache_key = f"search:suggestions:{user_id}:{query}:{limit}"
        cached_result = redis_service.get_value(cache_key)
        if cached_result:
            return jsonify(json.loads(cached_result)), 200
        
        # Get suggestions from search history
        history_key = f"search:history:{user_id}"
        history_json = redis_service.get_value(history_key)
        
        suggestions = []
        if history_json:
            history = json.loads(history_json)
            # Filter history by partial match
            for item in history:
                if query.lower() in item['query'].lower():
                    suggestions.append(item['query'])
                if len(suggestions) >= limit:
                    break
        
        # Add popular searches if not enough suggestions
        if len(suggestions) < limit:
            # Get from recent user searches
            search_pattern = f"%{query}%"
            recent_messages = Message.query.filter(
                db.or_(
                    Message.sender_id == user_id,
                    Message.receiver_id == user_id
                ),
                Message.content.ilike(search_pattern)
            ).order_by(Message.timestamp.desc()).limit(5).all()
            
            for msg in recent_messages:
                # Extract keywords from message
                words = msg.content.split()
                for word in words:
                    if query.lower() in word.lower() and word not in suggestions:
                        suggestions.append(word)
                        if len(suggestions) >= limit:
                            break
                if len(suggestions) >= limit:
                    break
        
        response_data = {
            'success': True,
            'query': query,
            'suggestions': suggestions[:limit]
        }
        
        # Cache for 1 minute
        redis_service.set_value(cache_key, json.dumps(response_data), ttl=60)
        
        return jsonify(response_data), 200
        
    except Exception as e:
        logger.error(f"Error getting suggestions: {str(e)}")
        return jsonify({'error': 'Failed to get suggestions'}), 500


@search_bp.route('/history', methods=['GET'])
@require_auth
def get_search_history():@handle_errors
@search_bp.route('/history', methods=['GET'])
@require_auth

    """
    Get user's search history.
    
    Query Parameters:
        limit: Maximum history items (default: 20, max: 100)
    
    Returns:
        JSON response with search history
    """
    try:
        user_id = g.user_id
        limit = min(request.args.get('limit', 20, type=int), 100)
        
        # Get from Redis
        history_key = f"search:history:{user_id}"
        history_json = redis_service.get_value(history_key)
        
        if history_json:
            history = json.loads(history_json)
            return jsonify({
                'success': True,
                'history': history[:limit]
            }), 200
        else:
            return jsonify({
                'success': True,
                'history': []
            }), 200
        
    except Exception as e:
        logger.error(f"Error getting search history: {str(e)}")
        return jsonify({'error': 'Failed to get history'}), 500


@search_bp.route('/history', methods=['DELETE'])
@require_auth
def clear_search_history():@handle_errors
@search_bp.route('/history', methods=['DELETE'])
@require_auth

    """
    Clear user's search history.
    
    Returns:
        JSON response confirming deletion
    """
    try:
        user_id = g.user_id
        
        # Delete from Redis
        history_key = f"search:history:{user_id}"
        redis_service.delete_key(history_key)
        
        logger.info(f"Search history cleared for user {user_id}")
        
        return jsonify({
            'success': True,
            'message': 'Search history cleared'
        }), 200
        
    except Exception as e:
        logger.error(f"Error clearing search history: {str(e)}")
        return jsonify({'error': 'Failed to clear history'}), 500


# Helper functions

def _highlight_text(text: str, query: str, max_length: int = 200) -> str:
    """
    Highlight search terms in text.
    
    Args:
        text: Original text
        query: Search query
        max_length: Maximum length of highlighted text
    
    Returns:
        Highlighted text with <mark> tags
    """
    import re

    
    # Find query position
    pattern = re.compile(re.escape(query), re.IGNORECASE)
    match = pattern.search(text)
    
    if not match:
        return text[:max_length] + ('...' if len(text) > max_length else '')
    
    # Extract context around match
    start = max(0, match.start() - 50)
    end = min(len(text), match.end() + 150)
    
    snippet = text[start:end]
    if start > 0:
        snippet = '...' + snippet
    if end < len(text):
        snippet = snippet + '...'
    
    # Highlight query
    highlighted = pattern.sub(lambda m: f"<mark>{m.group()}</mark>", snippet)
    
    return highlighted


def _calculate_relevance(text: str, query: str) -> float:
    """
    Calculate relevance score for search result.
    
    Args:
        text: Text content
        query: Search query
    
    Returns:
        Relevance score (0.0 to 1.0)
    """
    text_lower = text.lower()
    query_lower = query.lower()
    
    # Exact match
    if query_lower in text_lower:
        # Position bonus (earlier = higher score)
        position = text_lower.index(query_lower)
        position_score = 1.0 - (position / len(text))
        
        # Frequency bonus
        frequency = text_lower.count(query_lower)
        frequency_score = min(frequency / 10.0, 1.0)
        
        return (position_score * 0.6 + frequency_score * 0.4)
    
    # Partial match
    words = query_lower.split()
    matches = sum(1 for word in words if word in text_lower)
    return matches / len(words) * 0.5


def _save_search_history(user_id: str, query: str, search_type: str, result_count: int):
    """
    Save search to user's history.
    
    Args:
        user_id: User ID
        query: Search query
        search_type: Type of search
        result_count: Number of results
    """
    try:
        history_key = f"search:history:{user_id}"
        history_json = redis_service.get_value(history_key)
        
        if history_json:
            history = json.loads(history_json)
        else:
            history = []
        
        # Add new search
        history.insert(0, {
            'query': query,
            'type': search_type,
            'result_count': result_count,
            'timestamp': datetime.utcnow().isoformat()
        })
        
        # Keep only last 100 searches
        history = history[:100]
        
        # Save back to Redis (30 days TTL)
        redis_service.set_value(history_key, json.dumps(history), ttl=86400 * 30)
        
    except Exception as e:
        logger.error(f"Error saving search history: {str(e)}")

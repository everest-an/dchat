"""
Message Reactions API

Provides message reaction functionality similar to Telegram/Slack.
Users can react to messages with emoji or custom reactions.

Features:
- Add/remove reactions to messages
- Get reactions for a message
- Get users who reacted
- Real-time reaction updates via Socket.IO
- Reaction analytics

Author: Manus AI
Date: 2024-11-05
"""

from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity
import logging
from datetime import datetime
from typing import List, Dict, Optional

from ..models.user import db
from ..config.redis_config import RedisService
import json

# Enhanced middleware for production
from ..middleware.auth import require_auth, optional_auth, require_role
from ..middleware.error_handler import handle_errors, validate_request_json, ValidationError



logger = logging.getLogger(__name__)

reactions_bp = Blueprint('reactions', __name__, url_prefix='/api/reactions')
redis_service = RedisService()


@reactions_bp.route('/health', methods=['GET'])
@handle_errors
def health_check():

    """
    Health check endpoint for reactions service.
    
    Returns:
        JSON response with service status
    """
    return jsonify({
        'status': 'healthy',
        'service': 'reactions',
        'timestamp': datetime.utcnow().isoformat()
    }), 200


@reactions_bp.route('/message/<message_id>', methods=['POST'])
@require_auth
@handle_errors
def add_reaction(message_id):

    """
    Add a reaction to a message.
    
    Args:
        message_id: Message ID to react to
    
    Request Body:
        {
            "emoji": "👍",  # Emoji or reaction identifier
            "type": "emoji" | "custom"  # Reaction type
        }
    
    Returns:
        JSON response with reaction details
    """
    try:
        user_id = g.user_id
        data = request.get_json()
        
        if not data or 'emoji' not in data:
            return jsonify({'error': 'Emoji required'}), 400
        
        emoji = data['emoji']
        reaction_type = data.get('type', 'emoji')
        
        # Get current reactions from Redis
        reactions_key = f"reactions:{message_id}"
        reactions_json = redis_service.get_value(reactions_key)
        
        if reactions_json:
            reactions = json.loads(reactions_json)
        else:
            reactions = {}
        
        # Initialize emoji reactions list if not exists
        if emoji not in reactions:
            reactions[emoji] = []
        
        # Check if user already reacted with this emoji
        user_reactions = [r for r in reactions[emoji] if r['user_id'] == user_id]
        if user_reactions:
            return jsonify({'error': 'Already reacted with this emoji'}), 400
        
        # Add reaction
        reaction = {
            'user_id': user_id,
            'type': reaction_type,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        reactions[emoji].append(reaction)
        
        # Save to Redis (30 days TTL)
        redis_service.set_value(reactions_key, json.dumps(reactions), ttl=86400 * 30)
        
        # Get reaction count
        reaction_count = sum(len(users) for users in reactions.values())
        
        # TODO: Emit Socket.IO event for real-time updates
        # socketio.emit('reaction_added', {
        #     'message_id': message_id,
        #     'emoji': emoji,
        #     'user_id': user_id,
        #     'count': len(reactions[emoji])
        # }, room=f'message:{message_id}')
        
        logger.info(f"User {user_id} reacted to message {message_id} with {emoji}")
        
        return jsonify({
            'success': True,
            'message_id': message_id,
            'emoji': emoji,
            'count': len(reactions[emoji]),
            'total_reactions': reaction_count,
            'reaction': reaction
        }), 201
        
    except Exception as e:
        logger.error(f"Error adding reaction: {str(e)}")
        return jsonify({'error': 'Failed to add reaction'}), 500


@reactions_bp.route('/message/<message_id>/emoji/<emoji>', methods=['DELETE'])
@require_auth
@handle_errors
def remove_reaction(message_id, emoji):

    """
    Remove a reaction from a message.
    
    Args:
        message_id: Message ID
        emoji: Emoji to remove
    
    Returns:
        JSON response confirming removal
    """
    try:
        user_id = g.user_id
        
        # Get current reactions from Redis
        reactions_key = f"reactions:{message_id}"
        reactions_json = redis_service.get_value(reactions_key)
        
        if not reactions_json:
            return jsonify({'error': 'No reactions found'}), 404
        
        reactions = json.loads(reactions_json)
        
        # Check if emoji exists
        if emoji not in reactions:
            return jsonify({'error': 'Reaction not found'}), 404
        
        # Remove user's reaction
        original_count = len(reactions[emoji])
        reactions[emoji] = [r for r in reactions[emoji] if r['user_id'] != user_id]
        
        # Check if reaction was removed
        if len(reactions[emoji]) == original_count:
            return jsonify({'error': 'Reaction not found'}), 404
        
        # Remove emoji key if no more reactions
        if len(reactions[emoji]) == 0:
            del reactions[emoji]
        
        # Save to Redis or delete if no reactions left
        if reactions:
            redis_service.set_value(reactions_key, json.dumps(reactions), ttl=86400 * 30)
        else:
            redis_service.delete_value(reactions_key)
        
        # Get reaction count
        reaction_count = sum(len(users) for users in reactions.values())
        
        # TODO: Emit Socket.IO event for real-time updates
        # socketio.emit('reaction_removed', {
        #     'message_id': message_id,
        #     'emoji': emoji,
        #     'user_id': user_id,
        #     'count': len(reactions.get(emoji, []))
        # }, room=f'message:{message_id}')
        
        logger.info(f"User {user_id} removed reaction {emoji} from message {message_id}")
        
        return jsonify({
            'success': True,
            'message_id': message_id,
            'emoji': emoji,
            'count': len(reactions.get(emoji, [])),
            'total_reactions': reaction_count
        }), 200
        
    except Exception as e:
        logger.error(f"Error removing reaction: {str(e)}")
        return jsonify({'error': 'Failed to remove reaction'}), 500


@reactions_bp.route('/message/<message_id>', methods=['GET'])
@require_auth
@handle_errors
def get_message_reactions(message_id):

    """
    Get all reactions for a message.
    
    Args:
        message_id: Message ID
    
    Query Parameters:
        include_users: Include user details (default: false)
    
    Returns:
        JSON response with reactions grouped by emoji
    """
    try:
        include_users = request.args.get('include_users', 'false').lower() == 'true'
        
        # Get reactions from Redis
        reactions_key = f"reactions:{message_id}"
        reactions_json = redis_service.get_value(reactions_key)
        
        if not reactions_json:
            return jsonify({
                'success': True,
                'message_id': message_id,
                'reactions': {},
                'total_reactions': 0
            }), 200
        
        reactions = json.loads(reactions_json)
        
        # Format response
        formatted_reactions = {}
        for emoji, users in reactions.items():
            formatted_reactions[emoji] = {
                'emoji': emoji,
                'count': len(users),
                'users': users if include_users else [r['user_id'] for r in users]
            }
        
        # Get total reaction count
        total_reactions = sum(len(users) for users in reactions.values())
        
        return jsonify({
            'success': True,
            'message_id': message_id,
            'reactions': formatted_reactions,
            'total_reactions': total_reactions
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting reactions: {str(e)}")
        return jsonify({'error': 'Failed to get reactions'}), 500


@reactions_bp.route('/message/<message_id>/emoji/<emoji>/users', methods=['GET'])
@require_auth
@handle_errors
def get_reaction_users(message_id, emoji):

    """
    Get users who reacted with a specific emoji.
    
    Args:
        message_id: Message ID
        emoji: Emoji
    
    Query Parameters:
        limit: Maximum users (default: 50, max: 100)
        offset: Offset for pagination (default: 0)
    
    Returns:
        JSON response with user list
    """
    try:
        limit = min(request.args.get('limit', 50, type=int), 100)
        offset = request.args.get('offset', 0, type=int)
        
        # Get reactions from Redis
        reactions_key = f"reactions:{message_id}"
        reactions_json = redis_service.get_value(reactions_key)
        
        if not reactions_json:
            return jsonify({
                'success': True,
                'message_id': message_id,
                'emoji': emoji,
                'users': [],
                'total': 0
            }), 200
        
        reactions = json.loads(reactions_json)
        
        # Check if emoji exists
        if emoji not in reactions:
            return jsonify({
                'success': True,
                'message_id': message_id,
                'emoji': emoji,
                'users': [],
                'total': 0
            }), 200
        
        # Get users
        all_users = reactions[emoji]
        total = len(all_users)
        users = all_users[offset:offset + limit]
        
        return jsonify({
            'success': True,
            'message_id': message_id,
            'emoji': emoji,
            'users': users,
            'total': total,
            'limit': limit,
            'offset': offset
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting reaction users: {str(e)}")
        return jsonify({'error': 'Failed to get users'}), 500


@reactions_bp.route('/user/<user_id>/reactions', methods=['GET'])
@require_auth
@handle_errors
def get_user_reactions(user_id):

    """
    Get all reactions by a user.
    
    Args:
        user_id: User ID
    
    Query Parameters:
        limit: Maximum reactions (default: 20, max: 100)
        offset: Offset for pagination (default: 0)
    
    Returns:
        JSON response with user's reactions
    """
    try:
        current_user_id = g.user_id
        
        # Only allow users to see their own reactions (privacy)
        if user_id != current_user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        limit = min(request.args.get('limit', 20, type=int), 100)
        offset = request.args.get('offset', 0, type=int)
        
        # Get user reactions from Redis
        # Note: This is a simplified implementation
        # In production, you might want to maintain a separate index
        user_reactions_key = f"user_reactions:{user_id}"
        user_reactions_json = redis_service.get_value(user_reactions_key)
        
        if user_reactions_json:
            user_reactions = json.loads(user_reactions_json)
        else:
            user_reactions = []
        
        # Paginate
        total = len(user_reactions)
        reactions = user_reactions[offset:offset + limit]
        
        return jsonify({
            'success': True,
            'user_id': user_id,
            'reactions': reactions,
            'total': total,
            'limit': limit,
            'offset': offset
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting user reactions: {str(e)}")
        return jsonify({'error': 'Failed to get user reactions'}), 500


@reactions_bp.route('/popular', methods=['GET'])
@require_auth
@handle_errors
def get_popular_reactions():

    """
    Get popular reactions (most used emoji).
    
    Query Parameters:
        limit: Maximum reactions (default: 10, max: 50)
        period: Time period ('day', 'week', 'month', 'all')
    
    Returns:
        JSON response with popular reactions
    """
    try:
        limit = min(request.args.get('limit', 10, type=int), 50)
        period = request.args.get('period', 'all')
        
        # Get popular reactions from Redis
        popular_key = f"reactions:popular:{period}"
        popular_json = redis_service.get_value(popular_key)
        
        if popular_json:
            popular = json.loads(popular_json)
        else:
            # Default popular reactions
            popular = [
                {'emoji': '👍', 'count': 0},
                {'emoji': '❤️', 'count': 0},
                {'emoji': '😂', 'count': 0},
                {'emoji': '🔥', 'count': 0},
                {'emoji': '🎉', 'count': 0},
                {'emoji': '👏', 'count': 0},
                {'emoji': '😍', 'count': 0},
                {'emoji': '🤔', 'count': 0},
                {'emoji': '😢', 'count': 0},
                {'emoji': '💯', 'count': 0}
            ]
        
        return jsonify({
            'success': True,
            'period': period,
            'reactions': popular[:limit]
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting popular reactions: {str(e)}")
        return jsonify({'error': 'Failed to get popular reactions'}), 500


@reactions_bp.route('/stats', methods=['GET'])
@require_auth
@handle_errors
def get_reaction_stats():

    """
    Get reaction statistics.
    
    Returns:
        JSON response with reaction stats
    """
    try:
        user_id = g.user_id
        
        # Get stats from Redis
        stats_key = f"reactions:stats:{user_id}"
        stats_json = redis_service.get_value(stats_key)
        
        if stats_json:
            stats = json.loads(stats_json)
        else:
            stats = {
                'total_reactions_given': 0,
                'total_reactions_received': 0,
                'most_used_emoji': None,
                'most_received_emoji': None,
                'favorite_emoji': []
            }
        
        return jsonify({
            'success': True,
            'user_id': user_id,
            'stats': stats
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting reaction stats: {str(e)}")
        return jsonify({'error': 'Failed to get stats'}), 500

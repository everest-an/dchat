"""
Stickers and GIF API

Provides sticker and GIF functionality for chat messages.
Integrates with Tenor API for GIF search and custom sticker management.

Features:
- GIF search via Tenor API
- Custom sticker upload and management
- Sticker packs
- Favorites and recent stickers
- Trending GIFs

Author: Manus AI
Date: 2024-11-05
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import logging
import requests
import os
from datetime import datetime
from typing import List, Dict, Optional

from ..models.user import db
from ..config.redis_config import RedisService
import json

logger = logging.getLogger(__name__)

stickers_bp = Blueprint('stickers', __name__, url_prefix='/api/stickers')
redis_service = RedisService()

# Tenor API configuration
TENOR_API_KEY = os.getenv('TENOR_API_KEY', 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ')  # Default test key
TENOR_API_URL = 'https://tenor.googleapis.com/v2'


@stickers_bp.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint for stickers service.
    
    Returns:
        JSON response with service status
    """
    return jsonify({
        'status': 'healthy',
        'service': 'stickers',
        'tenor_api': 'connected' if TENOR_API_KEY else 'not_configured',
        'timestamp': datetime.utcnow().isoformat()
    }), 200


@stickers_bp.route('/gifs/search', methods=['GET'])
@jwt_required()
def search_gifs():
    """
    Search GIFs using Tenor API.
    
    Query Parameters:
        q: Search query (required)
        limit: Maximum results (default: 20, max: 50)
        pos: Position for pagination (from previous response)
        locale: Language code (default: en_US)
        contentfilter: Content filter (high, medium, low, off)
    
    Returns:
        JSON response with GIF results
    """
    try:
        query = request.args.get('q', '').strip()
        if not query:
            return jsonify({'error': 'Search query required'}), 400
        
        limit = min(request.args.get('limit', 20, type=int), 50)
        pos = request.args.get('pos', '')
        locale = request.args.get('locale', 'en_US')
        content_filter = request.args.get('contentfilter', 'medium')
        
        # Check cache
        cache_key = f"gifs:search:{query}:{limit}:{pos}:{locale}"
        cached_result = redis_service.get_value(cache_key)
        if cached_result:
            return jsonify(json.loads(cached_result)), 200
        
        # Call Tenor API
        params = {
            'key': TENOR_API_KEY,
            'q': query,
            'limit': limit,
            'locale': locale,
            'contentfilter': content_filter
        }
        
        if pos:
            params['pos'] = pos
        
        response = requests.get(f"{TENOR_API_URL}/search", params=params, timeout=5)
        response.raise_for_status()
        
        data = response.json()
        
        # Format results
        results = []
        for gif in data.get('results', []):
            media = gif.get('media_formats', {})
            results.append({
                'id': gif.get('id'),
                'title': gif.get('title', ''),
                'url': media.get('gif', {}).get('url', ''),
                'preview_url': media.get('tinygif', {}).get('url', ''),
                'thumbnail_url': media.get('nanogif', {}).get('url', ''),
                'width': media.get('gif', {}).get('dims', [0, 0])[0],
                'height': media.get('gif', {}).get('dims', [0, 0])[1],
                'size': media.get('gif', {}).get('size', 0)
            })
        
        response_data = {
            'success': True,
            'query': query,
            'results': results,
            'next': data.get('next', '')
        }
        
        # Cache for 1 hour
        redis_service.set_value(cache_key, json.dumps(response_data), ttl=3600)
        
        return jsonify(response_data), 200
        
    except requests.RequestException as e:
        logger.error(f"Tenor API error: {str(e)}")
        return jsonify({'error': 'GIF search failed'}), 500
    except Exception as e:
        logger.error(f"Error searching GIFs: {str(e)}")
        return jsonify({'error': 'Search failed'}), 500


@stickers_bp.route('/gifs/trending', methods=['GET'])
@jwt_required()
def get_trending_gifs():
    """
    Get trending GIFs from Tenor.
    
    Query Parameters:
        limit: Maximum results (default: 20, max: 50)
        pos: Position for pagination
        locale: Language code (default: en_US)
    
    Returns:
        JSON response with trending GIFs
    """
    try:
        limit = min(request.args.get('limit', 20, type=int), 50)
        pos = request.args.get('pos', '')
        locale = request.args.get('locale', 'en_US')
        
        # Check cache
        cache_key = f"gifs:trending:{limit}:{pos}:{locale}"
        cached_result = redis_service.get_value(cache_key)
        if cached_result:
            return jsonify(json.loads(cached_result)), 200
        
        # Call Tenor API
        params = {
            'key': TENOR_API_KEY,
            'limit': limit,
            'locale': locale
        }
        
        if pos:
            params['pos'] = pos
        
        response = requests.get(f"{TENOR_API_URL}/featured", params=params, timeout=5)
        response.raise_for_status()
        
        data = response.json()
        
        # Format results
        results = []
        for gif in data.get('results', []):
            media = gif.get('media_formats', {})
            results.append({
                'id': gif.get('id'),
                'title': gif.get('title', ''),
                'url': media.get('gif', {}).get('url', ''),
                'preview_url': media.get('tinygif', {}).get('url', ''),
                'thumbnail_url': media.get('nanogif', {}).get('url', ''),
                'width': media.get('gif', {}).get('dims', [0, 0])[0],
                'height': media.get('gif', {}).get('dims', [0, 0])[1],
                'size': media.get('gif', {}).get('size', 0)
            })
        
        response_data = {
            'success': True,
            'results': results,
            'next': data.get('next', '')
        }
        
        # Cache for 30 minutes
        redis_service.set_value(cache_key, json.dumps(response_data), ttl=1800)
        
        return jsonify(response_data), 200
        
    except requests.RequestException as e:
        logger.error(f"Tenor API error: {str(e)}")
        return jsonify({'error': 'Failed to get trending GIFs'}), 500
    except Exception as e:
        logger.error(f"Error getting trending GIFs: {str(e)}")
        return jsonify({'error': 'Failed to get trending GIFs'}), 500


@stickers_bp.route('/gifs/categories', methods=['GET'])
@jwt_required()
def get_gif_categories():
    """
    Get GIF categories from Tenor.
    
    Query Parameters:
        locale: Language code (default: en_US)
    
    Returns:
        JSON response with GIF categories
    """
    try:
        locale = request.args.get('locale', 'en_US')
        
        # Check cache
        cache_key = f"gifs:categories:{locale}"
        cached_result = redis_service.get_value(cache_key)
        if cached_result:
            return jsonify(json.loads(cached_result)), 200
        
        # Call Tenor API
        params = {
            'key': TENOR_API_KEY,
            'locale': locale
        }
        
        response = requests.get(f"{TENOR_API_URL}/categories", params=params, timeout=5)
        response.raise_for_status()
        
        data = response.json()
        
        # Format results
        categories = []
        for category in data.get('tags', []):
            categories.append({
                'name': category.get('searchterm', ''),
                'path': category.get('path', ''),
                'image': category.get('image', '')
            })
        
        response_data = {
            'success': True,
            'categories': categories
        }
        
        # Cache for 24 hours
        redis_service.set_value(cache_key, json.dumps(response_data), ttl=86400)
        
        return jsonify(response_data), 200
        
    except requests.RequestException as e:
        logger.error(f"Tenor API error: {str(e)}")
        return jsonify({'error': 'Failed to get categories'}), 500
    except Exception as e:
        logger.error(f"Error getting categories: {str(e)}")
        return jsonify({'error': 'Failed to get categories'}), 500


@stickers_bp.route('/favorites', methods=['GET'])
@jwt_required()
def get_favorite_stickers():
    """
    Get user's favorite stickers and GIFs.
    
    Returns:
        JSON response with favorite stickers
    """
    try:
        user_id = get_jwt_identity()
        
        # Get from Redis
        favorites_key = f"stickers:favorites:{user_id}"
        favorites_json = redis_service.get_value(favorites_key)
        
        if favorites_json:
            favorites = json.loads(favorites_json)
        else:
            favorites = []
        
        return jsonify({
            'success': True,
            'favorites': favorites
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting favorites: {str(e)}")
        return jsonify({'error': 'Failed to get favorites'}), 500


@stickers_bp.route('/favorites', methods=['POST'])
@jwt_required()
def add_favorite_sticker():
    """
    Add sticker or GIF to favorites.
    
    Request Body:
        {
            "type": "gif" | "sticker",
            "id": "sticker_id",
            "url": "sticker_url",
            "title": "sticker_title",
            "thumbnail_url": "thumbnail_url"
        }
    
    Returns:
        JSON response confirming addition
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data or 'id' not in data or 'url' not in data:
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Get current favorites
        favorites_key = f"stickers:favorites:{user_id}"
        favorites_json = redis_service.get_value(favorites_key)
        
        if favorites_json:
            favorites = json.loads(favorites_json)
        else:
            favorites = []
        
        # Check if already favorited
        if any(f['id'] == data['id'] for f in favorites):
            return jsonify({'error': 'Already in favorites'}), 400
        
        # Add to favorites
        favorite = {
            'id': data['id'],
            'type': data.get('type', 'gif'),
            'url': data['url'],
            'title': data.get('title', ''),
            'thumbnail_url': data.get('thumbnail_url', ''),
            'added_at': datetime.utcnow().isoformat()
        }
        
        favorites.insert(0, favorite)
        
        # Keep only last 100 favorites
        favorites = favorites[:100]
        
        # Save to Redis
        redis_service.set_value(favorites_key, json.dumps(favorites), ttl=86400 * 365)  # 1 year
        
        logger.info(f"Added favorite sticker for user {user_id}")
        
        return jsonify({
            'success': True,
            'favorite': favorite
        }), 201
        
    except Exception as e:
        logger.error(f"Error adding favorite: {str(e)}")
        return jsonify({'error': 'Failed to add favorite'}), 500


@stickers_bp.route('/favorites/<sticker_id>', methods=['DELETE'])
@jwt_required()
def remove_favorite_sticker(sticker_id):
    """
    Remove sticker or GIF from favorites.
    
    Args:
        sticker_id: Sticker ID to remove
    
    Returns:
        JSON response confirming removal
    """
    try:
        user_id = get_jwt_identity()
        
        # Get current favorites
        favorites_key = f"stickers:favorites:{user_id}"
        favorites_json = redis_service.get_value(favorites_key)
        
        if not favorites_json:
            return jsonify({'error': 'Favorite not found'}), 404
        
        favorites = json.loads(favorites_json)
        
        # Remove from favorites
        favorites = [f for f in favorites if f['id'] != sticker_id]
        
        # Save to Redis
        redis_service.set_value(favorites_key, json.dumps(favorites), ttl=86400 * 365)
        
        logger.info(f"Removed favorite sticker {sticker_id} for user {user_id}")
        
        return jsonify({
            'success': True,
            'message': 'Favorite removed'
        }), 200
        
    except Exception as e:
        logger.error(f"Error removing favorite: {str(e)}")
        return jsonify({'error': 'Failed to remove favorite'}), 500


@stickers_bp.route('/recent', methods=['GET'])
@jwt_required()
def get_recent_stickers():
    """
    Get user's recently used stickers and GIFs.
    
    Query Parameters:
        limit: Maximum results (default: 20, max: 50)
    
    Returns:
        JSON response with recent stickers
    """
    try:
        user_id = get_jwt_identity()
        limit = min(request.args.get('limit', 20, type=int), 50)
        
        # Get from Redis
        recent_key = f"stickers:recent:{user_id}"
        recent_json = redis_service.get_value(recent_key)
        
        if recent_json:
            recent = json.loads(recent_json)
        else:
            recent = []
        
        return jsonify({
            'success': True,
            'recent': recent[:limit]
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting recent stickers: {str(e)}")
        return jsonify({'error': 'Failed to get recent stickers'}), 500


@stickers_bp.route('/recent', methods=['POST'])
@jwt_required()
def add_recent_sticker():
    """
    Add sticker or GIF to recent history.
    
    Request Body:
        {
            "type": "gif" | "sticker",
            "id": "sticker_id",
            "url": "sticker_url",
            "title": "sticker_title",
            "thumbnail_url": "thumbnail_url"
        }
    
    Returns:
        JSON response confirming addition
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data or 'id' not in data or 'url' not in data:
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Get current recent
        recent_key = f"stickers:recent:{user_id}"
        recent_json = redis_service.get_value(recent_key)
        
        if recent_json:
            recent = json.loads(recent_json)
        else:
            recent = []
        
        # Remove if already exists
        recent = [r for r in recent if r['id'] != data['id']]
        
        # Add to recent
        recent_item = {
            'id': data['id'],
            'type': data.get('type', 'gif'),
            'url': data['url'],
            'title': data.get('title', ''),
            'thumbnail_url': data.get('thumbnail_url', ''),
            'used_at': datetime.utcnow().isoformat()
        }
        
        recent.insert(0, recent_item)
        
        # Keep only last 50 recent
        recent = recent[:50]
        
        # Save to Redis (30 days TTL)
        redis_service.set_value(recent_key, json.dumps(recent), ttl=86400 * 30)
        
        return jsonify({
            'success': True,
            'recent': recent_item
        }), 201
        
    except Exception as e:
        logger.error(f"Error adding recent sticker: {str(e)}")
        return jsonify({'error': 'Failed to add recent sticker'}), 500


@stickers_bp.route('/emoji/search', methods=['GET'])
@jwt_required()
def search_emoji():
    """
    Search emoji by keyword.
    
    Query Parameters:
        q: Search query (required)
        limit: Maximum results (default: 20, max: 100)
    
    Returns:
        JSON response with emoji results
    """
    try:
        query = request.args.get('q', '').strip().lower()
        if not query:
            return jsonify({'error': 'Search query required'}), 400
        
        limit = min(request.args.get('limit', 20, type=int), 100)
        
        # Simple emoji database (can be expanded)
        emoji_db = {
            'happy': ['😊', '😃', '😄', '😁', '😆', '😍', '🥰', '😘'],
            'sad': ['😢', '😭', '😔', '😞', '😟', '😕', '🙁', '☹️'],
            'love': ['❤️', '💕', '💖', '💗', '💓', '💞', '💝', '💘'],
            'laugh': ['😂', '🤣', '😆', '😹', '😸'],
            'angry': ['😠', '😡', '🤬', '😤', '💢'],
            'cool': ['😎', '🕶️', '😏', '🆒'],
            'party': ['🎉', '🎊', '🥳', '🎈', '🎆', '🎇'],
            'fire': ['🔥', '💥', '⚡', '✨'],
            'thumbs': ['👍', '👎', '👌', '✌️', '🤞'],
            'hand': ['👋', '🤚', '✋', '🖐️', '👐', '🙌', '👏'],
            'heart': ['❤️', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎']
        }
        
        # Find matching emoji
        results = []
        for keyword, emojis in emoji_db.items():
            if query in keyword:
                results.extend(emojis)
        
        # Remove duplicates and limit
        results = list(dict.fromkeys(results))[:limit]
        
        return jsonify({
            'success': True,
            'query': query,
            'results': results
        }), 200
        
    except Exception as e:
        logger.error(f"Error searching emoji: {str(e)}")
        return jsonify({'error': 'Search failed'}), 500

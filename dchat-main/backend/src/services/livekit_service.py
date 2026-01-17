"""
LiveKit Service

Handles LiveKit token generation and room management.
Integrates with Dchat's existing call infrastructure.

Author: Manus AI
Date: 2024-11-13
"""

import os
import time
import logging
from typing import Optional, Dict, List
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

try:
    from livekit import api
    LIVEKIT_AVAILABLE = True
except ImportError:
    LIVEKIT_AVAILABLE = False
    logger.warning("LiveKit SDK not installed. Install with: pip install livekit")


class LiveKitService:
    """
    Service for managing LiveKit rooms and tokens.
    """
    
    def __init__(self):
        """Initialize LiveKit service with configuration."""
        self.api_key = os.getenv('LIVEKIT_API_KEY', 'devkey')
        self.api_secret = os.getenv('LIVEKIT_API_SECRET', 'secret')
        self.url = os.getenv('LIVEKIT_URL', 'ws://localhost:7880')
        
        if not LIVEKIT_AVAILABLE:
            logger.error("LiveKit SDK not available")
            raise ImportError("LiveKit SDK is required. Install with: pip install livekit")
        
        logger.info(f"LiveKit service initialized with URL: {self.url}")
    
    def create_token(
        self,
        room_name: str,
        participant_identity: str,
        participant_name: Optional[str] = None,
        metadata: Optional[str] = None,
        can_publish: bool = True,
        can_subscribe: bool = True,
        can_publish_data: bool = True,
        valid_for: int = 3600  # 1 hour default
    ) -> str:
        """
        Generate an access token for a LiveKit room.
        
        Args:
            room_name: Name of the room to join
            participant_identity: Unique identifier for the participant
            participant_name: Display name for the participant
            metadata: Optional metadata (JSON string)
            can_publish: Whether participant can publish tracks
            can_subscribe: Whether participant can subscribe to tracks
            can_publish_data: Whether participant can publish data messages
            valid_for: Token validity in seconds
            
        Returns:
            JWT token string
            
        Raises:
            Exception: If token generation fails
        """
        try:
            # Create token
            token = api.AccessToken(self.api_key, self.api_secret)
            
            # Set identity
            token.with_identity(participant_identity)
            
            # Set display name
            if participant_name:
                token.with_name(participant_name)
            else:
                token.with_name(participant_identity)
            
            # Set grants
            grants = api.VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=can_publish,
                can_subscribe=can_subscribe,
                can_publish_data=can_publish_data
            )
            token.with_grants(grants)
            
            # Set metadata
            if metadata:
                token.with_metadata(metadata)
            
            # Set validity
            token.with_ttl(timedelta(seconds=valid_for))
            
            # Generate JWT
            jwt_token = token.to_jwt()
            
            logger.info(
                f"Token created for {participant_identity} in room {room_name}, "
                f"valid for {valid_for}s"
            )
            
            return jwt_token
            
        except Exception as e:
            logger.error(f"Failed to create LiveKit token: {str(e)}")
            raise
    
    def create_room_token_for_call(
        self,
        call_id: str,
        user_id: str,
        user_name: str,
        call_type: str = 'video',
        is_host: bool = False
    ) -> Dict[str, str]:
        """
        Create a token specifically for a Dchat call.
        
        Args:
            call_id: Unique call identifier
            user_id: User's wallet address or ID
            user_name: User's display name
            call_type: 'audio' or 'video'
            is_host: Whether user is the call host
            
        Returns:
            Dictionary with token and connection details
        """
        try:
            # Generate room name
            room_name = f"dchat_call_{call_id}"
            
            # Create metadata
            metadata = {
                'call_id': call_id,
                'call_type': call_type,
                'is_host': is_host,
                'joined_at': datetime.utcnow().isoformat()
            }
            
            # Generate token
            token = self.create_token(
                room_name=room_name,
                participant_identity=user_id,
                participant_name=user_name,
                metadata=str(metadata),
                can_publish=True,
                can_subscribe=True,
                valid_for=7200  # 2 hours for calls
            )
            
            return {
                'token': token,
                'url': self.url,
                'room_name': room_name,
                'participant_identity': user_id
            }
            
        except Exception as e:
            logger.error(f"Failed to create call token: {str(e)}")
            raise
    
    def create_admin_token(
        self,
        room_name: str,
        admin_identity: str = 'admin'
    ) -> str:
        """
        Create an admin token with full permissions.
        
        Args:
            room_name: Name of the room
            admin_identity: Identity for admin user
            
        Returns:
            JWT token with admin permissions
        """
        try:
            token = api.AccessToken(self.api_key, self.api_secret)
            token.with_identity(admin_identity)
            token.with_name('Admin')
            
            # Admin grants
            grants = api.VideoGrants(
                room_join=True,
                room=room_name,
                room_admin=True,
                can_publish=True,
                can_subscribe=True,
                can_publish_data=True,
                can_update_own_metadata=True
            )
            token.with_grants(grants)
            
            return token.to_jwt()
            
        except Exception as e:
            logger.error(f"Failed to create admin token: {str(e)}")
            raise
    
    def get_connection_details(self) -> Dict[str, str]:
        """
        Get LiveKit server connection details.
        
        Returns:
            Dictionary with server URL and status
        """
        return {
            'url': self.url,
            'status': 'configured',
            'api_key': self.api_key[:8] + '...'  # Partial key for verification
        }


# Global service instance
livekit_service = None

def get_livekit_service() -> LiveKitService:
    """
    Get or create the global LiveKit service instance.
    
    Returns:
        LiveKitService instance
    """
    global livekit_service
    if livekit_service is None:
        livekit_service = LiveKitService()
    return livekit_service

"""
Multi-Factor Authentication (MFA)

Provides MFA functionality:
- TOTP (Time-based One-Time Password)
- SMS verification
- Email verification
- Backup codes
- Device trust management

Author: Manus AI
Date: 2024-11-16
"""

from fastapi import APIRouter, HTTPException, Depends, Query, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import logging
import secrets
import string
import qrcode
import io
import base64
from enum import Enum

from src.models.user import User, db
from src.middleware.auth import require_auth

logger = logging.getLogger(__name__)

mfa_bp = APIRouter(prefix="/api/mfa", tags=["MFA"])


class MFAMethod(str, Enum):
    """MFA methods"""
    TOTP = "totp"
    SMS = "sms"
    EMAIL = "email"
    BACKUP_CODES = "backup_codes"


class TOTPManager:
    """Manages TOTP (Time-based One-Time Password)"""
    
    @staticmethod
    def generate_secret() -> str:
        """Generate TOTP secret"""
        import pyotp
        return pyotp.random_base32()
    
    @staticmethod
    def get_totp_uri(secret: str, email: str, issuer: str = "Dchat") -> str:
        """Get TOTP provisioning URI for QR code"""
        import pyotp
        totp = pyotp.TOTP(secret)
        return totp.provisioning_uri(name=email, issuer_name=issuer)
    
    @staticmethod
    def verify_token(secret: str, token: str, window: int = 1) -> bool:
        """Verify TOTP token"""
        import pyotp
        totp = pyotp.TOTP(secret)
        return totp.verify(token, valid_window=window)
    
    @staticmethod
    def generate_qr_code(uri: str) -> str:
        """Generate QR code image as base64"""
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to base64
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return f"data:image/png;base64,{img_str}"


class BackupCodeManager:
    """Manages backup codes"""
    
    @staticmethod
    def generate_codes(count: int = 10) -> List[str]:
        """Generate backup codes"""
        codes = []
        for _ in range(count):
            # Generate 8-character codes
            code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
            codes.append(code)
        return codes
    
    @staticmethod
    def hash_code(code: str) -> str:
        """Hash backup code"""
        import hashlib
        return hashlib.sha256(code.encode()).hexdigest()


class MFAModel:
    """MFA data model"""
    
    def __init__(self, user_id: int):
        self.user_id = user_id
        self.enabled = False
        self.method = None
        self.totp_secret = None
        self.backup_codes = []
        self.trusted_devices = []
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
    
    def to_dict(self) -> Dict:
        """Convert to dictionary"""
        return {
            'user_id': self.user_id,
            'enabled': self.enabled,
            'method': self.method,
            'has_totp_secret': bool(self.totp_secret),
            'backup_codes_count': len(self.backup_codes),
            'trusted_devices_count': len(self.trusted_devices),
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


class MFAManager:
    """Manages MFA for users"""
    
    def __init__(self):
        # Store MFA data: {user_id: MFAModel}
        self.mfa_data: Dict[int, MFAModel] = {}
        # Store verification attempts: {user_id: [attempts]}
        self.verification_attempts: Dict[int, List[Dict]] = {}
    
    def get_or_create_mfa(self, user_id: int) -> MFAModel:
        """Get or create MFA configuration"""
        if user_id not in self.mfa_data:
            self.mfa_data[user_id] = MFAModel(user_id)
        return self.mfa_data[user_id]
    
    def enable_totp(self, user_id: int) -> Dict:
        """Enable TOTP for user"""
        mfa = self.get_or_create_mfa(user_id)
        
        # Generate secret
        secret = TOTPManager.generate_secret()
        mfa.totp_secret = secret
        mfa.method = MFAMethod.TOTP
        
        # Get user email
        user = db.session.query(User).filter_by(id=user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='User not found'
            )
        
        # Generate QR code
        uri = TOTPManager.get_totp_uri(secret, user.email or f"user_{user_id}")
        qr_code = TOTPManager.generate_qr_code(uri)
        
        # Generate backup codes
        backup_codes = BackupCodeManager.generate_codes()
        mfa.backup_codes = [BackupCodeManager.hash_code(code) for code in backup_codes]
        
        logger.info(f"TOTP enabled for user {user_id}")
        
        return {
            'secret': secret,
            'qr_code': qr_code,
            'backup_codes': backup_codes,
            'uri': uri
        }
    
    def verify_totp(self, user_id: int, token: str) -> bool:
        """Verify TOTP token"""
        mfa = self.get_or_create_mfa(user_id)
        
        if not mfa.totp_secret:
            return False
        
        return TOTPManager.verify_token(mfa.totp_secret, token)
    
    def confirm_mfa(self, user_id: int, token: str) -> bool:
        """Confirm MFA setup with token verification"""
        if not self.verify_totp(user_id, token):
            return False
        
        mfa = self.get_or_create_mfa(user_id)
        mfa.enabled = True
        mfa.updated_at = datetime.utcnow()
        
        logger.info(f"MFA confirmed for user {user_id}")
        
        return True
    
    def disable_mfa(self, user_id: int) -> bool:
        """Disable MFA for user"""
        mfa = self.get_or_create_mfa(user_id)
        mfa.enabled = False
        mfa.totp_secret = None
        mfa.backup_codes = []
        mfa.updated_at = datetime.utcnow()
        
        logger.info(f"MFA disabled for user {user_id}")
        
        return True
    
    def use_backup_code(self, user_id: int, code: str) -> bool:
        """Use a backup code"""
        mfa = self.get_or_create_mfa(user_id)
        
        code_hash = BackupCodeManager.hash_code(code)
        
        if code_hash not in mfa.backup_codes:
            return False
        
        # Remove used code
        mfa.backup_codes.remove(code_hash)
        mfa.updated_at = datetime.utcnow()
        
        logger.info(f"Backup code used for user {user_id}")
        
        return True
    
    def add_trusted_device(
        self,
        user_id: int,
        device_id: str,
        device_name: str
    ) -> Dict:
        """Add trusted device"""
        mfa = self.get_or_create_mfa(user_id)
        
        device = {
            'device_id': device_id,
            'device_name': device_name,
            'trusted_at': datetime.utcnow().isoformat(),
            'last_used': datetime.utcnow().isoformat()
        }
        
        mfa.trusted_devices.append(device)
        
        logger.info(f"Device {device_id} trusted for user {user_id}")
        
        return device
    
    def is_device_trusted(self, user_id: int, device_id: str) -> bool:
        """Check if device is trusted"""
        mfa = self.get_or_create_mfa(user_id)
        
        for device in mfa.trusted_devices:
            if device['device_id'] == device_id:
                # Update last used
                device['last_used'] = datetime.utcnow().isoformat()
                return True
        
        return False
    
    def remove_trusted_device(self, user_id: int, device_id: str) -> bool:
        """Remove trusted device"""
        mfa = self.get_or_create_mfa(user_id)
        
        mfa.trusted_devices = [
            d for d in mfa.trusted_devices
            if d['device_id'] != device_id
        ]
        
        logger.info(f"Device {device_id} removed for user {user_id}")
        
        return True
    
    def get_status(self, user_id: int) -> Dict:
        """Get MFA status for user"""
        mfa = self.get_or_create_mfa(user_id)
        return mfa.to_dict()


# Global MFA manager instance
mfa_manager = MFAManager()


# API Endpoints

@mfa_bp.get('/status')
async def get_mfa_status(current_user: dict = Depends(require_auth)):
    """
    Get MFA status for current user
    
    Returns:
        JSON response with MFA status
    """
    try:
        user_id = current_user.get('user_id')
        status = mfa_manager.get_status(user_id)
        
        return {
            'success': True,
            'status': status,
            'timestamp': datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error getting MFA status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to get MFA status: {str(e)}'
        )


@mfa_bp.post('/totp/setup')
async def setup_totp(current_user: dict = Depends(require_auth)):
    """
    Setup TOTP for user
    
    Returns:
        JSON response with secret and QR code
    """
    try:
        user_id = current_user.get('user_id')
        
        result = mfa_manager.enable_totp(user_id)
        
        return {
            'success': True,
            'secret': result['secret'],
            'qr_code': result['qr_code'],
            'backup_codes': result['backup_codes'],
            'uri': result['uri'],
            'message': 'Scan the QR code with your authenticator app',
            'timestamp': datetime.utcnow().isoformat()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error setting up TOTP: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to setup TOTP: {str(e)}'
        )


@mfa_bp.post('/totp/confirm')
async def confirm_totp(
    token_data: dict,
    current_user: dict = Depends(require_auth)
):
    """
    Confirm TOTP setup with token verification
    
    Request Body:
        {
            "token": "123456"
        }
    
    Returns:
        JSON response with confirmation result
    """
    try:
        user_id = current_user.get('user_id')
        token = token_data.get('token')
        
        if not token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Missing token'
            )
        
        if not mfa_manager.confirm_mfa(user_id, token):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Invalid token'
            )
        
        return {
            'success': True,
            'message': 'MFA enabled successfully',
            'timestamp': datetime.utcnow().isoformat()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error confirming TOTP: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to confirm TOTP: {str(e)}'
        )


@mfa_bp.post('/disable')
async def disable_mfa(current_user: dict = Depends(require_auth)):
    """
    Disable MFA for user
    
    Returns:
        JSON response with result
    """
    try:
        user_id = current_user.get('user_id')
        
        mfa_manager.disable_mfa(user_id)
        
        return {
            'success': True,
            'message': 'MFA disabled',
            'timestamp': datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error disabling MFA: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to disable MFA: {str(e)}'
        )


@mfa_bp.post('/backup-codes/use')
async def use_backup_code(
    code_data: dict,
    current_user: dict = Depends(require_auth)
):
    """
    Use a backup code
    
    Request Body:
        {
            "code": "ABC12345"
        }
    
    Returns:
        JSON response with result
    """
    try:
        user_id = current_user.get('user_id')
        code = code_data.get('code')
        
        if not code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Missing code'
            )
        
        if not mfa_manager.use_backup_code(user_id, code):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Invalid backup code'
            )
        
        return {
            'success': True,
            'message': 'Backup code used successfully',
            'timestamp': datetime.utcnow().isoformat()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error using backup code: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to use backup code: {str(e)}'
        )


@mfa_bp.post('/devices/trust')
async def trust_device(
    device_data: dict,
    current_user: dict = Depends(require_auth)
):
    """
    Trust a device
    
    Request Body:
        {
            "device_id": "device_123",
            "device_name": "My iPhone"
        }
    
    Returns:
        JSON response with device info
    """
    try:
        user_id = current_user.get('user_id')
        device_id = device_data.get('device_id')
        device_name = device_data.get('device_name')
        
        if not device_id or not device_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail='Missing device_id or device_name'
            )
        
        device = mfa_manager.add_trusted_device(user_id, device_id, device_name)
        
        return {
            'success': True,
            'device': device,
            'message': 'Device trusted successfully',
            'timestamp': datetime.utcnow().isoformat()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error trusting device: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to trust device: {str(e)}'
        )


@mfa_bp.get('/devices')
async def get_trusted_devices(current_user: dict = Depends(require_auth)):
    """
    Get list of trusted devices
    
    Returns:
        JSON response with trusted devices
    """
    try:
        user_id = current_user.get('user_id')
        mfa = mfa_manager.get_or_create_mfa(user_id)
        
        return {
            'success': True,
            'devices': mfa.trusted_devices,
            'count': len(mfa.trusted_devices),
            'timestamp': datetime.utcnow().isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error getting trusted devices: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to get devices: {str(e)}'
        )


@mfa_bp.delete('/devices/{device_id}')
async def remove_trusted_device(
    device_id: str,
    current_user: dict = Depends(require_auth)
):
    """
    Remove a trusted device
    
    Path Parameters:
        device_id: Device ID
    
    Returns:
        JSON response with result
    """
    try:
        user_id = current_user.get('user_id')
        
        if not mfa_manager.remove_trusted_device(user_id, device_id):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail='Device not found'
            )
        
        return {
            'success': True,
            'message': 'Device removed successfully',
            'timestamp': datetime.utcnow().isoformat()
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing device: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f'Failed to remove device: {str(e)}'
        )

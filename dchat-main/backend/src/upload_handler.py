"""
File Upload Handler
Handles file uploads to S3, IPFS, or local storage
"""

import os
import uuid
import hashlib
import mimetypes
from datetime import datetime
from pathlib import Path
import boto3
from botocore.exceptions import ClientError
import ipfshttpclient

class FileUploadHandler:
    """Handle file uploads to various storage backends"""
    
    def __init__(self):
        self.upload_dir = Path(__file__).parent.parent / 'uploads'
        self.upload_dir.mkdir(exist_ok=True)
        
        # S3 configuration
        self.s3_enabled = os.getenv('S3_ENABLED', 'false').lower() == 'true'
        self.s3_bucket = os.getenv('S3_BUCKET', 'dchat-uploads')
        self.s3_region = os.getenv('AWS_REGION', 'us-east-1')
        
        # IPFS configuration
        self.ipfs_enabled = os.getenv('IPFS_ENABLED', 'false').lower() == 'true'
        self.ipfs_host = os.getenv('IPFS_HOST', '/ip4/127.0.0.1/tcp/5001')
        
        # File constraints
        self.max_file_size = int(os.getenv('MAX_FILE_SIZE', 100 * 1024 * 1024))  # 100MB
        self.allowed_extensions = {
            'image': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
            'document': ['.pdf', '.doc', '.docx', '.txt'],
            'video': ['.mp4', '.webm', '.ogg'],
            'audio': ['.mp3', '.wav', '.ogg']
        }
        
        # Initialize clients
        self._init_s3_client()
        self._init_ipfs_client()
    
    def _init_s3_client(self):
        """Initialize S3 client"""
        if self.s3_enabled:
            try:
                self.s3_client = boto3.client(
                    's3',
                    region_name=self.s3_region,
                    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
                    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
                )
                print(f"✓ S3 client initialized (bucket: {self.s3_bucket})")
            except Exception as e:
                print(f"✗ Failed to initialize S3 client: {e}")
                self.s3_enabled = False
        else:
            self.s3_client = None
    
    def _init_ipfs_client(self):
        """Initialize IPFS client"""
        if self.ipfs_enabled:
            try:
                self.ipfs_client = ipfshttpclient.connect(self.ipfs_host)
                print(f"✓ IPFS client initialized (host: {self.ipfs_host})")
            except Exception as e:
                print(f"✗ Failed to initialize IPFS client: {e}")
                self.ipfs_enabled = False
        else:
            self.ipfs_client = None
    
    def validate_file(self, filename, file_size, category='image'):
        """Validate file before upload"""
        errors = []
        
        # Check file size
        if file_size > self.max_file_size:
            errors.append(f"File size exceeds {self.max_file_size / (1024 * 1024)}MB limit")
        
        # Check file extension
        ext = Path(filename).suffix.lower()
        allowed = self.allowed_extensions.get(category, self.allowed_extensions['image'])
        if ext not in allowed:
            errors.append(f"File type {ext} not allowed. Allowed: {', '.join(allowed)}")
        
        return {
            'valid': len(errors) == 0,
            'errors': errors
        }
    
    def generate_filename(self, original_filename):
        """Generate unique filename"""
        ext = Path(original_filename).suffix
        unique_id = uuid.uuid4().hex
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        return f"{timestamp}_{unique_id}{ext}"
    
    def calculate_file_hash(self, file_content):
        """Calculate SHA256 hash of file"""
        return hashlib.sha256(file_content).hexdigest()
    
    async def upload_to_local(self, file_content, filename):
        """Upload file to local storage"""
        try:
            file_path = self.upload_dir / filename
            
            with open(file_path, 'wb') as f:
                f.write(file_content)
            
            # Generate URL (in production, use actual domain)
            url = f"/uploads/{filename}"
            
            return {
                'success': True,
                'url': url,
                'filename': filename,
                'size': len(file_content),
                'storage': 'local',
                'hash': self.calculate_file_hash(file_content)
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    async def upload_to_s3(self, file_content, filename, content_type=None):
        """Upload file to AWS S3"""
        if not self.s3_enabled:
            return {'success': False, 'error': 'S3 not enabled'}
        
        try:
            # Detect content type if not provided
            if not content_type:
                content_type, _ = mimetypes.guess_type(filename)
                content_type = content_type or 'application/octet-stream'
            
            # Upload to S3
            self.s3_client.put_object(
                Bucket=self.s3_bucket,
                Key=filename,
                Body=file_content,
                ContentType=content_type,
                ACL='public-read'  # Make file publicly accessible
            )
            
            # Generate URL
            url = f"https://{self.s3_bucket}.s3.{self.s3_region}.amazonaws.com/{filename}"
            
            return {
                'success': True,
                'url': url,
                'filename': filename,
                'size': len(file_content),
                'storage': 's3',
                'hash': self.calculate_file_hash(file_content)
            }
        except ClientError as e:
            return {
                'success': False,
                'error': f"S3 upload failed: {str(e)}"
            }
    
    async def upload_to_ipfs(self, file_content, filename):
        """Upload file to IPFS"""
        if not self.ipfs_enabled:
            return {'success': False, 'error': 'IPFS not enabled'}
        
        try:
            # Add file to IPFS
            result = self.ipfs_client.add_bytes(file_content)
            ipfs_hash = result
            
            # Generate URL
            url = f"https://ipfs.io/ipfs/{ipfs_hash}"
            
            return {
                'success': True,
                'url': url,
                'filename': filename,
                'size': len(file_content),
                'storage': 'ipfs',
                'ipfs_hash': ipfs_hash,
                'hash': self.calculate_file_hash(file_content)
            }
        except Exception as e:
            return {
                'success': False,
                'error': f"IPFS upload failed: {str(e)}"
            }
    
    async def upload_file(self, file_content, original_filename, category='image', storage='auto'):
        """
        Upload file to specified storage backend
        
        Args:
            file_content: Binary file content
            original_filename: Original filename
            category: File category (image, document, video, audio)
            storage: Storage backend ('auto', 's3', 'ipfs', 'local')
        
        Returns:
            dict: Upload result with URL and metadata
        """
        # Validate file
        validation = self.validate_file(original_filename, len(file_content), category)
        if not validation['valid']:
            return {
                'success': False,
                'errors': validation['errors']
            }
        
        # Generate unique filename
        filename = self.generate_filename(original_filename)
        
        # Determine storage backend
        if storage == 'auto':
            if self.s3_enabled:
                storage = 's3'
            elif self.ipfs_enabled:
                storage = 'ipfs'
            else:
                storage = 'local'
        
        # Upload to selected backend
        if storage == 's3':
            result = await self.upload_to_s3(file_content, filename)
        elif storage == 'ipfs':
            result = await self.upload_to_ipfs(file_content, filename)
        else:
            result = await self.upload_to_local(file_content, filename)
        
        # Add metadata
        if result.get('success'):
            result['original_filename'] = original_filename
            result['category'] = category
            result['uploaded_at'] = datetime.now().isoformat()
        
        return result
    
    async def delete_file(self, filename, storage='local'):
        """Delete uploaded file"""
        try:
            if storage == 's3' and self.s3_enabled:
                self.s3_client.delete_object(
                    Bucket=self.s3_bucket,
                    Key=filename
                )
            elif storage == 'ipfs':
                # IPFS files are immutable, can't delete
                pass
            else:
                file_path = self.upload_dir / filename
                if file_path.exists():
                    file_path.unlink()
            
            return {'success': True}
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

# Export singleton instance
upload_handler = FileUploadHandler()

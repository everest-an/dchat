from flask import Blueprint, request, jsonify
import requests
import os
import jwt

files_bp = Blueprint('files', __name__)

PINATA_API_KEY = os.environ.get('PINATA_API_KEY')
PINATA_SECRET_KEY = os.environ.get('PINATA_SECRET_API_KEY')
SECRET_KEY = os.environ.get('SECRET_KEY', 'dchat-secret-key')

def verify_token_from_request():
    """从请求中验证 JWT token"""
    token = request.headers.get('Authorization')
    if not token:
        return None, 'No token provided'
    
    if token.startswith('Bearer '):
        token = token[7:]
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload, None
    except jwt.ExpiredSignatureError:
        return None, 'Token expired'
    except jwt.InvalidTokenError:
        return None, 'Invalid token'

@files_bp.route('/upload', methods=['POST'])
def upload_file():
    """上传文件到 IPFS (Pinata)"""
    try:
        # 验证用户身份
        payload, error = verify_token_from_request()
        if error:
            return jsonify({'success': False, 'error': error}), 401
        
        # 检查文件
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file provided'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'success': False, 'error': 'Empty filename'}), 400
        
        # 检查 Pinata 配置
        if not PINATA_API_KEY or not PINATA_SECRET_KEY:
            return jsonify({
                'success': False, 
                'error': 'Pinata API keys not configured'
            }), 500
        
        # 准备上传到 Pinata
        url = "https://api.pinata.cloud/pinning/pinFileToIPFS"
        headers = {
            'pinata_api_key': PINATA_API_KEY,
            'pinata_secret_api_key': PINATA_SECRET_KEY
        }
        
        # 准备文件和元数据
        files_data = {
            'file': (file.filename, file.stream, file.content_type)
        }
        
        # 添加元数据
        metadata = {
            'name': file.filename,
            'keyvalues': {
                'uploader': payload.get('wallet_address'),
                'timestamp': str(int(os.time.time()) if hasattr(os, 'time') else 0)
            }
        }
        
        data = {
            'pinataMetadata': str(metadata),
            'pinataOptions': '{"cidVersion": 1}'
        }
        
        # 上传到 Pinata
        response = requests.post(
            url, 
            files=files_data, 
            headers=headers,
            data=data,
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            ipfs_hash = result['IpfsHash']
            
            return jsonify({
                'success': True,
                'ipfsHash': ipfs_hash,
                'url': f'https://gateway.pinata.cloud/ipfs/{ipfs_hash}',
                'filename': file.filename,
                'size': result.get('PinSize', 0)
            })
        else:
            return jsonify({
                'success': False,
                'error': f'Pinata upload failed: {response.text}'
            }), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@files_bp.route('/download/<ipfs_hash>', methods=['GET'])
def download_file(ipfs_hash):
    """获取 IPFS 文件的下载链接"""
    try:
        # 验证用户身份
        payload, error = verify_token_from_request()
        if error:
            return jsonify({'success': False, 'error': error}), 401
        
        # 返回 Pinata Gateway URL
        url = f'https://gateway.pinata.cloud/ipfs/{ipfs_hash}'
        
        return jsonify({
            'success': True,
            'url': url,
            'ipfsHash': ipfs_hash
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@files_bp.route('/metadata/<ipfs_hash>', methods=['GET'])
def get_file_metadata(ipfs_hash):
    """获取文件元数据"""
    try:
        # 验证用户身份
        payload, error = verify_token_from_request()
        if error:
            return jsonify({'success': False, 'error': error}), 401
        
        # 检查 Pinata 配置
        if not PINATA_API_KEY or not PINATA_SECRET_KEY:
            return jsonify({
                'success': False, 
                'error': 'Pinata API keys not configured'
            }), 500
        
        # 查询 Pinata 元数据
        url = f"https://api.pinata.cloud/data/pinList?hashContains={ipfs_hash}"
        headers = {
            'pinata_api_key': PINATA_API_KEY,
            'pinata_secret_api_key': PINATA_SECRET_KEY
        }
        
        response = requests.get(url, headers=headers, timeout=30)
        
        if response.status_code == 200:
            result = response.json()
            if result.get('count', 0) > 0:
                pin_data = result['rows'][0]
                return jsonify({
                    'success': True,
                    'metadata': {
                        'ipfsHash': pin_data.get('ipfs_pin_hash'),
                        'size': pin_data.get('size'),
                        'timestamp': pin_data.get('date_pinned'),
                        'name': pin_data.get('metadata', {}).get('name')
                    }
                })
            else:
                return jsonify({
                    'success': False,
                    'error': 'File not found'
                }), 404
        else:
            return jsonify({
                'success': False,
                'error': f'Failed to fetch metadata: {response.text}'
            }), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@files_bp.route('/unpin/<ipfs_hash>', methods=['DELETE'])
def unpin_file(ipfs_hash):
    """从 Pinata 删除文件"""
    try:
        # 验证用户身份
        payload, error = verify_token_from_request()
        if error:
            return jsonify({'success': False, 'error': error}), 401
        
        # 检查 Pinata 配置
        if not PINATA_API_KEY or not PINATA_SECRET_KEY:
            return jsonify({
                'success': False, 
                'error': 'Pinata API keys not configured'
            }), 500
        
        # 从 Pinata 删除
        url = f"https://api.pinata.cloud/pinning/unpin/{ipfs_hash}"
        headers = {
            'pinata_api_key': PINATA_API_KEY,
            'pinata_secret_api_key': PINATA_SECRET_KEY
        }
        
        response = requests.delete(url, headers=headers, timeout=30)
        
        if response.status_code == 200:
            return jsonify({
                'success': True,
                'message': 'File unpinned successfully'
            })
        else:
            return jsonify({
                'success': False,
                'error': f'Failed to unpin: {response.text}'
            }), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

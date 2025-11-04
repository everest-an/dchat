"""
Web3 Group Management API Routes
Integrates with GroupChatV2 smart contract for decentralized group management
"""

from flask import Blueprint, request, jsonify
from functools import wraps
import jwt
import os
from web3 import Web3
from datetime import datetime
import json

groups_web3_bp = Blueprint('groups_web3', __name__)

# Load environment variables
WEB3_PROVIDER_URL = os.getenv('WEB3_PROVIDER_URL', 'https://eth-sepolia.g.alchemy.com/v2/N-UzzxYZbLPikS4Fc6pqC')
CONTRACT_GROUP_CHAT = os.getenv('CONTRACT_GROUP_CHAT', '0x4f93AEaAE5981fd6C95cFA8096D31D3d92ae2F28')
JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key-change-in-production')

# Initialize Web3
w3 = Web3(Web3.HTTPProvider(WEB3_PROVIDER_URL))

# GroupChatV2 Contract ABI (simplified, key functions only)
GROUP_CHAT_ABI = json.loads('''[
    {
        "inputs": [
            {"internalType": "string", "name": "_groupName", "type": "string"},
            {"internalType": "string", "name": "_groupAvatar", "type": "string"},
            {"internalType": "string", "name": "_description", "type": "string"},
            {"internalType": "bool", "name": "_isPublic", "type": "bool"},
            {"internalType": "uint256", "name": "_maxMembers", "type": "uint256"}
        ],
        "name": "createGroup",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "string", "name": "_groupId", "type": "string"}],
        "name": "joinGroup",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "string", "name": "_groupId", "type": "string"},
            {"internalType": "address", "name": "_member", "type": "address"}
        ],
        "name": "inviteMember",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "string", "name": "_groupId", "type": "string"}],
        "name": "leaveGroup",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "string", "name": "_groupId", "type": "string"},
            {"internalType": "address", "name": "_member", "type": "address"}
        ],
        "name": "removeMember",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "string", "name": "_groupId", "type": "string"},
            {"internalType": "bool", "name": "_isPublic", "type": "bool"},
            {"internalType": "bool", "name": "_allowMemberInvite", "type": "bool"},
            {"internalType": "bool", "name": "_requireApproval", "type": "bool"},
            {"internalType": "uint256", "name": "_maxMembers", "type": "uint256"},
            {"internalType": "bool", "name": "_muteAll", "type": "bool"}
        ],
        "name": "updateGroupSettings",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "string", "name": "_groupId", "type": "string"}],
        "name": "getGroup",
        "outputs": [
            {
                "components": [
                    {"internalType": "string", "name": "groupId", "type": "string"},
                    {"internalType": "string", "name": "groupName", "type": "string"},
                    {"internalType": "string", "name": "groupAvatar", "type": "string"},
                    {"internalType": "string", "name": "description", "type": "string"},
                    {"internalType": "address", "name": "owner", "type": "address"},
                    {"internalType": "address[]", "name": "members", "type": "address[]"},
                    {"internalType": "address[]", "name": "admins", "type": "address[]"},
                    {"internalType": "uint256", "name": "createdAt", "type": "uint256"},
                    {"internalType": "uint256", "name": "memberCount", "type": "uint256"},
                    {"internalType": "bool", "name": "isActive", "type": "bool"}
                ],
                "internalType": "struct GroupChatV2.Group",
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "_user", "type": "address"}],
        "name": "getUserGroups",
        "outputs": [{"internalType": "string[]", "name": "", "type": "string[]"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "string", "name": "_groupId", "type": "string"}],
        "name": "getGroupMembers",
        "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}],
        "stateMutability": "view",
        "type": "function"
    }
]''')

# Initialize contract
group_chat_contract = w3.eth.contract(
    address=Web3.to_checksum_address(CONTRACT_GROUP_CHAT),
    abi=GROUP_CHAT_ABI
)


def require_auth(f):
    """JWT authentication decorator"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'No token provided'}), 401
        
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
            request.user_address = payload.get('address')
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        
        return f(*args, **kwargs)
    return decorated_function


@groups_web3_bp.route('/create', methods=['POST'])
@require_auth
def create_group():
    """
    Create a new group on blockchain
    
    Request body:
    {
        "groupName": "My Group",
        "groupAvatar": "ipfs://...",
        "description": "Group description",
        "isPublic": true,
        "maxMembers": 100,
        "privateKey": "0x..." // User's private key for signing transaction
    }
    """
    try:
        data = request.json
        group_name = data.get('groupName')
        group_avatar = data.get('groupAvatar', '')
        description = data.get('description', '')
        is_public = data.get('isPublic', True)
        max_members = data.get('maxMembers', 100)
        private_key = data.get('privateKey')
        
        if not group_name:
            return jsonify({'success': False, 'error': 'Group name is required'}), 400
        
        if not private_key:
            return jsonify({'success': False, 'error': 'Private key is required for transaction signing'}), 400
        
        # Get user account from private key
        account = w3.eth.account.from_key(private_key)
        
        # Verify the account matches the authenticated user
        if account.address.lower() != request.user_address.lower():
            return jsonify({'success': False, 'error': 'Private key does not match authenticated user'}), 403
        
        # Build transaction
        nonce = w3.eth.get_transaction_count(account.address)
        
        transaction = group_chat_contract.functions.createGroup(
            group_name,
            group_avatar,
            description,
            is_public,
            max_members
        ).build_transaction({
            'from': account.address,
            'nonce': nonce,
            'gas': 500000,
            'gasPrice': w3.eth.gas_price
        })
        
        # Sign and send transaction
        signed_txn = w3.eth.account.sign_transaction(transaction, private_key)
        tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
        
        # Wait for transaction receipt
        tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        if tx_receipt['status'] == 1:
            return jsonify({
                'success': True,
                'transactionHash': tx_hash.hex(),
                'message': 'Group created successfully',
                'blockNumber': tx_receipt['blockNumber']
            }), 201
        else:
            return jsonify({'success': False, 'error': 'Transaction failed'}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@groups_web3_bp.route('/<group_id>', methods=['GET'])
@require_auth
def get_group(group_id):
    """Get group information from blockchain"""
    try:
        group = group_chat_contract.functions.getGroup(group_id).call()
        
        return jsonify({
            'success': True,
            'group': {
                'groupId': group[0],
                'groupName': group[1],
                'groupAvatar': group[2],
                'description': group[3],
                'owner': group[4],
                'members': group[5],
                'admins': group[6],
                'createdAt': group[7],
                'memberCount': group[8],
                'isActive': group[9]
            }
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@groups_web3_bp.route('/<group_id>/join', methods=['POST'])
@require_auth
def join_group(group_id):
    """Join a group"""
    try:
        data = request.json
        private_key = data.get('privateKey')
        
        if not private_key:
            return jsonify({'success': False, 'error': 'Private key is required'}), 400
        
        account = w3.eth.account.from_key(private_key)
        
        if account.address.lower() != request.user_address.lower():
            return jsonify({'success': False, 'error': 'Private key does not match authenticated user'}), 403
        
        nonce = w3.eth.get_transaction_count(account.address)
        
        transaction = group_chat_contract.functions.joinGroup(
            group_id
        ).build_transaction({
            'from': account.address,
            'nonce': nonce,
            'gas': 300000,
            'gasPrice': w3.eth.gas_price
        })
        
        signed_txn = w3.eth.account.sign_transaction(transaction, private_key)
        tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
        tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        if tx_receipt['status'] == 1:
            return jsonify({
                'success': True,
                'transactionHash': tx_hash.hex(),
                'message': 'Joined group successfully'
            }), 200
        else:
            return jsonify({'success': False, 'error': 'Transaction failed'}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@groups_web3_bp.route('/<group_id>/invite', methods=['POST'])
@require_auth
def invite_member(group_id):
    """Invite a member to the group"""
    try:
        data = request.json
        member_address = data.get('memberAddress')
        private_key = data.get('privateKey')
        
        if not member_address or not private_key:
            return jsonify({'success': False, 'error': 'Member address and private key are required'}), 400
        
        account = w3.eth.account.from_key(private_key)
        
        if account.address.lower() != request.user_address.lower():
            return jsonify({'success': False, 'error': 'Private key does not match authenticated user'}), 403
        
        nonce = w3.eth.get_transaction_count(account.address)
        
        transaction = group_chat_contract.functions.inviteMember(
            group_id,
            Web3.to_checksum_address(member_address)
        ).build_transaction({
            'from': account.address,
            'nonce': nonce,
            'gas': 300000,
            'gasPrice': w3.eth.gas_price
        })
        
        signed_txn = w3.eth.account.sign_transaction(transaction, private_key)
        tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
        tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        if tx_receipt['status'] == 1:
            return jsonify({
                'success': True,
                'transactionHash': tx_hash.hex(),
                'message': 'Member invited successfully'
            }), 200
        else:
            return jsonify({'success': False, 'error': 'Transaction failed'}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@groups_web3_bp.route('/<group_id>/leave', methods=['POST'])
@require_auth
def leave_group(group_id):
    """Leave a group"""
    try:
        data = request.json
        private_key = data.get('privateKey')
        
        if not private_key:
            return jsonify({'success': False, 'error': 'Private key is required'}), 400
        
        account = w3.eth.account.from_key(private_key)
        
        if account.address.lower() != request.user_address.lower():
            return jsonify({'success': False, 'error': 'Private key does not match authenticated user'}), 403
        
        nonce = w3.eth.get_transaction_count(account.address)
        
        transaction = group_chat_contract.functions.leaveGroup(
            group_id
        ).build_transaction({
            'from': account.address,
            'nonce': nonce,
            'gas': 300000,
            'gasPrice': w3.eth.gas_price
        })
        
        signed_txn = w3.eth.account.sign_transaction(transaction, private_key)
        tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
        tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        if tx_receipt['status'] == 1:
            return jsonify({
                'success': True,
                'transactionHash': tx_hash.hex(),
                'message': 'Left group successfully'
            }), 200
        else:
            return jsonify({'success': False, 'error': 'Transaction failed'}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@groups_web3_bp.route('/<group_id>/members/<member_address>', methods=['DELETE'])
@require_auth
def remove_member(group_id, member_address):
    """Remove a member from the group (admin only)"""
    try:
        data = request.json
        private_key = data.get('privateKey')
        
        if not private_key:
            return jsonify({'success': False, 'error': 'Private key is required'}), 400
        
        account = w3.eth.account.from_key(private_key)
        
        if account.address.lower() != request.user_address.lower():
            return jsonify({'success': False, 'error': 'Private key does not match authenticated user'}), 403
        
        nonce = w3.eth.get_transaction_count(account.address)
        
        transaction = group_chat_contract.functions.removeMember(
            group_id,
            Web3.to_checksum_address(member_address)
        ).build_transaction({
            'from': account.address,
            'nonce': nonce,
            'gas': 300000,
            'gasPrice': w3.eth.gas_price
        })
        
        signed_txn = w3.eth.account.sign_transaction(transaction, private_key)
        tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
        tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        if tx_receipt['status'] == 1:
            return jsonify({
                'success': True,
                'transactionHash': tx_hash.hex(),
                'message': 'Member removed successfully'
            }), 200
        else:
            return jsonify({'success': False, 'error': 'Transaction failed'}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@groups_web3_bp.route('/<group_id>/settings', methods=['PUT'])
@require_auth
def update_group_settings(group_id):
    """Update group settings (owner only)"""
    try:
        data = request.json
        private_key = data.get('privateKey')
        is_public = data.get('isPublic', True)
        allow_member_invite = data.get('allowMemberInvite', True)
        require_approval = data.get('requireApproval', False)
        max_members = data.get('maxMembers', 100)
        mute_all = data.get('muteAll', False)
        
        if not private_key:
            return jsonify({'success': False, 'error': 'Private key is required'}), 400
        
        account = w3.eth.account.from_key(private_key)
        
        if account.address.lower() != request.user_address.lower():
            return jsonify({'success': False, 'error': 'Private key does not match authenticated user'}), 403
        
        nonce = w3.eth.get_transaction_count(account.address)
        
        transaction = group_chat_contract.functions.updateGroupSettings(
            group_id,
            is_public,
            allow_member_invite,
            require_approval,
            max_members,
            mute_all
        ).build_transaction({
            'from': account.address,
            'nonce': nonce,
            'gas': 300000,
            'gasPrice': w3.eth.gas_price
        })
        
        signed_txn = w3.eth.account.sign_transaction(transaction, private_key)
        tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
        tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        if tx_receipt['status'] == 1:
            return jsonify({
                'success': True,
                'transactionHash': tx_hash.hex(),
                'message': 'Group settings updated successfully'
            }), 200
        else:
            return jsonify({'success': False, 'error': 'Transaction failed'}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@groups_web3_bp.route('/user/<user_address>', methods=['GET'])
@require_auth
def get_user_groups(user_address):
    """Get all groups for a user from blockchain"""
    try:
        group_ids = group_chat_contract.functions.getUserGroups(
            Web3.to_checksum_address(user_address)
        ).call()
        
        return jsonify({
            'success': True,
            'userAddress': user_address,
            'groupIds': group_ids,
            'groupCount': len(group_ids)
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@groups_web3_bp.route('/<group_id>/members', methods=['GET'])
@require_auth
def get_group_members(group_id):
    """Get all members of a group from blockchain"""
    try:
        members = group_chat_contract.functions.getGroupMembers(group_id).call()
        
        return jsonify({
            'success': True,
            'groupId': group_id,
            'members': members,
            'memberCount': len(members)
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@groups_web3_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        # Check Web3 connection
        is_connected = w3.is_connected()
        block_number = w3.eth.block_number if is_connected else None
        
        return jsonify({
            'status': 'healthy' if is_connected else 'unhealthy',
            'service': 'groups-web3-api',
            'contract': CONTRACT_GROUP_CHAT,
            'network': 'sepolia',
            'connected': is_connected,
            'blockNumber': block_number
        }), 200 if is_connected else 503
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 503

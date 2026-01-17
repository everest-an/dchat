"""
Web3 Payment API Routes
Integrates with GroupPayment and RedPacket smart contracts
"""

from flask import Blueprint, request, jsonify
from functools import wraps
import jwt
import os
from web3 import Web3
from datetime import datetime
import json

# Enhanced middleware for production
from ..middleware.auth import require_auth, optional_auth, require_role
from ..middleware.error_handler import handle_errors, validate_request_json, ValidationError



payments_web3_bp = Blueprint('payments_web3', __name__)

# Load environment variables
WEB3_PROVIDER_URL = os.getenv('WEB3_PROVIDER_URL', 'https://eth-sepolia.g.alchemy.com/v2/N-UzzxYZbLPikS4Fc6pqC')
CONTRACT_GROUP_PAYMENT = os.getenv('CONTRACT_GROUP_PAYMENT', '0x788Ba6e9B0EB746F58E4bab891B9c0add8359541')
CONTRACT_RED_PACKET = os.getenv('CONTRACT_RED_PACKET', '0x0354fCfB243639d37F84E8d00031422655219f75')
JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key-change-in-production')

# Initialize Web3
w3 = Web3(Web3.HTTPProvider(WEB3_PROVIDER_URL))

# GroupPayment Contract ABI
GROUP_PAYMENT_ABI = json.loads('''[
    {
        "inputs": [
            {"internalType": "string", "name": "_groupId", "type": "string"},
            {"internalType": "string", "name": "_title", "type": "string"},
            {"internalType": "string", "name": "_description", "type": "string"},
            {"internalType": "address[]", "name": "_participants", "type": "address[]"}
        ],
        "name": "createGroupCollection",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "string", "name": "_groupId", "type": "string"},
            {"internalType": "string", "name": "_title", "type": "string"},
            {"internalType": "string", "name": "_description", "type": "string"},
            {"internalType": "address[]", "name": "_participants", "type": "address[]"},
            {"internalType": "uint256", "name": "_amountPerPerson", "type": "uint256"}
        ],
        "name": "createAAPayment",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "string", "name": "_groupId", "type": "string"},
            {"internalType": "string", "name": "_title", "type": "string"},
            {"internalType": "string", "name": "_description", "type": "string"},
            {"internalType": "uint256", "name": "_targetAmount", "type": "uint256"},
            {"internalType": "uint256", "name": "_deadline", "type": "uint256"}
        ],
        "name": "createCrowdfunding",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "string", "name": "_paymentId", "type": "string"}],
        "name": "contribute",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "string", "name": "_paymentId", "type": "string"}],
        "name": "withdraw",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "string", "name": "_paymentId", "type": "string"}],
        "name": "getPayment",
        "outputs": [
            {
                "components": [
                    {"internalType": "string", "name": "paymentId", "type": "string"},
                    {"internalType": "string", "name": "groupId", "type": "string"},
                    {"internalType": "string", "name": "title", "type": "string"},
                    {"internalType": "string", "name": "description", "type": "string"},
                    {"internalType": "address", "name": "creator", "type": "address"},
                    {"internalType": "uint256", "name": "totalAmount", "type": "uint256"},
                    {"internalType": "uint256", "name": "targetAmount", "type": "uint256"},
                    {"internalType": "uint256", "name": "amountPerPerson", "type": "uint256"},
                    {"internalType": "uint256", "name": "participantCount", "type": "uint256"},
                    {"internalType": "uint256", "name": "createdAt", "type": "uint256"},
                    {"internalType": "uint256", "name": "deadline", "type": "uint256"},
                    {"internalType": "uint8", "name": "paymentType", "type": "uint8"},
                    {"internalType": "bool", "name": "isCompleted", "type": "bool"},
                    {"internalType": "bool", "name": "isActive", "type": "bool"}
                ],
                "internalType": "struct GroupPayment.Payment",
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
]''')

# RedPacket Contract ABI
RED_PACKET_ABI = json.loads('''[
    {
        "inputs": [
            {"internalType": "string", "name": "_groupId", "type": "string"},
            {"internalType": "string", "name": "_message", "type": "string"},
            {"internalType": "uint256", "name": "_count", "type": "uint256"}
        ],
        "name": "createRandomPacket",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "string", "name": "_groupId", "type": "string"},
            {"internalType": "string", "name": "_message", "type": "string"},
            {"internalType": "uint256", "name": "_count", "type": "uint256"}
        ],
        "name": "createFixedPacket",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "string", "name": "_groupId", "type": "string"},
            {"internalType": "string", "name": "_message", "type": "string"},
            {"internalType": "address[]", "name": "_recipients", "type": "address[]"}
        ],
        "name": "createExclusivePacket",
        "outputs": [{"internalType": "string", "name": "", "type": "string"}],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "string", "name": "_packetId", "type": "string"}],
        "name": "claimPacket",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "string", "name": "_packetId", "type": "string"}],
        "name": "getPacket",
        "outputs": [
            {
                "components": [
                    {"internalType": "string", "name": "packetId", "type": "string"},
                    {"internalType": "string", "name": "groupId", "type": "string"},
                    {"internalType": "string", "name": "message", "type": "string"},
                    {"internalType": "address", "name": "sender", "type": "address"},
                    {"internalType": "uint256", "name": "totalAmount", "type": "uint256"},
                    {"internalType": "uint256", "name": "remainingAmount", "type": "uint256"},
                    {"internalType": "uint256", "name": "count", "type": "uint256"},
                    {"internalType": "uint256", "name": "claimedCount", "type": "uint256"},
                    {"internalType": "uint256", "name": "createdAt", "type": "uint256"},
                    {"internalType": "uint256", "name": "expiresAt", "type": "uint256"},
                    {"internalType": "uint8", "name": "packetType", "type": "uint8"},
                    {"internalType": "bool", "name": "isActive", "type": "bool"}
                ],
                "internalType": "struct RedPacket.RedPacket",
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "string", "name": "_packetId", "type": "string"}],
        "name": "getClaimRecords",
        "outputs": [
            {
                "components": [
                    {"internalType": "address", "name": "claimer", "type": "address"},
                    {"internalType": "uint256", "name": "amount", "type": "uint256"},
                    {"internalType": "uint256", "name": "timestamp", "type": "uint256"}
                ],
                "internalType": "struct RedPacket.ClaimRecord[]",
                "name": "",
                "type": "tuple[]"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
]''')

# Initialize contracts
group_payment_contract = w3.eth.contract(
    address=Web3.to_checksum_address(CONTRACT_GROUP_PAYMENT),
    abi=GROUP_PAYMENT_ABI
)

red_packet_contract = w3.eth.contract(
    address=Web3.to_checksum_address(CONTRACT_RED_PACKET),
    abi=RED_PACKET_ABI
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


# ============= Group Payment Routes =============

@payments_web3_bp.route('/group-collection', methods=['POST'])
@require_auth
def create_group_collection():
    """
    Create a group collection (free amount contribution)
    
    Request body:
    {
        "groupId": "group_123",
        "title": "Dinner fund",
        "description": "Collecting money for team dinner",
        "participants": ["0x...", "0x..."],
        "privateKey": "0x..."
    }
    """
    try:
        data = request.json
        group_id = data.get('groupId')
        title = data.get('title')
        description = data.get('description', '')
        participants = data.get('participants', [])
        private_key = data.get('privateKey')
        
        if not all([group_id, title, private_key]):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        account = w3.eth.account.from_key(private_key)
        
        if account.address.lower() != request.user_address.lower():
            return jsonify({'success': False, 'error': 'Private key does not match authenticated user'}), 403
        
        # Convert participants to checksum addresses
        participants_checksum = [Web3.to_checksum_address(addr) for addr in participants]
        
        nonce = w3.eth.get_transaction_count(account.address)
        
        transaction = group_payment_contract.functions.createGroupCollection(
            group_id,
            title,
            description,
            participants_checksum
        ).build_transaction({
            'from': account.address,
            'nonce': nonce,
            'gas': 500000,
            'gasPrice': w3.eth.gas_price
        })
        
        signed_txn = w3.eth.account.sign_transaction(transaction, private_key)
        tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
        tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        if tx_receipt['status'] == 1:
            return jsonify({
                'success': True,
                'transactionHash': tx_hash.hex(),
                'message': 'Group collection created successfully'
            }), 201
        else:
            return jsonify({'success': False, 'error': 'Transaction failed'}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@payments_web3_bp.route('/aa-payment', methods=['POST'])
@require_auth
def create_aa_payment():
    """
    Create an AA payment (split bill)
    
    Request body:
    {
        "groupId": "group_123",
        "title": "Restaurant bill",
        "description": "Split dinner cost",
        "participants": ["0x...", "0x..."],
        "amountPerPerson": "0.01",
        "privateKey": "0x..."
    }
    """
    try:
        data = request.json
        group_id = data.get('groupId')
        title = data.get('title')
        description = data.get('description', '')
        participants = data.get('participants', [])
        amount_per_person = data.get('amountPerPerson')
        private_key = data.get('privateKey')
        
        if not all([group_id, title, amount_per_person, private_key]):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        account = w3.eth.account.from_key(private_key)
        
        if account.address.lower() != request.user_address.lower():
            return jsonify({'success': False, 'error': 'Private key does not match authenticated user'}), 403
        
        # Convert amount to Wei
        amount_wei = w3.to_wei(float(amount_per_person), 'ether')
        
        # Convert participants to checksum addresses
        participants_checksum = [Web3.to_checksum_address(addr) for addr in participants]
        
        nonce = w3.eth.get_transaction_count(account.address)
        
        transaction = group_payment_contract.functions.createAAPayment(
            group_id,
            title,
            description,
            participants_checksum,
            amount_wei
        ).build_transaction({
            'from': account.address,
            'nonce': nonce,
            'gas': 500000,
            'gasPrice': w3.eth.gas_price
        })
        
        signed_txn = w3.eth.account.sign_transaction(transaction, private_key)
        tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
        tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        if tx_receipt['status'] == 1:
            return jsonify({
                'success': True,
                'transactionHash': tx_hash.hex(),
                'message': 'AA payment created successfully'
            }), 201
        else:
            return jsonify({'success': False, 'error': 'Transaction failed'}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@payments_web3_bp.route('/crowdfunding', methods=['POST'])
@require_auth
def create_crowdfunding():
    """
    Create a crowdfunding campaign
    
    Request body:
    {
        "groupId": "group_123",
        "title": "Team building fund",
        "description": "Raising money for team building",
        "targetAmount": "1.0",
        "deadline": 1735689600,
        "initialContribution": "0.1",
        "privateKey": "0x..."
    }
    """
    try:
        data = request.json
        group_id = data.get('groupId')
        title = data.get('title')
        description = data.get('description', '')
        target_amount = data.get('targetAmount')
        deadline = data.get('deadline')
        initial_contribution = data.get('initialContribution', '0')
        private_key = data.get('privateKey')
        
        if not all([group_id, title, target_amount, deadline, private_key]):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        account = w3.eth.account.from_key(private_key)
        
        if account.address.lower() != request.user_address.lower():
            return jsonify({'success': False, 'error': 'Private key does not match authenticated user'}), 403
        
        # Convert amounts to Wei
        target_wei = w3.to_wei(float(target_amount), 'ether')
        contribution_wei = w3.to_wei(float(initial_contribution), 'ether')
        
        nonce = w3.eth.get_transaction_count(account.address)
        
        transaction = group_payment_contract.functions.createCrowdfunding(
            group_id,
            title,
            description,
            target_wei,
            deadline
        ).build_transaction({
            'from': account.address,
            'value': contribution_wei,
            'nonce': nonce,
            'gas': 500000,
            'gasPrice': w3.eth.gas_price
        })
        
        signed_txn = w3.eth.account.sign_transaction(transaction, private_key)
        tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
        tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        if tx_receipt['status'] == 1:
            return jsonify({
                'success': True,
                'transactionHash': tx_hash.hex(),
                'message': 'Crowdfunding created successfully'
            }), 201
        else:
            return jsonify({'success': False, 'error': 'Transaction failed'}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@payments_web3_bp.route('/contribute/<payment_id>', methods=['POST'])
@require_auth
def contribute_payment(payment_id):
    """
    Contribute to a payment
    
    Request body:
    {
        "amount": "0.1",
        "privateKey": "0x..."
    }
    """
    try:
        data = request.json
        amount = data.get('amount')
        private_key = data.get('privateKey')
        
        if not all([amount, private_key]):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        account = w3.eth.account.from_key(private_key)
        
        if account.address.lower() != request.user_address.lower():
            return jsonify({'success': False, 'error': 'Private key does not match authenticated user'}), 403
        
        # Convert amount to Wei
        amount_wei = w3.to_wei(float(amount), 'ether')
        
        nonce = w3.eth.get_transaction_count(account.address)
        
        transaction = group_payment_contract.functions.contribute(
            payment_id
        ).build_transaction({
            'from': account.address,
            'value': amount_wei,
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
                'message': 'Contribution successful'
            }), 200
        else:
            return jsonify({'success': False, 'error': 'Transaction failed'}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@payments_web3_bp.route('/payment/<payment_id>', methods=['GET'])
@require_auth
def get_payment(payment_id):
    """Get payment details"""
    try:
        payment = group_payment_contract.functions.getPayment(payment_id).call()
        
        return jsonify({
            'success': True,
            'payment': {
                'paymentId': payment[0],
                'groupId': payment[1],
                'title': payment[2],
                'description': payment[3],
                'creator': payment[4],
                'totalAmount': w3.from_wei(payment[5], 'ether'),
                'targetAmount': w3.from_wei(payment[6], 'ether'),
                'amountPerPerson': w3.from_wei(payment[7], 'ether'),
                'participantCount': payment[8],
                'createdAt': payment[9],
                'deadline': payment[10],
                'paymentType': payment[11],
                'isCompleted': payment[12],
                'isActive': payment[13]
            }
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# ============= Red Packet Routes =============

@payments_web3_bp.route('/redpacket/random', methods=['POST'])
@require_auth
def create_random_packet():
    """
    Create a random red packet (luck-based)
    
    Request body:
    {
        "groupId": "group_123",
        "message": "Happy New Year!",
        "count": 10,
        "totalAmount": "0.1",
        "privateKey": "0x..."
    }
    """
    try:
        data = request.json
        group_id = data.get('groupId')
        message = data.get('message', '')
        count = data.get('count')
        total_amount = data.get('totalAmount')
        private_key = data.get('privateKey')
        
        if not all([group_id, count, total_amount, private_key]):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        account = w3.eth.account.from_key(private_key)
        
        if account.address.lower() != request.user_address.lower():
            return jsonify({'success': False, 'error': 'Private key does not match authenticated user'}), 403
        
        # Convert amount to Wei
        amount_wei = w3.to_wei(float(total_amount), 'ether')
        
        nonce = w3.eth.get_transaction_count(account.address)
        
        transaction = red_packet_contract.functions.createRandomPacket(
            group_id,
            message,
            count
        ).build_transaction({
            'from': account.address,
            'value': amount_wei,
            'nonce': nonce,
            'gas': 500000,
            'gasPrice': w3.eth.gas_price
        })
        
        signed_txn = w3.eth.account.sign_transaction(transaction, private_key)
        tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
        tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        if tx_receipt['status'] == 1:
            return jsonify({
                'success': True,
                'transactionHash': tx_hash.hex(),
                'message': 'Random red packet created successfully'
            }), 201
        else:
            return jsonify({'success': False, 'error': 'Transaction failed'}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@payments_web3_bp.route('/redpacket/fixed', methods=['POST'])
@require_auth
def create_fixed_packet():
    """
    Create a fixed red packet (equal distribution)
    
    Request body:
    {
        "groupId": "group_123",
        "message": "Happy New Year!",
        "count": 10,
        "totalAmount": "0.1",
        "privateKey": "0x..."
    }
    """
    try:
        data = request.json
        group_id = data.get('groupId')
        message = data.get('message', '')
        count = data.get('count')
        total_amount = data.get('totalAmount')
        private_key = data.get('privateKey')
        
        if not all([group_id, count, total_amount, private_key]):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        account = w3.eth.account.from_key(private_key)
        
        if account.address.lower() != request.user_address.lower():
            return jsonify({'success': False, 'error': 'Private key does not match authenticated user'}), 403
        
        # Convert amount to Wei
        amount_wei = w3.to_wei(float(total_amount), 'ether')
        
        nonce = w3.eth.get_transaction_count(account.address)
        
        transaction = red_packet_contract.functions.createFixedPacket(
            group_id,
            message,
            count
        ).build_transaction({
            'from': account.address,
            'value': amount_wei,
            'nonce': nonce,
            'gas': 500000,
            'gasPrice': w3.eth.gas_price
        })
        
        signed_txn = w3.eth.account.sign_transaction(transaction, private_key)
        tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
        tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        if tx_receipt['status'] == 1:
            return jsonify({
                'success': True,
                'transactionHash': tx_hash.hex(),
                'message': 'Fixed red packet created successfully'
            }), 201
        else:
            return jsonify({'success': False, 'error': 'Transaction failed'}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@payments_web3_bp.route('/redpacket/exclusive', methods=['POST'])
@require_auth
def create_exclusive_packet():
    """
    Create an exclusive red packet (specific recipients)
    
    Request body:
    {
        "groupId": "group_123",
        "message": "Special gift!",
        "recipients": ["0x...", "0x..."],
        "totalAmount": "0.1",
        "privateKey": "0x..."
    }
    """
    try:
        data = request.json
        group_id = data.get('groupId')
        message = data.get('message', '')
        recipients = data.get('recipients', [])
        total_amount = data.get('totalAmount')
        private_key = data.get('privateKey')
        
        if not all([group_id, recipients, total_amount, private_key]):
            return jsonify({'success': False, 'error': 'Missing required fields'}), 400
        
        account = w3.eth.account.from_key(private_key)
        
        if account.address.lower() != request.user_address.lower():
            return jsonify({'success': False, 'error': 'Private key does not match authenticated user'}), 403
        
        # Convert recipients to checksum addresses
        recipients_checksum = [Web3.to_checksum_address(addr) for addr in recipients]
        
        # Convert amount to Wei
        amount_wei = w3.to_wei(float(total_amount), 'ether')
        
        nonce = w3.eth.get_transaction_count(account.address)
        
        transaction = red_packet_contract.functions.createExclusivePacket(
            group_id,
            message,
            recipients_checksum
        ).build_transaction({
            'from': account.address,
            'value': amount_wei,
            'nonce': nonce,
            'gas': 500000,
            'gasPrice': w3.eth.gas_price
        })
        
        signed_txn = w3.eth.account.sign_transaction(transaction, private_key)
        tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
        tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        
        if tx_receipt['status'] == 1:
            return jsonify({
                'success': True,
                'transactionHash': tx_hash.hex(),
                'message': 'Exclusive red packet created successfully'
            }), 201
        else:
            return jsonify({'success': False, 'error': 'Transaction failed'}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@payments_web3_bp.route('/redpacket/claim/<packet_id>', methods=['POST'])
@require_auth
def claim_packet(packet_id):
    """
    Claim a red packet
    
    Request body:
    {
        "privateKey": "0x..."
    }
    """
    try:
        data = request.json
        private_key = data.get('privateKey')
        
        if not private_key:
            return jsonify({'success': False, 'error': 'Private key is required'}), 400
        
        account = w3.eth.account.from_key(private_key)
        
        if account.address.lower() != request.user_address.lower():
            return jsonify({'success': False, 'error': 'Private key does not match authenticated user'}), 403
        
        nonce = w3.eth.get_transaction_count(account.address)
        
        transaction = red_packet_contract.functions.claimPacket(
            packet_id
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
                'message': 'Red packet claimed successfully'
            }), 200
        else:
            return jsonify({'success': False, 'error': 'Transaction failed'}), 500
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@payments_web3_bp.route('/redpacket/<packet_id>', methods=['GET'])
@require_auth
def get_packet(packet_id):
    """Get red packet details"""
    try:
        packet = red_packet_contract.functions.getPacket(packet_id).call()
        
        return jsonify({
            'success': True,
            'packet': {
                'packetId': packet[0],
                'groupId': packet[1],
                'message': packet[2],
                'sender': packet[3],
                'totalAmount': w3.from_wei(packet[4], 'ether'),
                'remainingAmount': w3.from_wei(packet[5], 'ether'),
                'count': packet[6],
                'claimedCount': packet[7],
                'createdAt': packet[8],
                'expiresAt': packet[9],
                'packetType': packet[10],
                'isActive': packet[11]
            }
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@payments_web3_bp.route('/redpacket/<packet_id>/records', methods=['GET'])
@require_auth
def get_claim_records(packet_id):
    """Get red packet claim records"""
    try:
        records = red_packet_contract.functions.getClaimRecords(packet_id).call()
        
        formatted_records = [
            {
                'claimer': record[0],
                'amount': w3.from_wei(record[1], 'ether'),
                'timestamp': record[2]
            }
            for record in records
        ]
        
        return jsonify({
            'success': True,
            'packetId': packet_id,
            'records': formatted_records,
            'totalClaimed': len(formatted_records)
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@payments_web3_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        is_connected = w3.is_connected()
        block_number = w3.eth.block_number if is_connected else None
        
        return jsonify({
            'status': 'healthy' if is_connected else 'unhealthy',
            'service': 'payments-web3-api',
            'contracts': {
                'groupPayment': CONTRACT_GROUP_PAYMENT,
                'redPacket': CONTRACT_RED_PACKET
            },
            'network': 'sepolia',
            'connected': is_connected,
            'blockNumber': block_number
        }), 200 if is_connected else 503
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 503

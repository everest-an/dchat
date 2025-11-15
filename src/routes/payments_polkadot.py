from flask import Blueprint, jsonify, request
from substrateinterface import SubstrateInterface, Keypair
from substrateinterface.exceptions import SubstrateRequestException
import os
import json

# Polkadot 支付蓝图
payments_polkadot_bp = Blueprint('payments_polkadot', __name__, url_prefix='/api/web3/polkadot')

# 配置 Polkadot 节点 URL
# 优先使用环境变量，否则使用 Polkadot 公共节点
POLKADOT_NODE_URL = os.getenv('POLKADOT_NODE_URL', 'wss://rpc.polkadot.io')

def get_substrate_interface():
    """获取 SubstrateInterface 实例"""
    try:
        return SubstrateInterface(
            url=POLKADOT_NODE_URL,
            ss58_format=0,  # Polkadot network
            type_registry_preset='substrate-node-template'
        )
    except ConnectionRefusedError as e:
        raise ConnectionRefusedError(f"无法连接到 Polkadot 节点: {POLKADOT_NODE_URL}. 错误: {e}")
    except Exception as e:
        raise Exception(f"初始化 SubstrateInterface 失败: {e}")

@payments_polkadot_bp.route('/construct_tx', methods=['POST'])
# @require_auth # 假设此路由不需要认证，但需要发送方地址
def construct_tx():
    """
    构造未签名的 Polkadot 余额转账交易 (Extrinsic)。
    """
    try:
        data = request.json
        sender_address = data.get('sender_address')
        recipient_address = data.get('recipient_address')
        amount = data.get('amount') # 预期为 Planck 单位的整数
        
        if not all([sender_address, recipient_address, amount]):
            return jsonify({'success': False, 'error': '缺少 sender_address, recipient_address 或 amount'}), 400
        
        # 1. 初始化 Substrate Interface
        substrate = get_substrate_interface()
        
        # 2. 构造转账 Call
        call = substrate.compose_call(
            call_module='Balances',
            call_function='transfer_keep_alive',
            call_params={
                'dest': recipient_address,
                'value': amount
            }
        )
        
        # 3. 构造未签名 Extrinsic
        # 注意：这里我们使用一个临时的 Keypair 来获取交易的元数据，但不会用它来签名
        # 实际的签名将由前端完成
        # 我们可以使用发送方地址来查询 nonce
        
        # 构造 Extrinsic 的必要参数
        nonce = substrate.get_account_nonce(sender_address)
        
        # 构造未签名 Extrinsic
        extrinsic = substrate.create_signed_extrinsic(
            call=call,
            keypair=Keypair.create_from_uri('//Alice'), # 仅用于获取元数据，不会用于签名
            era={'period': 64}, # 设置交易有效期
            nonce=nonce,
            signed_extrinsic=False # 关键：返回未签名的 Extrinsic
        )
        
        # 返回未签名的 Extrinsic 的十六进制编码
        return jsonify({
            'success': True,
            'unsigned_extrinsic': extrinsic.extrinsic.to_hex(),
            'sender_address': sender_address,
            'recipient_address': recipient_address,
            'amount': amount,
            'nonce': nonce,
            'message': '未签名的 Polkadot 交易已构造，请在前端签名后广播'
        }), 200
        
    except ConnectionRefusedError as e:
        return jsonify({'success': False, 'error': str(e)}), 503
    except SubstrateRequestException as e:
        return jsonify({'success': False, 'error': f"Polkadot 节点请求失败: {e}"}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': f"构造交易失败: {e}"}), 500

@payments_polkadot_bp.route('/broadcast_tx', methods=['POST'])
# @require_auth # 假设此路由不需要认证，但需要已签名的交易
def broadcast_tx():
    """
    广播已签名的 Polkadot 交易 (Extrinsic)。
    """
    try:
        data = request.json
        signed_extrinsic = data.get('signed_extrinsic')
        
        if not signed_extrinsic:
            return jsonify({'success': False, 'error': '缺少已签名的交易 (signed_extrinsic)'}), 400
        
        # 1. 初始化 Substrate Interface
        substrate = get_substrate_interface()
        
        # 2. 广播交易
        # submit_extrinsic 接受十六进制编码的 Extrinsic
        receipt = substrate.submit_extrinsic(
            signed_extrinsic, 
            wait_for_inclusion=True # 等待交易被打包
        )
        
        if receipt.is_success:
            return jsonify({
                'success': True,
                'transaction_hash': receipt.extrinsic_hash,
                'block_hash': receipt.block_hash,
                'message': 'Polkadot 交易广播成功并已包含在区块中'
            }), 200
        else:
            return jsonify({
                'success': False, 
                'error': '交易失败',
                'details': receipt.error_message
            }), 500
            
    except ConnectionRefusedError as e:
        return jsonify({'success': False, 'error': str(e)}), 503
    except SubstrateRequestException as e:
        return jsonify({'success': False, 'error': f"Polkadot 节点请求失败: {e}"}), 500
    except Exception as e:
        return jsonify({'success': False, 'error': f"广播交易失败: {e}"}), 500

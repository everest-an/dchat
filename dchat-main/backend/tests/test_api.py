"""
后端API测试
测试所有API端点的功能
"""

import pytest
import json
import sys
import os

# 添加项目根目录到路径
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from src.main_enhanced import app, db
from src.models.user import User
from src.models.message import Message

@pytest.fixture
def client():
    """创建测试客户端"""
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
            db.drop_all()

@pytest.fixture
def auth_token(client):
    """创建认证token"""
    # 创建测试用户
    response = client.post('/api/auth/connect-wallet', 
        json={
            'wallet_address': '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0'
        })
    
    data = json.loads(response.data)
    return data['token']

class TestHealthCheck:
    """健康检查测试"""
    
    def test_health_check(self, client):
        """测试健康检查端点"""
        response = client.get('/api/health')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['status'] == 'ok'
        assert 'version' in data

class TestAuth:
    """认证相关测试"""
    
    def test_connect_wallet_success(self, client):
        """测试钱包连接成功"""
        response = client.post('/api/auth/connect-wallet',
            json={
                'wallet_address': '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0'
            })
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] == True
        assert 'token' in data
        assert 'user' in data
    
    def test_connect_wallet_missing_address(self, client):
        """测试缺少钱包地址"""
        response = client.post('/api/auth/connect-wallet',
            json={})
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
    
    def test_verify_token_success(self, client, auth_token):
        """测试token验证成功"""
        response = client.post('/api/auth/verify-token',
            headers={'Authorization': f'Bearer {auth_token}'})
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] == True
        assert 'user' in data
    
    def test_verify_token_missing(self, client):
        """测试缺少token"""
        response = client.post('/api/auth/verify-token')
        
        assert response.status_code == 401
        data = json.loads(response.data)
        assert 'error' in data
    
    def test_update_profile_success(self, client, auth_token):
        """测试更新用户资料"""
        response = client.put('/api/auth/update-profile',
            headers={'Authorization': f'Bearer {auth_token}'},
            json={
                'name': 'Test User',
                'company': 'Test Company',
                'position': 'Developer'
            })
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] == True
        assert data['user']['name'] == 'Test User'

class TestMessages:
    """消息相关测试"""
    
    def test_get_conversations(self, client, auth_token):
        """测试获取对话列表"""
        response = client.get('/api/messages/conversations',
            headers={'Authorization': f'Bearer {auth_token}'})
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] == True
        assert 'conversations' in data
    
    def test_send_message_success(self, client, auth_token):
        """测试发送消息成功"""
        # 首先创建接收者
        receiver_response = client.post('/api/auth/connect-wallet',
            json={
                'wallet_address': '0x0000000000000000000000000000000000000001'
            })
        receiver_data = json.loads(receiver_response.data)
        receiver_id = receiver_data['user']['id']
        
        # 发送消息
        response = client.post('/api/messages/send',
            headers={'Authorization': f'Bearer {auth_token}'},
            json={
                'receiver_id': receiver_id,
                'content': 'Test message',
                'message_type': 'text'
            })
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] == True
        assert data['message']['content'] == 'Test message'
    
    def test_send_message_missing_content(self, client, auth_token):
        """测试发送消息缺少内容"""
        response = client.post('/api/messages/send',
            headers={'Authorization': f'Bearer {auth_token}'},
            json={
                'receiver_id': 1
            })
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data

class TestGroups:
    """群组相关测试"""
    
    def test_create_group_success(self, client, auth_token):
        """测试创建群组成功"""
        response = client.post('/api/groups/create',
            headers={'Authorization': f'Bearer {auth_token}'},
            json={
                'name': 'Test Group',
                'description': 'A test group',
                'members': []
            })
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['success'] == True
        assert data['group']['name'] == 'Test Group'
    
    def test_create_group_missing_name(self, client, auth_token):
        """测试创建群组缺少名称"""
        response = client.post('/api/groups/create',
            headers={'Authorization': f'Bearer {auth_token}'},
            json={
                'description': 'A test group'
            })
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
    
    def test_list_groups(self, client, auth_token):
        """测试获取群组列表"""
        # 先创建一个群组
        client.post('/api/groups/create',
            headers={'Authorization': f'Bearer {auth_token}'},
            json={
                'name': 'Test Group',
                'description': 'A test group'
            })
        
        # 获取列表
        response = client.get('/api/groups/list',
            headers={'Authorization': f'Bearer {auth_token}'})
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] == True
        assert len(data['groups']) > 0

class TestNotifications:
    """通知相关测试"""
    
    def test_get_notifications(self, client, auth_token):
        """测试获取通知列表"""
        response = client.get('/api/notifications/',
            headers={'Authorization': f'Bearer {auth_token}'})
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] == True
        assert 'notifications' in data
        assert 'unread_count' in data
    
    def test_mark_all_read(self, client, auth_token):
        """测试标记所有通知已读"""
        response = client.put('/api/notifications/read-all',
            headers={'Authorization': f'Bearer {auth_token}'})
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] == True
    
    def test_clear_notifications(self, client, auth_token):
        """测试清空所有通知"""
        response = client.delete('/api/notifications/clear',
            headers={'Authorization': f'Bearer {auth_token}'})
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert data['success'] == True

class TestUsers:
    """用户相关测试"""
    
    def test_get_users(self, client):
        """测试获取用户列表"""
        response = client.get('/api/users')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert isinstance(data, list)
    
    def test_create_user(self, client):
        """测试创建用户"""
        response = client.post('/api/users',
            json={
                'username': 'testuser',
                'email': 'test@example.com'
            })
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['username'] == 'testuser'

if __name__ == '__main__':
    pytest.main([__file__, '-v'])

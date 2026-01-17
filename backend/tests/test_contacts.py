import pytest
from src.models.user import User, db
from src.routes.contacts import check_contacts
import json

def test_check_contacts_empty(client, auth_headers):
    """测试空通讯录列表"""
    response = client.post('/api/contacts/check', 
                         headers=auth_headers,
                         json={'contacts': []})
    assert response.status_code == 200
    assert response.json['success'] == True
    assert len(response.json['matches']) == 0

def test_check_contacts_match_phone(client, auth_headers, test_user):
    """测试通过手机号匹配用户"""
    # 创建另一个用户
    other_user = User(
        wallet_address='0x9876543210987654321098765432109876543210',
        name='Phone User',
        phone='+1234567890'
    )
    db.session.add(other_user)
    db.session.commit()

    contacts = [
        {'phone': '+1234567890', 'name': 'My Friend'},
        {'phone': '+0000000000', 'name': 'Unknown'}
    ]

    response = client.post('/api/contacts/check',
                         headers=auth_headers,
                         json={'contacts': contacts})
    
    assert response.status_code == 200
    data = response.json
    assert len(data['matches']) == 1
    assert data['matches'][0]['wallet_address'] == other_user.wallet_address
    assert data['matches'][0]['name'] == 'Phone User'

def test_check_contacts_match_email(client, auth_headers, test_user):
    """测试通过邮箱匹配用户"""
    # 创建另一个用户
    other_user = User(
        wallet_address='0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        name='Email User',
        email='friend@example.com'
    )
    db.session.add(other_user)
    db.session.commit()

    contacts = [
        {'email': 'friend@example.com', 'name': 'My Friend'},
        {'email': 'unknown@example.com', 'name': 'Unknown'}
    ]

    response = client.post('/api/contacts/check',
                         headers=auth_headers,
                         json={'contacts': contacts})
    
    assert response.status_code == 200
    data = response.json
    assert len(data['matches']) == 1
    assert data['matches'][0]['wallet_address'] == other_user.wallet_address
    assert data['matches'][0]['name'] == 'Email User'

def test_check_contacts_self_exclusion(client, auth_headers, test_user):
    """测试不返回自己"""
    # 更新当前用户资料
    test_user.phone = '+1111111111'
    db.session.commit()

    contacts = [
        {'phone': '+1111111111', 'name': 'Me'}
    ]

    response = client.post('/api/contacts/check',
                         headers=auth_headers,
                         json={'contacts': contacts})
    
    assert response.status_code == 200
    assert len(response.json['matches']) == 0

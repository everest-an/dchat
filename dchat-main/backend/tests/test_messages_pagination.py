import pytest
from src.models.message import Message, db
from src.models.user import User
import datetime

def test_get_messages_pagination(client, auth_headers, test_user):
    """测试消息分页获取"""
    # 创建聊天对象
    other_user = User(
        wallet_address='0x1111111111111111111111111111111111111111',
        name='Chat Partner'
    )
    db.session.add(other_user)
    db.session.commit()

    # 创建 60 条消息
    messages = []
    base_time = datetime.datetime.utcnow()
    for i in range(60):
        msg = Message(
            sender_id=test_user.id if i % 2 == 0 else other_user.id,
            receiver_id=other_user.id if i % 2 == 0 else test_user.id,
            content=f'Message {i}',
            timestamp=base_time + datetime.timedelta(minutes=i)
        )
        messages.append(msg)
    
    db.session.add_all(messages)
    db.session.commit()

    # 测试默认分页 (第一页，默认50条)
    response = client.get(f'/api/messages/conversations/{other_user.id}',
                        headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json
    assert len(data['messages']) == 50
    assert data['pagination']['page'] == 1
    assert data['pagination']['has_next'] == True
    # 验证返回的是最新的50条 (索引 10-59)
    assert data['messages'][-1]['content'] == 'Message 59'

    # 测试第二页
    response = client.get(f'/api/messages/conversations/{other_user.id}?page=2&per_page=50',
                        headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json
    assert len(data['messages']) == 10
    assert data['pagination']['page'] == 2
    assert data['pagination']['has_next'] == False
    # 验证返回的是最旧的10条 (索引 0-9)
    assert data['messages'][0]['content'] == 'Message 0'

def test_get_messages_custom_page_size(client, auth_headers, test_user):
    """测试自定义分页大小"""
    # 创建聊天对象
    other_user = User(
        wallet_address='0x2222222222222222222222222222222222222222',
        name='Chat Partner 2'
    )
    db.session.add(other_user)
    db.session.commit()

    # 创建 5 条消息
    for i in range(5):
        msg = Message(
            sender_id=test_user.id,
            receiver_id=other_user.id,
            content=f'Msg {i}',
            timestamp=datetime.datetime.utcnow()
        )
        db.session.add(msg)
    db.session.commit()

    # 每页 2 条
    response = client.get(f'/api/messages/conversations/{other_user.id}?per_page=2',
                        headers=auth_headers)
    
    assert response.status_code == 200
    data = response.json
    assert len(data['messages']) == 2
    assert data['pagination']['pages'] == 3  # 5条数据，每页2条，共3页

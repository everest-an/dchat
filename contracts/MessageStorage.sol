// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MessageStorage
 * @dev 去中心化消息存储合约 - 存储消息哈希和元数据
 * @notice 用于 Dchat 平台的端到端加密消息存储
 */
contract MessageStorage {
    
    // 消息结构
    struct Message {
        bytes32 messageHash;      // 加密消息的哈希
        address sender;           // 发送者地址
        address recipient;        // 接收者地址
        uint256 timestamp;        // 时间戳
        string ipfsHash;          // IPFS 存储哈希
        bool isDeleted;           // 是否已删除
    }
    
    // 聊天会话结构
    struct ChatSession {
        address participant1;
        address participant2;
        uint256 messageCount;
        uint256 createdAt;
        bool isActive;
    }
    
    // 存储所有消息
    mapping(bytes32 => Message) public messages;
    
    // 用户的消息列表 (发送者 => 消息ID列表)
    mapping(address => bytes32[]) public userSentMessages;
    
    // 用户的接收消息列表 (接收者 => 消息ID列表)
    mapping(address => bytes32[]) public userReceivedMessages;
    
    // 聊天会话 (会话ID => 会话信息)
    mapping(bytes32 => ChatSession) public chatSessions;
    
    // 用户的聊天会话列表
    mapping(address => bytes32[]) public userSessions;
    
    // 事件
    event MessageStored(
        bytes32 indexed messageId,
        address indexed sender,
        address indexed recipient,
        uint256 timestamp,
        string ipfsHash
    );
    
    event MessageDeleted(
        bytes32 indexed messageId,
        address indexed deletedBy,
        uint256 timestamp
    );
    
    event SessionCreated(
        bytes32 indexed sessionId,
        address indexed participant1,
        address indexed participant2,
        uint256 timestamp
    );
    
    /**
     * @dev 存储消息
     * @param _messageHash 加密消息的哈希
     * @param _recipient 接收者地址
     * @param _ipfsHash IPFS 存储哈希
     * @return messageId 消息ID
     */
    function storeMessage(
        bytes32 _messageHash,
        address _recipient,
        string memory _ipfsHash
    ) external returns (bytes32) {
        require(_recipient != address(0), "Invalid recipient address");
        require(_recipient != msg.sender, "Cannot send message to yourself");
        require(bytes(_ipfsHash).length > 0, "IPFS hash cannot be empty");
        
        // 生成唯一消息ID
        bytes32 messageId = keccak256(
            abi.encodePacked(
                _messageHash,
                msg.sender,
                _recipient,
                block.timestamp,
                block.number
            )
        );
        
        // 确保消息ID唯一
        require(messages[messageId].timestamp == 0, "Message ID already exists");
        
        // 存储消息
        messages[messageId] = Message({
            messageHash: _messageHash,
            sender: msg.sender,
            recipient: _recipient,
            timestamp: block.timestamp,
            ipfsHash: _ipfsHash,
            isDeleted: false
        });
        
        // 更新用户消息列表
        userSentMessages[msg.sender].push(messageId);
        userReceivedMessages[_recipient].push(messageId);
        
        // 创建或更新聊天会话
        bytes32 sessionId = getSessionId(msg.sender, _recipient);
        if (chatSessions[sessionId].createdAt == 0) {
            _createSession(msg.sender, _recipient);
        } else {
            chatSessions[sessionId].messageCount++;
        }
        
        emit MessageStored(messageId, msg.sender, _recipient, block.timestamp, _ipfsHash);
        
        return messageId;
    }
    
    /**
     * @dev 删除消息 (软删除)
     * @param _messageId 消息ID
     */
    function deleteMessage(bytes32 _messageId) external {
        Message storage message = messages[_messageId];
        require(message.timestamp > 0, "Message does not exist");
        require(
            message.sender == msg.sender || message.recipient == msg.sender,
            "Not authorized to delete this message"
        );
        require(!message.isDeleted, "Message already deleted");
        
        message.isDeleted = true;
        
        emit MessageDeleted(_messageId, msg.sender, block.timestamp);
    }
    
    /**
     * @dev 获取消息详情
     * @param _messageId 消息ID
     * @return Message 消息结构
     */
    function getMessage(bytes32 _messageId) external view returns (Message memory) {
        Message memory message = messages[_messageId];
        require(message.timestamp > 0, "Message does not exist");
        require(
            message.sender == msg.sender || message.recipient == msg.sender,
            "Not authorized to view this message"
        );
        
        return message;
    }
    
    /**
     * @dev 获取用户发送的消息列表
     * @param _user 用户地址
     * @return bytes32[] 消息ID列表
     */
    function getUserSentMessages(address _user) external view returns (bytes32[] memory) {
        return userSentMessages[_user];
    }
    
    /**
     * @dev 获取用户接收的消息列表
     * @param _user 用户地址
     * @return bytes32[] 消息ID列表
     */
    function getUserReceivedMessages(address _user) external view returns (bytes32[] memory) {
        return userReceivedMessages[_user];
    }
    
    /**
     * @dev 创建聊天会话
     * @param _participant1 参与者1
     * @param _participant2 参与者2
     */
    function _createSession(address _participant1, address _participant2) private {
        bytes32 sessionId = getSessionId(_participant1, _participant2);
        
        chatSessions[sessionId] = ChatSession({
            participant1: _participant1,
            participant2: _participant2,
            messageCount: 1,
            createdAt: block.timestamp,
            isActive: true
        });
        
        userSessions[_participant1].push(sessionId);
        userSessions[_participant2].push(sessionId);
        
        emit SessionCreated(sessionId, _participant1, _participant2, block.timestamp);
    }
    
    /**
     * @dev 获取会话ID
     * @param _user1 用户1
     * @param _user2 用户2
     * @return bytes32 会话ID
     */
    function getSessionId(address _user1, address _user2) public pure returns (bytes32) {
        // 确保会话ID对于两个用户是相同的
        if (_user1 < _user2) {
            return keccak256(abi.encodePacked(_user1, _user2));
        } else {
            return keccak256(abi.encodePacked(_user2, _user1));
        }
    }
    
    /**
     * @dev 获取用户的聊天会话列表
     * @param _user 用户地址
     * @return bytes32[] 会话ID列表
     */
    function getUserSessions(address _user) external view returns (bytes32[] memory) {
        return userSessions[_user];
    }
    
    /**
     * @dev 获取会话详情
     * @param _sessionId 会话ID
     * @return ChatSession 会话结构
     */
    function getSession(bytes32 _sessionId) external view returns (ChatSession memory) {
        ChatSession memory session = chatSessions[_sessionId];
        require(session.createdAt > 0, "Session does not exist");
        require(
            session.participant1 == msg.sender || session.participant2 == msg.sender,
            "Not authorized to view this session"
        );
        
        return session;
    }
    
    /**
     * @dev 获取会话消息数量
     * @param _user1 用户1
     * @param _user2 用户2
     * @return uint256 消息数量
     */
    function getSessionMessageCount(address _user1, address _user2) external view returns (uint256) {
        bytes32 sessionId = getSessionId(_user1, _user2);
        return chatSessions[sessionId].messageCount;
    }
}


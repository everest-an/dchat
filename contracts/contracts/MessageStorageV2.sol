// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MessageStorageV2
 * @dev 升级版消息存储合约,支持真实聊天功能
 * @notice 支持点对点聊天、群聊、消息历史、已读状态
 */
contract MessageStorageV2 {
    
    // 消息结构
    struct Message {
        uint256 messageId;          // 消息ID
        address sender;             // 发送者
        address recipient;          // 接收者 (点对点)
        string chatId;              // 聊天ID (用于群聊)
        string contentHash;         // 消息内容哈希 (加密)
        string ipfsHash;            // IPFS 哈希 (存储加密内容)
        uint256 timestamp;          // 时间戳
        bool isRead;                // 是否已读
        bool isDeleted;             // 是否删除
        MessageType messageType;    // 消息类型
    }
    
    // 消息类型
    enum MessageType {
        TEXT,           // 文本消息
        IMAGE,          // 图片消息
        FILE,           // 文件消息
        VOICE,          // 语音消息
        VIDEO,          // 视频消息
        PAYMENT,        // 支付消息
        SYSTEM          // 系统消息
    }
    
    // 聊天会话结构
    struct ChatSession {
        string chatId;              // 聊天ID
        address[] participants;     // 参与者
        uint256 messageCount;       // 消息数量
        uint256 createdAt;          // 创建时间
        uint256 lastMessageAt;      // 最后消息时间
        bool isGroup;               // 是否群聊
        string groupName;           // 群组名称
        string groupAvatar;         // 群组头像
    }
    
    // 用户联系人结构
    struct Contact {
        address userAddress;        // 用户地址
        string displayName;         // 显示名称
        string chatId;              // 聊天ID
        uint256 unreadCount;        // 未读消息数
        uint256 lastMessageAt;      // 最后消息时间
        bool isPinned;              // 是否置顶
        bool isMuted;               // 是否静音
    }
    
    // 存储所有消息
    mapping(uint256 => Message) public messages;
    
    // 存储聊天会话
    mapping(string => ChatSession) public chatSessions;
    
    // 用户消息列表 (用户地址 => 消息ID列表)
    mapping(address => uint256[]) public userMessages;
    
    // 聊天消息列表 (聊天ID => 消息ID列表)
    mapping(string => uint256[]) public chatMessages;
    
    // 用户联系人列表 (用户地址 => 联系人列表)
    mapping(address => Contact[]) public userContacts;
    
    // 用户未读消息数 (用户地址 => 聊天ID => 未读数)
    mapping(address => mapping(string => uint256)) public unreadCounts;
    
    // 点对点聊天ID映射 (地址1 => 地址2 => 聊天ID)
    mapping(address => mapping(address => string)) public p2pChatIds;
    
    // 消息计数器
    uint256 public messageCounter;
    
    // 聊天计数器
    uint256 public chatCounter;
    
    // 事件
    event MessageSent(
        uint256 indexed messageId,
        address indexed sender,
        address indexed recipient,
        string chatId,
        uint256 timestamp
    );
    
    event MessageRead(
        uint256 indexed messageId,
        address indexed reader,
        uint256 timestamp
    );
    
    event MessageDeleted(
        uint256 indexed messageId,
        address indexed deleter,
        uint256 timestamp
    );
    
    event ChatCreated(
        string indexed chatId,
        address[] participants,
        bool isGroup,
        uint256 timestamp
    );
    
    event ContactAdded(
        address indexed user,
        address indexed contact,
        string chatId,
        uint256 timestamp
    );
    
    /**
     * @dev 创建点对点聊天
     */
    function createP2PChat(address _recipient) external returns (string memory) {
        require(_recipient != msg.sender, "Cannot chat with yourself");
        require(_recipient != address(0), "Invalid recipient");
        
        // 检查是否已存在聊天
        string memory existingChatId = p2pChatIds[msg.sender][_recipient];
        if (bytes(existingChatId).length > 0) {
            return existingChatId;
        }
        
        // 创建新的聊天ID
        chatCounter++;
        string memory chatId = string(abi.encodePacked("p2p_", uint2str(chatCounter)));
        
        // 创建聊天会话
        address[] memory participants = new address[](2);
        participants[0] = msg.sender;
        participants[1] = _recipient;
        
        chatSessions[chatId] = ChatSession({
            chatId: chatId,
            participants: participants,
            messageCount: 0,
            createdAt: block.timestamp,
            lastMessageAt: block.timestamp,
            isGroup: false,
            groupName: "",
            groupAvatar: ""
        });
        
        // 双向映射
        p2pChatIds[msg.sender][_recipient] = chatId;
        p2pChatIds[_recipient][msg.sender] = chatId;
        
        emit ChatCreated(chatId, participants, false, block.timestamp);
        
        return chatId;
    }
    
    /**
     * @dev 发送消息
     */
    function sendMessage(
        address _recipient,
        string memory _chatId,
        string memory _contentHash,
        string memory _ipfsHash,
        MessageType _messageType
    ) external returns (uint256) {
        require(_recipient != address(0) || bytes(_chatId).length > 0, "Recipient or chatId required");
        
        messageCounter++;
        
        // 如果是点对点消息,获取或创建聊天ID
        string memory chatId = _chatId;
        if (_recipient != address(0) && bytes(_chatId).length == 0) {
            chatId = this.createP2PChat(_recipient);
        }
        
        // 创建消息
        messages[messageCounter] = Message({
            messageId: messageCounter,
            sender: msg.sender,
            recipient: _recipient,
            chatId: chatId,
            contentHash: _contentHash,
            ipfsHash: _ipfsHash,
            timestamp: block.timestamp,
            isRead: false,
            isDeleted: false,
            messageType: _messageType
        });
        
        // 添加到用户消息列表
        userMessages[msg.sender].push(messageCounter);
        if (_recipient != address(0)) {
            userMessages[_recipient].push(messageCounter);
        }
        
        // 添加到聊天消息列表
        chatMessages[chatId].push(messageCounter);
        
        // 更新聊天会话
        ChatSession storage session = chatSessions[chatId];
        session.messageCount++;
        session.lastMessageAt = block.timestamp;
        
        // 更新未读数 (除了发送者)
        for (uint256 i = 0; i < session.participants.length; i++) {
            if (session.participants[i] != msg.sender) {
                unreadCounts[session.participants[i]][chatId]++;
            }
        }
        
        emit MessageSent(messageCounter, msg.sender, _recipient, chatId, block.timestamp);
        
        return messageCounter;
    }
    
    /**
     * @dev 标记消息为已读
     */
    function markAsRead(uint256 _messageId) external {
        Message storage message = messages[_messageId];
        require(message.recipient == msg.sender, "Not message recipient");
        require(!message.isRead, "Already read");
        
        message.isRead = true;
        
        // 减少未读数
        if (unreadCounts[msg.sender][message.chatId] > 0) {
            unreadCounts[msg.sender][message.chatId]--;
        }
        
        emit MessageRead(_messageId, msg.sender, block.timestamp);
    }
    
    /**
     * @dev 批量标记消息为已读
     */
    function markChatAsRead(string memory _chatId) external {
        uint256[] memory messageIds = chatMessages[_chatId];
        
        for (uint256 i = 0; i < messageIds.length; i++) {
            Message storage message = messages[messageIds[i]];
            if (message.recipient == msg.sender && !message.isRead) {
                message.isRead = true;
            }
        }
        
        // 重置未读数
        unreadCounts[msg.sender][_chatId] = 0;
    }
    
    /**
     * @dev 删除消息 (软删除)
     */
    function deleteMessage(uint256 _messageId) external {
        Message storage message = messages[_messageId];
        require(message.sender == msg.sender, "Not message sender");
        require(!message.isDeleted, "Already deleted");
        
        message.isDeleted = true;
        
        emit MessageDeleted(_messageId, msg.sender, block.timestamp);
    }
    
    /**
     * @dev 添加联系人
     */
    function addContact(address _contact, string memory _displayName) external {
        require(_contact != msg.sender, "Cannot add yourself");
        require(_contact != address(0), "Invalid contact");
        
        // 创建或获取聊天ID
        string memory chatId = this.createP2PChat(_contact);
        
        userContacts[msg.sender].push(Contact({
            userAddress: _contact,
            displayName: _displayName,
            chatId: chatId,
            unreadCount: 0,
            lastMessageAt: block.timestamp,
            isPinned: false,
            isMuted: false
        }));
        
        emit ContactAdded(msg.sender, _contact, chatId, block.timestamp);
    }
    
    /**
     * @dev 获取聊天消息列表
     */
    function getChatMessages(string memory _chatId) external view returns (uint256[] memory) {
        return chatMessages[_chatId];
    }
    
    /**
     * @dev 获取消息详情
     */
    function getMessage(uint256 _messageId) external view returns (Message memory) {
        return messages[_messageId];
    }
    
    /**
     * @dev 获取用户联系人列表
     */
    function getUserContacts(address _user) external view returns (Contact[] memory) {
        return userContacts[_user];
    }
    
    /**
     * @dev 获取未读消息数
     */
    function getUnreadCount(address _user, string memory _chatId) external view returns (uint256) {
        return unreadCounts[_user][_chatId];
    }
    
    /**
     * @dev 获取聊天会话信息
     */
    function getChatSession(string memory _chatId) external view returns (ChatSession memory) {
        return chatSessions[_chatId];
    }
    
    /**
     * @dev 获取点对点聊天ID
     */
    function getP2PChatId(address _user1, address _user2) external view returns (string memory) {
        return p2pChatIds[_user1][_user2];
    }
    
    /**
     * @dev 辅助函数: uint 转 string
     */
    function uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 length;
        while (j != 0) {
            length++;
            j /= 10;
        }
        bytes memory bstr = new bytes(length);
        uint256 k = length;
        j = _i;
        while (j != 0) {
            bstr[--k] = bytes1(uint8(48 + j % 10));
            j /= 10;
        }
        return string(bstr);
    }
}


// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title RedPacket
 * @dev 红包合约 - 支持随机红包、固定红包、专属红包
 * @notice 用于群组内发送加密货币红包
 */
contract RedPacket {
    
    // 红包类型
    enum RedPacketType {
        RANDOM,         // 随机红包
        FIXED,          // 固定红包
        EXCLUSIVE       // 专属红包
    }
    
    // 红包状态
    enum RedPacketStatus {
        ACTIVE,         // 进行中
        COMPLETED,      // 已抢完
        EXPIRED,        // 已过期
        REFUNDED        // 已退款
    }
    
    // 红包信息
    struct RedPacket {
        bytes32 redPacketId;        // 红包ID
        string groupId;             // 群组ID
        address sender;             // 发送者
        RedPacketType packetType;   // 红包类型
        uint256 totalAmount;        // 总金额
        uint256 remainingAmount;    // 剩余金额
        uint256 totalCount;         // 总个数
        uint256 remainingCount;     // 剩余个数
        uint256 fixedAmount;        // 固定金额 (固定红包)
        address[] recipients;       // 领取者列表
        mapping(address => uint256) claims;  // 领取记录
        mapping(address => bool) hasClaimed; // 是否已领取
        address[] exclusiveRecipients;       // 专属红包接收者
        string message;             // 祝福语
        uint256 createdAt;          // 创建时间
        uint256 expireAt;           // 过期时间
        RedPacketStatus status;     // 状态
    }
    
    // 领取记录
    struct ClaimRecord {
        bytes32 redPacketId;        // 红包ID
        address claimer;            // 领取者
        uint256 amount;             // 领取金额
        uint256 claimedAt;          // 领取时间
        uint256 order;              // 领取顺序
    }
    
    // 存储所有红包
    mapping(bytes32 => RedPacket) public redPackets;
    
    // 群组红包列表 (群组ID => 红包ID列表)
    mapping(string => bytes32[]) public groupRedPackets;
    
    // 用户发送的红包 (用户地址 => 红包ID列表)
    mapping(address => bytes32[]) public userSentRedPackets;
    
    // 用户领取的红包 (用户地址 => 红包ID列表)
    mapping(address => bytes32[]) public userClaimedRedPackets;
    
    // 领取记录列表 (红包ID => 领取记录列表)
    mapping(bytes32 => ClaimRecord[]) public claimRecords;
    
    // 红包计数器
    uint256 public redPacketCounter;
    
    // 最小红包金额 (0.001 ETH)
    uint256 public constant MIN_AMOUNT = 0.001 ether;
    
    // 最大红包个数
    uint256 public constant MAX_COUNT = 100;
    
    // 红包有效期 (24小时)
    uint256 public constant EXPIRATION_TIME = 24 hours;
    
    // 事件
    event RedPacketCreated(
        bytes32 indexed redPacketId,
        string indexed groupId,
        address indexed sender,
        RedPacketType packetType,
        uint256 totalAmount,
        uint256 totalCount,
        uint256 timestamp
    );
    
    event RedPacketClaimed(
        bytes32 indexed redPacketId,
        address indexed claimer,
        uint256 amount,
        uint256 order,
        uint256 timestamp
    );
    
    event RedPacketCompleted(
        bytes32 indexed redPacketId,
        uint256 timestamp
    );
    
    event RedPacketExpired(
        bytes32 indexed redPacketId,
        uint256 timestamp
    );
    
    event RedPacketRefunded(
        bytes32 indexed redPacketId,
        address indexed sender,
        uint256 amount,
        uint256 timestamp
    );
    
    /**
     * @dev 创建随机红包
     */
    function createRandomRedPacket(
        string memory _groupId,
        uint256 _count,
        string memory _message
    ) external payable returns (bytes32) {
        require(msg.value >= MIN_AMOUNT, "Amount too small");
        require(_count > 0 && _count <= MAX_COUNT, "Invalid count");
        require(msg.value >= _count * MIN_AMOUNT, "Amount too small for count");
        
        redPacketCounter++;
        bytes32 redPacketId = keccak256(abi.encodePacked("redpacket", redPacketCounter, block.timestamp, msg.sender));
        
        RedPacket storage packet = redPackets[redPacketId];
        packet.redPacketId = redPacketId;
        packet.groupId = _groupId;
        packet.sender = msg.sender;
        packet.packetType = RedPacketType.RANDOM;
        packet.totalAmount = msg.value;
        packet.remainingAmount = msg.value;
        packet.totalCount = _count;
        packet.remainingCount = _count;
        packet.fixedAmount = 0;
        packet.message = _message;
        packet.createdAt = block.timestamp;
        packet.expireAt = block.timestamp + EXPIRATION_TIME;
        packet.status = RedPacketStatus.ACTIVE;
        
        groupRedPackets[_groupId].push(redPacketId);
        userSentRedPackets[msg.sender].push(redPacketId);
        
        emit RedPacketCreated(redPacketId, _groupId, msg.sender, RedPacketType.RANDOM, msg.value, _count, block.timestamp);
        
        return redPacketId;
    }
    
    /**
     * @dev 创建固定红包
     */
    function createFixedRedPacket(
        string memory _groupId,
        uint256 _count,
        string memory _message
    ) external payable returns (bytes32) {
        require(msg.value >= MIN_AMOUNT, "Amount too small");
        require(_count > 0 && _count <= MAX_COUNT, "Invalid count");
        require(msg.value % _count == 0, "Amount must be divisible by count");
        
        uint256 fixedAmount = msg.value / _count;
        require(fixedAmount >= MIN_AMOUNT, "Fixed amount too small");
        
        redPacketCounter++;
        bytes32 redPacketId = keccak256(abi.encodePacked("fixed", redPacketCounter, block.timestamp, msg.sender));
        
        RedPacket storage packet = redPackets[redPacketId];
        packet.redPacketId = redPacketId;
        packet.groupId = _groupId;
        packet.sender = msg.sender;
        packet.packetType = RedPacketType.FIXED;
        packet.totalAmount = msg.value;
        packet.remainingAmount = msg.value;
        packet.totalCount = _count;
        packet.remainingCount = _count;
        packet.fixedAmount = fixedAmount;
        packet.message = _message;
        packet.createdAt = block.timestamp;
        packet.expireAt = block.timestamp + EXPIRATION_TIME;
        packet.status = RedPacketStatus.ACTIVE;
        
        groupRedPackets[_groupId].push(redPacketId);
        userSentRedPackets[msg.sender].push(redPacketId);
        
        emit RedPacketCreated(redPacketId, _groupId, msg.sender, RedPacketType.FIXED, msg.value, _count, block.timestamp);
        
        return redPacketId;
    }
    
    /**
     * @dev 创建专属红包
     */
    function createExclusiveRedPacket(
        string memory _groupId,
        address[] memory _recipients,
        string memory _message
    ) external payable returns (bytes32) {
        require(msg.value >= MIN_AMOUNT, "Amount too small");
        require(_recipients.length > 0 && _recipients.length <= MAX_COUNT, "Invalid recipients");
        require(msg.value % _recipients.length == 0, "Amount must be divisible by recipients");
        
        uint256 fixedAmount = msg.value / _recipients.length;
        require(fixedAmount >= MIN_AMOUNT, "Amount per recipient too small");
        
        redPacketCounter++;
        bytes32 redPacketId = keccak256(abi.encodePacked("exclusive", redPacketCounter, block.timestamp, msg.sender));
        
        RedPacket storage packet = redPackets[redPacketId];
        packet.redPacketId = redPacketId;
        packet.groupId = _groupId;
        packet.sender = msg.sender;
        packet.packetType = RedPacketType.EXCLUSIVE;
        packet.totalAmount = msg.value;
        packet.remainingAmount = msg.value;
        packet.totalCount = _recipients.length;
        packet.remainingCount = _recipients.length;
        packet.fixedAmount = fixedAmount;
        packet.exclusiveRecipients = _recipients;
        packet.message = _message;
        packet.createdAt = block.timestamp;
        packet.expireAt = block.timestamp + EXPIRATION_TIME;
        packet.status = RedPacketStatus.ACTIVE;
        
        groupRedPackets[_groupId].push(redPacketId);
        userSentRedPackets[msg.sender].push(redPacketId);
        
        emit RedPacketCreated(redPacketId, _groupId, msg.sender, RedPacketType.EXCLUSIVE, msg.value, _recipients.length, block.timestamp);
        
        return redPacketId;
    }
    
    /**
     * @dev 领取红包
     */
    function claimRedPacket(bytes32 _redPacketId) external {
        RedPacket storage packet = redPackets[_redPacketId];
        
        require(packet.status == RedPacketStatus.ACTIVE, "Red packet not active");
        require(block.timestamp <= packet.expireAt, "Red packet expired");
        require(packet.remainingCount > 0, "No red packets left");
        require(!packet.hasClaimed[msg.sender], "Already claimed");
        require(msg.sender != packet.sender, "Cannot claim own red packet");
        
        // 专属红包检查接收者
        if (packet.packetType == RedPacketType.EXCLUSIVE) {
            bool isRecipient = false;
            for (uint256 i = 0; i < packet.exclusiveRecipients.length; i++) {
                if (packet.exclusiveRecipients[i] == msg.sender) {
                    isRecipient = true;
                    break;
                }
            }
            require(isRecipient, "Not an exclusive recipient");
        }
        
        uint256 claimAmount;
        
        if (packet.packetType == RedPacketType.RANDOM) {
            // 随机金额算法
            if (packet.remainingCount == 1) {
                // 最后一个红包，领取全部剩余金额
                claimAmount = packet.remainingAmount;
            } else {
                // 随机金额 = 剩余金额 * (0.01 ~ 剩余个数*2/剩余个数) 的随机比例
                uint256 maxAmount = (packet.remainingAmount * 2) / packet.remainingCount;
                uint256 minAmount = packet.remainingAmount / (packet.remainingCount * 10);
                if (minAmount < MIN_AMOUNT / 10) {
                    minAmount = MIN_AMOUNT / 10;
                }
                
                // 使用伪随机数生成
                uint256 randomFactor = uint256(keccak256(abi.encodePacked(
                    block.timestamp,
                    block.prevrandao,
                    msg.sender,
                    packet.remainingCount
                ))) % (maxAmount - minAmount);
                
                claimAmount = minAmount + randomFactor;
                
                // 确保不超过剩余金额
                if (claimAmount > packet.remainingAmount) {
                    claimAmount = packet.remainingAmount;
                }
            }
        } else {
            // 固定金额或专属红包
            claimAmount = packet.fixedAmount;
        }
        
        // 更新红包状态
        packet.hasClaimed[msg.sender] = true;
        packet.claims[msg.sender] = claimAmount;
        packet.recipients.push(msg.sender);
        packet.remainingAmount -= claimAmount;
        packet.remainingCount--;
        
        // 记录领取
        uint256 order = packet.totalCount - packet.remainingCount;
        claimRecords[_redPacketId].push(ClaimRecord({
            redPacketId: _redPacketId,
            claimer: msg.sender,
            amount: claimAmount,
            claimedAt: block.timestamp,
            order: order
        }));
        
        userClaimedRedPackets[msg.sender].push(_redPacketId);
        
        // 转账
        payable(msg.sender).transfer(claimAmount);
        
        emit RedPacketClaimed(_redPacketId, msg.sender, claimAmount, order, block.timestamp);
        
        // 检查是否抢完
        if (packet.remainingCount == 0) {
            packet.status = RedPacketStatus.COMPLETED;
            emit RedPacketCompleted(_redPacketId, block.timestamp);
        }
    }
    
    /**
     * @dev 退款过期红包
     */
    function refundExpiredRedPacket(bytes32 _redPacketId) external {
        RedPacket storage packet = redPackets[_redPacketId];
        
        require(packet.sender == msg.sender, "Not sender");
        require(packet.status == RedPacketStatus.ACTIVE, "Red packet not active");
        require(block.timestamp > packet.expireAt, "Not expired yet");
        require(packet.remainingAmount > 0, "No remaining amount");
        
        uint256 refundAmount = packet.remainingAmount;
        packet.remainingAmount = 0;
        packet.status = RedPacketStatus.REFUNDED;
        
        payable(msg.sender).transfer(refundAmount);
        
        emit RedPacketRefunded(_redPacketId, msg.sender, refundAmount, block.timestamp);
        emit RedPacketExpired(_redPacketId, block.timestamp);
    }
    
    /**
     * @dev 获取红包信息
     */
    function getRedPacket(bytes32 _redPacketId) external view returns (
        bytes32 redPacketId,
        string memory groupId,
        address sender,
        RedPacketType packetType,
        uint256 totalAmount,
        uint256 remainingAmount,
        uint256 totalCount,
        uint256 remainingCount,
        uint256 fixedAmount,
        string memory message,
        uint256 createdAt,
        uint256 expireAt,
        RedPacketStatus status
    ) {
        RedPacket storage packet = redPackets[_redPacketId];
        return (
            packet.redPacketId,
            packet.groupId,
            packet.sender,
            packet.packetType,
            packet.totalAmount,
            packet.remainingAmount,
            packet.totalCount,
            packet.remainingCount,
            packet.fixedAmount,
            packet.message,
            packet.createdAt,
            packet.expireAt,
            packet.status
        );
    }
    
    /**
     * @dev 获取用户领取金额
     */
    function getUserClaimAmount(bytes32 _redPacketId, address _user) external view returns (uint256) {
        return redPackets[_redPacketId].claims[_user];
    }
    
    /**
     * @dev 检查用户是否已领取
     */
    function hasUserClaimed(bytes32 _redPacketId, address _user) external view returns (bool) {
        return redPackets[_redPacketId].hasClaimed[_user];
    }
    
    /**
     * @dev 获取红包领取记录
     */
    function getClaimRecords(bytes32 _redPacketId) external view returns (ClaimRecord[] memory) {
        return claimRecords[_redPacketId];
    }
    
    /**
     * @dev 获取群组红包列表
     */
    function getGroupRedPackets(string memory _groupId) external view returns (bytes32[] memory) {
        return groupRedPackets[_groupId];
    }
    
    /**
     * @dev 获取用户发送的红包
     */
    function getUserSentRedPackets(address _user) external view returns (bytes32[] memory) {
        return userSentRedPackets[_user];
    }
    
    /**
     * @dev 获取用户领取的红包
     */
    function getUserClaimedRedPackets(address _user) external view returns (bytes32[] memory) {
        return userClaimedRedPackets[_user];
    }
    
    /**
     * @dev 获取红包领取者列表
     */
    function getRedPacketRecipients(bytes32 _redPacketId) external view returns (address[] memory) {
        return redPackets[_redPacketId].recipients;
    }
    
    /**
     * @dev 获取专属红包接收者列表
     */
    function getExclusiveRecipients(bytes32 _redPacketId) external view returns (address[] memory) {
        return redPackets[_redPacketId].exclusiveRecipients;
    }
    
    /**
     * @dev 检查红包是否可领取
     */
    function isClaimable(bytes32 _redPacketId, address _user) external view returns (bool) {
        RedPacket storage packet = redPackets[_redPacketId];
        
        if (packet.status != RedPacketStatus.ACTIVE) return false;
        if (block.timestamp > packet.expireAt) return false;
        if (packet.remainingCount == 0) return false;
        if (packet.hasClaimed[_user]) return false;
        if (_user == packet.sender) return false;
        
        // 专属红包检查
        if (packet.packetType == RedPacketType.EXCLUSIVE) {
            bool isRecipient = false;
            for (uint256 i = 0; i < packet.exclusiveRecipients.length; i++) {
                if (packet.exclusiveRecipients[i] == _user) {
                    isRecipient = true;
                    break;
                }
            }
            return isRecipient;
        }
        
        return true;
    }
}

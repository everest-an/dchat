// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title GroupPayment
 * @dev 群组支付合约 - 支持群收款、AA收款、众筹
 * @notice 用于群组内的资金管理和分摊
 */
contract GroupPayment {
    
    // 支付类型
    enum PaymentType {
        GROUP_COLLECTION,   // 群收款
        AA_PAYMENT,         // AA收款
        CROWDFUNDING        // 众筹
    }
    
    // 支付状态
    enum PaymentStatus {
        ACTIVE,             // 进行中
        COMPLETED,          // 已完成
        CANCELLED,          // 已取消
        EXPIRED             // 已过期
    }
    
    // 支付信息
    struct Payment {
        bytes32 paymentId;          // 支付ID
        string groupId;             // 群组ID
        address initiator;          // 发起人
        PaymentType paymentType;    // 支付类型
        uint256 totalAmount;        // 总金额
        uint256 collectedAmount;    // 已收集金额
        uint256 targetAmount;       // 目标金额
        uint256 perPersonAmount;    // 每人金额 (AA收款)
        address[] participants;     // 参与者列表
        mapping(address => uint256) contributions;  // 贡献金额
        mapping(address => bool) hasPaid;           // 是否已支付
        string description;         // 描述
        uint256 deadline;           // 截止时间
        PaymentStatus status;       // 状态
        uint256 createdAt;          // 创建时间
        bool fundsWithdrawn;        // 资金是否已提取
    }
    
    // AA收款详情
    struct AAPayment {
        bytes32 paymentId;          // 支付ID
        string groupId;             // 群组ID
        address initiator;          // 发起人
        uint256 totalAmount;        // 总金额
        uint256 perPersonAmount;    // 每人金额
        address[] participants;     // 参与者
        uint256 paidCount;          // 已支付人数
        uint256 collectedAmount;    // 已收集金额
        string description;         // 描述
        uint256 deadline;           // 截止时间
        PaymentStatus status;       // 状态
    }
    
    // 众筹信息
    struct Crowdfunding {
        bytes32 fundingId;          // 众筹ID
        string groupId;             // 群组ID
        address initiator;          // 发起人
        uint256 targetAmount;       // 目标金额
        uint256 collectedAmount;    // 已筹集金额
        uint256 minContribution;    // 最小贡献
        address[] backers;          // 支持者列表
        mapping(address => uint256) contributions;  // 贡献金额
        string title;               // 标题
        string description;         // 描述
        uint256 deadline;           // 截止时间
        PaymentStatus status;       // 状态
        uint256 createdAt;          // 创建时间
        bool fundsWithdrawn;        // 资金是否已提取
    }
    
    // 存储所有支付
    mapping(bytes32 => Payment) public payments;
    
    // 存储所有众筹
    mapping(bytes32 => Crowdfunding) public crowdfundings;
    
    // 群组支付列表 (群组ID => 支付ID列表)
    mapping(string => bytes32[]) public groupPayments;
    
    // 用户参与的支付 (用户地址 => 支付ID列表)
    mapping(address => bytes32[]) public userPayments;
    
    // 支付计数器
    uint256 public paymentCounter;
    
    // 众筹计数器
    uint256 public crowdfundingCounter;
    
    // 事件
    event PaymentCreated(
        bytes32 indexed paymentId,
        string indexed groupId,
        address indexed initiator,
        PaymentType paymentType,
        uint256 amount,
        uint256 timestamp
    );
    
    event PaymentContributed(
        bytes32 indexed paymentId,
        address indexed contributor,
        uint256 amount,
        uint256 timestamp
    );
    
    event PaymentCompleted(
        bytes32 indexed paymentId,
        uint256 totalAmount,
        uint256 timestamp
    );
    
    event PaymentCancelled(
        bytes32 indexed paymentId,
        address indexed cancelledBy,
        uint256 timestamp
    );
    
    event FundsWithdrawn(
        bytes32 indexed paymentId,
        address indexed recipient,
        uint256 amount,
        uint256 timestamp
    );
    
    event CrowdfundingCreated(
        bytes32 indexed fundingId,
        string indexed groupId,
        address indexed initiator,
        uint256 targetAmount,
        uint256 timestamp
    );
    
    event CrowdfundingBacked(
        bytes32 indexed fundingId,
        address indexed backer,
        uint256 amount,
        uint256 timestamp
    );
    
    /**
     * @dev 创建群收款
     */
    function createGroupCollection(
        string memory _groupId,
        uint256 _targetAmount,
        address[] memory _participants,
        string memory _description,
        uint256 _deadline
    ) external returns (bytes32) {
        require(_targetAmount > 0, "Invalid target amount");
        require(_participants.length > 0, "No participants");
        require(_deadline > block.timestamp, "Invalid deadline");
        
        paymentCounter++;
        bytes32 paymentId = keccak256(abi.encodePacked("payment", paymentCounter, block.timestamp));
        
        Payment storage payment = payments[paymentId];
        payment.paymentId = paymentId;
        payment.groupId = _groupId;
        payment.initiator = msg.sender;
        payment.paymentType = PaymentType.GROUP_COLLECTION;
        payment.totalAmount = 0;
        payment.collectedAmount = 0;
        payment.targetAmount = _targetAmount;
        payment.perPersonAmount = 0;
        payment.participants = _participants;
        payment.description = _description;
        payment.deadline = _deadline;
        payment.status = PaymentStatus.ACTIVE;
        payment.createdAt = block.timestamp;
        payment.fundsWithdrawn = false;
        
        groupPayments[_groupId].push(paymentId);
        userPayments[msg.sender].push(paymentId);
        
        emit PaymentCreated(paymentId, _groupId, msg.sender, PaymentType.GROUP_COLLECTION, _targetAmount, block.timestamp);
        
        return paymentId;
    }
    
    /**
     * @dev 创建AA收款
     */
    function createAAPayment(
        string memory _groupId,
        uint256 _totalAmount,
        address[] memory _participants,
        string memory _description,
        uint256 _deadline
    ) external returns (bytes32) {
        require(_totalAmount > 0, "Invalid total amount");
        require(_participants.length > 0, "No participants");
        require(_deadline > block.timestamp, "Invalid deadline");
        
        uint256 perPersonAmount = _totalAmount / _participants.length;
        require(perPersonAmount > 0, "Amount too small");
        
        paymentCounter++;
        bytes32 paymentId = keccak256(abi.encodePacked("aa", paymentCounter, block.timestamp));
        
        Payment storage payment = payments[paymentId];
        payment.paymentId = paymentId;
        payment.groupId = _groupId;
        payment.initiator = msg.sender;
        payment.paymentType = PaymentType.AA_PAYMENT;
        payment.totalAmount = _totalAmount;
        payment.collectedAmount = 0;
        payment.targetAmount = _totalAmount;
        payment.perPersonAmount = perPersonAmount;
        payment.participants = _participants;
        payment.description = _description;
        payment.deadline = _deadline;
        payment.status = PaymentStatus.ACTIVE;
        payment.createdAt = block.timestamp;
        payment.fundsWithdrawn = false;
        
        groupPayments[_groupId].push(paymentId);
        userPayments[msg.sender].push(paymentId);
        
        emit PaymentCreated(paymentId, _groupId, msg.sender, PaymentType.AA_PAYMENT, _totalAmount, block.timestamp);
        
        return paymentId;
    }
    
    /**
     * @dev 贡献支付
     */
    function contribute(bytes32 _paymentId) external payable {
        Payment storage payment = payments[_paymentId];
        require(payment.status == PaymentStatus.ACTIVE, "Payment not active");
        require(block.timestamp <= payment.deadline, "Payment expired");
        require(msg.value > 0, "Invalid amount");
        require(!payment.hasPaid[msg.sender], "Already paid");
        
        // 检查是否为参与者
        bool isParticipant = false;
        for (uint256 i = 0; i < payment.participants.length; i++) {
            if (payment.participants[i] == msg.sender) {
                isParticipant = true;
                break;
            }
        }
        require(isParticipant, "Not a participant");
        
        // AA收款检查金额
        if (payment.paymentType == PaymentType.AA_PAYMENT) {
            require(msg.value == payment.perPersonAmount, "Incorrect amount");
        }
        
        payment.contributions[msg.sender] = msg.value;
        payment.hasPaid[msg.sender] = true;
        payment.collectedAmount += msg.value;
        
        userPayments[msg.sender].push(_paymentId);
        
        emit PaymentContributed(_paymentId, msg.sender, msg.value, block.timestamp);
        
        // 检查是否完成
        if (payment.collectedAmount >= payment.targetAmount) {
            payment.status = PaymentStatus.COMPLETED;
            emit PaymentCompleted(_paymentId, payment.collectedAmount, block.timestamp);
        }
    }
    
    /**
     * @dev 创建众筹
     */
    function createCrowdfunding(
        string memory _groupId,
        uint256 _targetAmount,
        uint256 _minContribution,
        string memory _title,
        string memory _description,
        uint256 _deadline
    ) external returns (bytes32) {
        require(_targetAmount > 0, "Invalid target amount");
        require(_minContribution > 0, "Invalid min contribution");
        require(_deadline > block.timestamp, "Invalid deadline");
        
        crowdfundingCounter++;
        bytes32 fundingId = keccak256(abi.encodePacked("crowdfund", crowdfundingCounter, block.timestamp));
        
        Crowdfunding storage funding = crowdfundings[fundingId];
        funding.fundingId = fundingId;
        funding.groupId = _groupId;
        funding.initiator = msg.sender;
        funding.targetAmount = _targetAmount;
        funding.collectedAmount = 0;
        funding.minContribution = _minContribution;
        funding.title = _title;
        funding.description = _description;
        funding.deadline = _deadline;
        funding.status = PaymentStatus.ACTIVE;
        funding.createdAt = block.timestamp;
        funding.fundsWithdrawn = false;
        
        groupPayments[_groupId].push(fundingId);
        
        emit CrowdfundingCreated(fundingId, _groupId, msg.sender, _targetAmount, block.timestamp);
        
        return fundingId;
    }
    
    /**
     * @dev 支持众筹
     */
    function backCrowdfunding(bytes32 _fundingId) external payable {
        Crowdfunding storage funding = crowdfundings[_fundingId];
        require(funding.status == PaymentStatus.ACTIVE, "Crowdfunding not active");
        require(block.timestamp <= funding.deadline, "Crowdfunding expired");
        require(msg.value >= funding.minContribution, "Below minimum contribution");
        
        if (funding.contributions[msg.sender] == 0) {
            funding.backers.push(msg.sender);
        }
        
        funding.contributions[msg.sender] += msg.value;
        funding.collectedAmount += msg.value;
        
        emit CrowdfundingBacked(_fundingId, msg.sender, msg.value, block.timestamp);
        
        // 检查是否达到目标
        if (funding.collectedAmount >= funding.targetAmount) {
            funding.status = PaymentStatus.COMPLETED;
        }
    }
    
    /**
     * @dev 提取资金 (发起人)
     */
    function withdrawFunds(bytes32 _paymentId) external {
        Payment storage payment = payments[_paymentId];
        require(payment.initiator == msg.sender, "Not initiator");
        require(payment.status == PaymentStatus.COMPLETED, "Payment not completed");
        require(!payment.fundsWithdrawn, "Funds already withdrawn");
        
        payment.fundsWithdrawn = true;
        
        uint256 amount = payment.collectedAmount;
        payable(msg.sender).transfer(amount);
        
        emit FundsWithdrawn(_paymentId, msg.sender, amount, block.timestamp);
    }
    
    /**
     * @dev 提取众筹资金
     */
    function withdrawCrowdfundingFunds(bytes32 _fundingId) external {
        Crowdfunding storage funding = crowdfundings[_fundingId];
        require(funding.initiator == msg.sender, "Not initiator");
        require(funding.status == PaymentStatus.COMPLETED, "Crowdfunding not completed");
        require(!funding.fundsWithdrawn, "Funds already withdrawn");
        
        funding.fundsWithdrawn = true;
        
        uint256 amount = funding.collectedAmount;
        payable(msg.sender).transfer(amount);
        
        emit FundsWithdrawn(_fundingId, msg.sender, amount, block.timestamp);
    }
    
    /**
     * @dev 取消支付 (仅发起人)
     */
    function cancelPayment(bytes32 _paymentId) external {
        Payment storage payment = payments[_paymentId];
        require(payment.initiator == msg.sender, "Not initiator");
        require(payment.status == PaymentStatus.ACTIVE, "Payment not active");
        
        payment.status = PaymentStatus.CANCELLED;
        
        // 退款给所有已支付的参与者
        for (uint256 i = 0; i < payment.participants.length; i++) {
            address participant = payment.participants[i];
            if (payment.hasPaid[participant]) {
                uint256 amount = payment.contributions[participant];
                if (amount > 0) {
                    payable(participant).transfer(amount);
                }
            }
        }
        
        emit PaymentCancelled(_paymentId, msg.sender, block.timestamp);
    }
    
    /**
     * @dev 取消众筹并退款
     */
    function cancelCrowdfunding(bytes32 _fundingId) external {
        Crowdfunding storage funding = crowdfundings[_fundingId];
        require(funding.initiator == msg.sender, "Not initiator");
        require(funding.status == PaymentStatus.ACTIVE, "Crowdfunding not active");
        
        funding.status = PaymentStatus.CANCELLED;
        
        // 退款给所有支持者
        for (uint256 i = 0; i < funding.backers.length; i++) {
            address backer = funding.backers[i];
            uint256 amount = funding.contributions[backer];
            if (amount > 0) {
                payable(backer).transfer(amount);
            }
        }
    }
    
    /**
     * @dev 获取支付信息
     */
    function getPayment(bytes32 _paymentId) external view returns (
        bytes32 paymentId,
        string memory groupId,
        address initiator,
        PaymentType paymentType,
        uint256 totalAmount,
        uint256 collectedAmount,
        uint256 targetAmount,
        uint256 perPersonAmount,
        string memory description,
        uint256 deadline,
        PaymentStatus status
    ) {
        Payment storage payment = payments[_paymentId];
        return (
            payment.paymentId,
            payment.groupId,
            payment.initiator,
            payment.paymentType,
            payment.totalAmount,
            payment.collectedAmount,
            payment.targetAmount,
            payment.perPersonAmount,
            payment.description,
            payment.deadline,
            payment.status
        );
    }
    
    /**
     * @dev 获取用户在支付中的贡献
     */
    function getUserContribution(bytes32 _paymentId, address _user) external view returns (uint256) {
        return payments[_paymentId].contributions[_user];
    }
    
    /**
     * @dev 检查用户是否已支付
     */
    function hasUserPaid(bytes32 _paymentId, address _user) external view returns (bool) {
        return payments[_paymentId].hasPaid[_user];
    }
    
    /**
     * @dev 获取群组支付列表
     */
    function getGroupPayments(string memory _groupId) external view returns (bytes32[] memory) {
        return groupPayments[_groupId];
    }
    
    /**
     * @dev 获取用户参与的支付
     */
    function getUserPayments(address _user) external view returns (bytes32[] memory) {
        return userPayments[_user];
    }
    
    /**
     * @dev 获取众筹信息
     */
    function getCrowdfunding(bytes32 _fundingId) external view returns (
        bytes32 fundingId,
        string memory groupId,
        address initiator,
        uint256 targetAmount,
        uint256 collectedAmount,
        uint256 minContribution,
        string memory title,
        string memory description,
        uint256 deadline,
        PaymentStatus status
    ) {
        Crowdfunding storage funding = crowdfundings[_fundingId];
        return (
            funding.fundingId,
            funding.groupId,
            funding.initiator,
            funding.targetAmount,
            funding.collectedAmount,
            funding.minContribution,
            funding.title,
            funding.description,
            funding.deadline,
            funding.status
        );
    }
    
    /**
     * @dev 获取众筹支持者贡献
     */
    function getCrowdfundingContribution(bytes32 _fundingId, address _backer) external view returns (uint256) {
        return crowdfundings[_fundingId].contributions[_backer];
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PaymentEscrow
 * @dev 聊天内加密货币支付托管合约
 * @notice 支持安全的点对点支付和托管功能
 */
contract PaymentEscrow {
    
    // 支付状态
    enum PaymentStatus {
        Pending,      // 待处理
        Completed,    // 已完成
        Refunded,     // 已退款
        Disputed      // 有争议
    }
    
    // 支付结构
    struct Payment {
        bytes32 paymentId;        // 支付ID
        address sender;           // 发送者
        address recipient;        // 接收者
        uint256 amount;           // 金额
        uint256 createdAt;        // 创建时间
        uint256 completedAt;      // 完成时间
        PaymentStatus status;     // 状态
        string description;       // 描述
        bool isEscrow;           // 是否托管
    }
    
    // 托管结构
    struct Escrow {
        bytes32 escrowId;         // 托管ID
        address payer;            // 付款方
        address payee;            // 收款方
        uint256 amount;           // 金额
        uint256 createdAt;        // 创建时间
        uint256 releaseTime;      // 释放时间
        PaymentStatus status;     // 状态
        string terms;             // 条款
        bool payerApproved;       // 付款方确认
        bool payeeApproved;       // 收款方确认
    }
    
    // 存储所有支付
    mapping(bytes32 => Payment) public payments;
    
    // 存储所有托管
    mapping(bytes32 => Escrow) public escrows;
    
    // 用户的支付历史
    mapping(address => bytes32[]) public userPayments;
    
    // 用户的托管列表
    mapping(address => bytes32[]) public userEscrows;
    
    // 平台费率 (基点, 1% = 100)
    uint256 public platformFee = 50; // 0.5%
    
    // 平台费用累计
    uint256 public collectedFees;
    
    // 合约所有者
    address public owner;
    
    // 事件
    event PaymentCreated(
        bytes32 indexed paymentId,
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        uint256 timestamp
    );
    
    event PaymentCompleted(
        bytes32 indexed paymentId,
        uint256 timestamp
    );
    
    event PaymentRefunded(
        bytes32 indexed paymentId,
        uint256 timestamp
    );
    
    event EscrowCreated(
        bytes32 indexed escrowId,
        address indexed payer,
        address indexed payee,
        uint256 amount,
        uint256 releaseTime
    );
    
    event EscrowReleased(
        bytes32 indexed escrowId,
        uint256 timestamp
    );
    
    event EscrowRefunded(
        bytes32 indexed escrowId,
        uint256 timestamp
    );
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev 创建即时支付
     * @param _recipient 接收者地址
     * @param _description 支付描述
     * @return paymentId 支付ID
     */
    function createPayment(
        address _recipient,
        string memory _description
    ) external payable returns (bytes32) {
        require(_recipient != address(0), "Invalid recipient address");
        require(_recipient != msg.sender, "Cannot pay yourself");
        require(msg.value > 0, "Payment amount must be greater than 0");
        
        // 计算平台费用
        uint256 fee = (msg.value * platformFee) / 10000;
        uint256 netAmount = msg.value - fee;
        
        // 生成支付ID
        bytes32 paymentId = keccak256(
            abi.encodePacked(
                msg.sender,
                _recipient,
                msg.value,
                block.timestamp,
                block.number
            )
        );
        
        // 存储支付信息
        payments[paymentId] = Payment({
            paymentId: paymentId,
            sender: msg.sender,
            recipient: _recipient,
            amount: msg.value,
            createdAt: block.timestamp,
            completedAt: block.timestamp,
            status: PaymentStatus.Completed,
            description: _description,
            isEscrow: false
        });
        
        // 更新用户支付历史
        userPayments[msg.sender].push(paymentId);
        userPayments[_recipient].push(paymentId);
        
        // 累计平台费用
        collectedFees += fee;
        
        // 转账给接收者
        (bool success, ) = _recipient.call{value: netAmount}("");
        require(success, "Transfer failed");
        
        emit PaymentCreated(paymentId, msg.sender, _recipient, msg.value, block.timestamp);
        emit PaymentCompleted(paymentId, block.timestamp);
        
        return paymentId;
    }
    
    /**
     * @dev 创建托管支付
     * @param _payee 收款方地址
     * @param _releaseTime 释放时间 (Unix 时间戳)
     * @param _terms 托管条款
     * @return escrowId 托管ID
     */
    function createEscrow(
        address _payee,
        uint256 _releaseTime,
        string memory _terms
    ) external payable returns (bytes32) {
        require(_payee != address(0), "Invalid payee address");
        require(_payee != msg.sender, "Cannot create escrow with yourself");
        require(msg.value > 0, "Escrow amount must be greater than 0");
        require(_releaseTime > block.timestamp, "Release time must be in the future");
        
        // 生成托管ID
        bytes32 escrowId = keccak256(
            abi.encodePacked(
                msg.sender,
                _payee,
                msg.value,
                _releaseTime,
                block.timestamp
            )
        );
        
        // 存储托管信息
        escrows[escrowId] = Escrow({
            escrowId: escrowId,
            payer: msg.sender,
            payee: _payee,
            amount: msg.value,
            createdAt: block.timestamp,
            releaseTime: _releaseTime,
            status: PaymentStatus.Pending,
            terms: _terms,
            payerApproved: false,
            payeeApproved: false
        });
        
        // 更新用户托管列表
        userEscrows[msg.sender].push(escrowId);
        userEscrows[_payee].push(escrowId);
        
        emit EscrowCreated(escrowId, msg.sender, _payee, msg.value, _releaseTime);
        
        return escrowId;
    }
    
    /**
     * @dev 释放托管资金
     * @param _escrowId 托管ID
     */
    function releaseEscrow(bytes32 _escrowId) external {
        Escrow storage escrow = escrows[_escrowId];
        require(escrow.createdAt > 0, "Escrow does not exist");
        require(escrow.status == PaymentStatus.Pending, "Escrow is not pending");
        require(
            msg.sender == escrow.payer || msg.sender == escrow.payee,
            "Not authorized"
        );
        
        // 标记确认
        if (msg.sender == escrow.payer) {
            escrow.payerApproved = true;
        } else {
            escrow.payeeApproved = true;
        }
        
        // 双方确认或时间到期后释放
        if ((escrow.payerApproved && escrow.payeeApproved) || 
            block.timestamp >= escrow.releaseTime) {
            
            // 计算平台费用
            uint256 fee = (escrow.amount * platformFee) / 10000;
            uint256 netAmount = escrow.amount - fee;
            
            // 更新状态
            escrow.status = PaymentStatus.Completed;
            
            // 累计平台费用
            collectedFees += fee;
            
            // 转账给收款方
            (bool success, ) = escrow.payee.call{value: netAmount}("");
            require(success, "Transfer failed");
            
            emit EscrowReleased(_escrowId, block.timestamp);
        }
    }
    
    /**
     * @dev 退款托管 (仅付款方可调用)
     * @param _escrowId 托管ID
     */
    function refundEscrow(bytes32 _escrowId) external {
        Escrow storage escrow = escrows[_escrowId];
        require(escrow.createdAt > 0, "Escrow does not exist");
        require(escrow.status == PaymentStatus.Pending, "Escrow is not pending");
        require(msg.sender == escrow.payer, "Only payer can request refund");
        require(!escrow.payeeApproved, "Payee already approved");
        
        // 更新状态
        escrow.status = PaymentStatus.Refunded;
        
        // 退款给付款方
        (bool success, ) = escrow.payer.call{value: escrow.amount}("");
        require(success, "Refund failed");
        
        emit EscrowRefunded(_escrowId, block.timestamp);
    }
    
    /**
     * @dev 获取支付详情
     * @param _paymentId 支付ID
     * @return Payment 支付结构
     */
    function getPayment(bytes32 _paymentId) external view returns (Payment memory) {
        Payment memory payment = payments[_paymentId];
        require(payment.createdAt > 0, "Payment does not exist");
        require(
            payment.sender == msg.sender || payment.recipient == msg.sender,
            "Not authorized to view this payment"
        );
        
        return payment;
    }
    
    /**
     * @dev 获取托管详情
     * @param _escrowId 托管ID
     * @return Escrow 托管结构
     */
    function getEscrow(bytes32 _escrowId) external view returns (Escrow memory) {
        Escrow memory escrow = escrows[_escrowId];
        require(escrow.createdAt > 0, "Escrow does not exist");
        require(
            escrow.payer == msg.sender || escrow.payee == msg.sender,
            "Not authorized to view this escrow"
        );
        
        return escrow;
    }
    
    /**
     * @dev 获取用户的支付历史
     * @param _user 用户地址
     * @return bytes32[] 支付ID列表
     */
    function getUserPayments(address _user) external view returns (bytes32[] memory) {
        return userPayments[_user];
    }
    
    /**
     * @dev 获取用户的托管列表
     * @param _user 用户地址
     * @return bytes32[] 托管ID列表
     */
    function getUserEscrows(address _user) external view returns (bytes32[] memory) {
        return userEscrows[_user];
    }
    
    /**
     * @dev 设置平台费率 (仅所有者)
     * @param _newFee 新费率 (基点)
     */
    function setPlatformFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= 1000, "Fee cannot exceed 10%");
        platformFee = _newFee;
    }
    
    /**
     * @dev 提取平台费用 (仅所有者)
     */
    function withdrawFees() external onlyOwner {
        uint256 amount = collectedFees;
        collectedFees = 0;
        
        (bool success, ) = owner.call{value: amount}("");
        require(success, "Withdrawal failed");
    }
    
    /**
     * @dev 获取合约余额
     * @return uint256 余额
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}


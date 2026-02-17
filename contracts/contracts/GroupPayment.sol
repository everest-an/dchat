// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title GroupPayment
 * @dev Group payment contract supporting group collection, AA (split) payments, and crowdfunding.
 * @notice Manages fund collection and distribution within chat groups.
 *
 * Security features:
 *   - ReentrancyGuard on all ETH-transferring functions
 *   - Checks-Effects-Interactions (CEI) pattern enforced
 *   - Pull-payment pattern for refunds (avoids unbounded-loop transfer DoS)
 *   - Pausable for emergency circuit-breaker
 *   - Participant count capped to prevent gas-limit DoS
 */
contract GroupPayment is Ownable, ReentrancyGuard, Pausable {

    // ──────────────────────────── Constants ───────────────────────

    /// @notice Maximum number of participants per payment to prevent gas DoS.
    uint256 public constant MAX_PARTICIPANTS = 200;

    // ──────────────────────────── Enums ───────────────────────────

    enum PaymentType {
        GROUP_COLLECTION,
        AA_PAYMENT,
        CROWDFUNDING
    }

    enum PaymentStatus {
        ACTIVE,
        COMPLETED,
        CANCELLED,
        EXPIRED
    }

    // ──────────────────────────── Structs ─────────────────────────

    struct Payment {
        bytes32 paymentId;
        string groupId;
        address initiator;
        PaymentType paymentType;
        uint256 totalAmount;
        uint256 collectedAmount;
        uint256 targetAmount;
        uint256 perPersonAmount;
        address[] participants;
        mapping(address => uint256) contributions;
        mapping(address => bool) hasPaid;
        string description;
        uint256 deadline;
        PaymentStatus status;
        uint256 createdAt;
        bool fundsWithdrawn;
    }

    struct Crowdfunding {
        bytes32 fundingId;
        string groupId;
        address initiator;
        uint256 targetAmount;
        uint256 collectedAmount;
        uint256 minContribution;
        address[] backers;
        mapping(address => uint256) contributions;
        string title;
        string description;
        uint256 deadline;
        PaymentStatus status;
        uint256 createdAt;
        bool fundsWithdrawn;
    }

    // ──────────────────────────── State ───────────────────────────

    mapping(bytes32 => Payment) public payments;
    mapping(bytes32 => Crowdfunding) public crowdfundings;
    mapping(string => bytes32[]) public groupPayments;
    mapping(address => bytes32[]) public userPayments;

    /// @notice Pull-payment: pending refund balances claimable by users.
    mapping(address => uint256) public pendingRefunds;

    uint256 public paymentCounter;
    uint256 public crowdfundingCounter;

    // ──────────────────────────── Events ──────────────────────────

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

    event PaymentCompleted(bytes32 indexed paymentId, uint256 totalAmount, uint256 timestamp);
    event PaymentCancelled(bytes32 indexed paymentId, address indexed cancelledBy, uint256 timestamp);

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

    event CrowdfundingCancelled(bytes32 indexed fundingId, address indexed cancelledBy, uint256 timestamp);

    event RefundCredited(address indexed user, uint256 amount);
    event RefundWithdrawn(address indexed user, uint256 amount);

    // ──────────────────────────── Constructor ─────────────────────

    constructor() Ownable(msg.sender) {}

    // ──────────────────────────── Group Collection ────────────────

    /**
     * @dev Create a group collection payment.
     * @param _groupId      Chat group identifier.
     * @param _targetAmount Target collection amount.
     * @param _participants Array of participant addresses.
     * @param _description  Human-readable description.
     * @param _deadline     Unix timestamp deadline.
     * @return paymentId    Unique payment identifier.
     */
    function createGroupCollection(
        string calldata _groupId,
        uint256 _targetAmount,
        address[] calldata _participants,
        string calldata _description,
        uint256 _deadline
    ) external whenNotPaused returns (bytes32) {
        require(_targetAmount > 0, "Invalid target amount");
        require(_participants.length > 0 && _participants.length <= MAX_PARTICIPANTS, "Invalid participant count");
        require(_deadline > block.timestamp, "Invalid deadline");

        paymentCounter++;
        bytes32 paymentId = keccak256(abi.encodePacked("payment", paymentCounter, block.timestamp));

        Payment storage payment = payments[paymentId];
        payment.paymentId = paymentId;
        payment.groupId = _groupId;
        payment.initiator = msg.sender;
        payment.paymentType = PaymentType.GROUP_COLLECTION;
        payment.targetAmount = _targetAmount;
        payment.participants = _participants;
        payment.description = _description;
        payment.deadline = _deadline;
        payment.status = PaymentStatus.ACTIVE;
        payment.createdAt = block.timestamp;

        groupPayments[_groupId].push(paymentId);
        userPayments[msg.sender].push(paymentId);

        emit PaymentCreated(paymentId, _groupId, msg.sender, PaymentType.GROUP_COLLECTION, _targetAmount, block.timestamp);

        return paymentId;
    }

    // ──────────────────────────── AA Payment ─────────────────────

    /**
     * @dev Create an AA (split) payment.
     * @param _groupId      Chat group identifier.
     * @param _totalAmount  Total amount to split.
     * @param _participants Array of participant addresses.
     * @param _description  Human-readable description.
     * @param _deadline     Unix timestamp deadline.
     * @return paymentId    Unique payment identifier.
     */
    function createAAPayment(
        string calldata _groupId,
        uint256 _totalAmount,
        address[] calldata _participants,
        string calldata _description,
        uint256 _deadline
    ) external whenNotPaused returns (bytes32) {
        require(_totalAmount > 0, "Invalid total amount");
        require(_participants.length > 0 && _participants.length <= MAX_PARTICIPANTS, "Invalid participant count");
        require(_deadline > block.timestamp, "Invalid deadline");

        uint256 perPerson = _totalAmount / _participants.length;
        require(perPerson > 0, "Amount too small");

        paymentCounter++;
        bytes32 paymentId = keccak256(abi.encodePacked("aa", paymentCounter, block.timestamp));

        Payment storage payment = payments[paymentId];
        payment.paymentId = paymentId;
        payment.groupId = _groupId;
        payment.initiator = msg.sender;
        payment.paymentType = PaymentType.AA_PAYMENT;
        payment.totalAmount = _totalAmount;
        payment.targetAmount = _totalAmount;
        payment.perPersonAmount = perPerson;
        payment.participants = _participants;
        payment.description = _description;
        payment.deadline = _deadline;
        payment.status = PaymentStatus.ACTIVE;
        payment.createdAt = block.timestamp;

        groupPayments[_groupId].push(paymentId);
        userPayments[msg.sender].push(paymentId);

        emit PaymentCreated(paymentId, _groupId, msg.sender, PaymentType.AA_PAYMENT, _totalAmount, block.timestamp);

        return paymentId;
    }

    // ──────────────────────────── Contribute ─────────────────────

    /**
     * @dev Contribute to an active payment.
     * @param _paymentId Payment identifier.
     */
    function contribute(bytes32 _paymentId) external payable nonReentrant whenNotPaused {
        Payment storage payment = payments[_paymentId];
        require(payment.status == PaymentStatus.ACTIVE, "Payment not active");
        require(block.timestamp <= payment.deadline, "Payment expired");
        require(msg.value > 0, "Invalid amount");
        require(!payment.hasPaid[msg.sender], "Already paid");

        // Participant check
        bool isParticipant = false;
        for (uint256 i = 0; i < payment.participants.length; i++) {
            if (payment.participants[i] == msg.sender) {
                isParticipant = true;
                break;
            }
        }
        require(isParticipant, "Not a participant");

        // AA payment requires exact amount
        if (payment.paymentType == PaymentType.AA_PAYMENT) {
            require(msg.value == payment.perPersonAmount, "Incorrect amount");
        }

        // --- Effects ---
        payment.contributions[msg.sender] = msg.value;
        payment.hasPaid[msg.sender] = true;
        payment.collectedAmount += msg.value;
        userPayments[msg.sender].push(_paymentId);

        emit PaymentContributed(_paymentId, msg.sender, msg.value, block.timestamp);

        // Auto-complete when target is reached
        if (payment.collectedAmount >= payment.targetAmount) {
            payment.status = PaymentStatus.COMPLETED;
            emit PaymentCompleted(_paymentId, payment.collectedAmount, block.timestamp);
        }
    }

    // ──────────────────────────── Crowdfunding ───────────────────

    /**
     * @dev Create a crowdfunding campaign.
     * @param _groupId         Chat group identifier.
     * @param _targetAmount    Funding target.
     * @param _minContribution Minimum contribution per backer.
     * @param _title           Campaign title.
     * @param _description     Campaign description.
     * @param _deadline        Unix timestamp deadline.
     * @return fundingId       Unique crowdfunding identifier.
     */
    function createCrowdfunding(
        string calldata _groupId,
        uint256 _targetAmount,
        uint256 _minContribution,
        string calldata _title,
        string calldata _description,
        uint256 _deadline
    ) external whenNotPaused returns (bytes32) {
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
        funding.minContribution = _minContribution;
        funding.title = _title;
        funding.description = _description;
        funding.deadline = _deadline;
        funding.status = PaymentStatus.ACTIVE;
        funding.createdAt = block.timestamp;

        groupPayments[_groupId].push(fundingId);

        emit CrowdfundingCreated(fundingId, _groupId, msg.sender, _targetAmount, block.timestamp);

        return fundingId;
    }

    /**
     * @dev Back a crowdfunding campaign.
     * @param _fundingId Crowdfunding identifier.
     */
    function backCrowdfunding(bytes32 _fundingId) external payable nonReentrant whenNotPaused {
        Crowdfunding storage funding = crowdfundings[_fundingId];
        require(funding.status == PaymentStatus.ACTIVE, "Crowdfunding not active");
        require(block.timestamp <= funding.deadline, "Crowdfunding expired");
        require(msg.value >= funding.minContribution, "Below minimum contribution");

        // --- Effects ---
        if (funding.contributions[msg.sender] == 0) {
            funding.backers.push(msg.sender);
        }

        funding.contributions[msg.sender] += msg.value;
        funding.collectedAmount += msg.value;

        emit CrowdfundingBacked(_fundingId, msg.sender, msg.value, block.timestamp);

        if (funding.collectedAmount >= funding.targetAmount) {
            funding.status = PaymentStatus.COMPLETED;
        }
    }

    // ──────────────────────────── Withdraw Funds ─────────────────

    /**
     * @dev Withdraw collected funds (initiator only, after completion).
     * @param _paymentId Payment identifier.
     */
    function withdrawFunds(bytes32 _paymentId) external nonReentrant whenNotPaused {
        Payment storage payment = payments[_paymentId];
        require(payment.initiator == msg.sender, "Not initiator");
        require(payment.status == PaymentStatus.COMPLETED, "Payment not completed");
        require(!payment.fundsWithdrawn, "Funds already withdrawn");

        // --- Effects ---
        uint256 amount = payment.collectedAmount;
        payment.fundsWithdrawn = true;

        // --- Interactions ---
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        emit FundsWithdrawn(_paymentId, msg.sender, amount, block.timestamp);
    }

    /**
     * @dev Withdraw crowdfunding funds (initiator only, after completion).
     * @param _fundingId Crowdfunding identifier.
     */
    function withdrawCrowdfundingFunds(bytes32 _fundingId) external nonReentrant whenNotPaused {
        Crowdfunding storage funding = crowdfundings[_fundingId];
        require(funding.initiator == msg.sender, "Not initiator");
        require(funding.status == PaymentStatus.COMPLETED, "Crowdfunding not completed");
        require(!funding.fundsWithdrawn, "Funds already withdrawn");

        // --- Effects ---
        uint256 amount = funding.collectedAmount;
        funding.fundsWithdrawn = true;

        // --- Interactions ---
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");

        emit FundsWithdrawn(_fundingId, msg.sender, amount, block.timestamp);
    }

    // ──────────────────────────── Cancel (Pull-Payment Refund) ───

    /**
     * @dev Cancel a payment and credit refunds to participants.
     *      Uses pull-payment pattern: refunds are credited to `pendingRefunds`
     *      and participants call `claimRefund()` to withdraw.
     *      This avoids unbounded-loop transfers that can cause gas-limit DoS.
     * @param _paymentId Payment identifier.
     */
    function cancelPayment(bytes32 _paymentId) external nonReentrant whenNotPaused {
        Payment storage payment = payments[_paymentId];
        require(payment.initiator == msg.sender, "Not initiator");
        require(payment.status == PaymentStatus.ACTIVE, "Payment not active");

        // --- Effects ---
        payment.status = PaymentStatus.CANCELLED;

        // Credit refunds (no external calls in loop)
        for (uint256 i = 0; i < payment.participants.length; i++) {
            address participant = payment.participants[i];
            if (payment.hasPaid[participant]) {
                uint256 amount = payment.contributions[participant];
                if (amount > 0) {
                    payment.contributions[participant] = 0;
                    payment.hasPaid[participant] = false;
                    pendingRefunds[participant] += amount;
                    emit RefundCredited(participant, amount);
                }
            }
        }

        emit PaymentCancelled(_paymentId, msg.sender, block.timestamp);
    }

    /**
     * @dev Cancel a crowdfunding and credit refunds to backers.
     *      Uses pull-payment pattern (same as cancelPayment).
     * @param _fundingId Crowdfunding identifier.
     */
    function cancelCrowdfunding(bytes32 _fundingId) external nonReentrant whenNotPaused {
        Crowdfunding storage funding = crowdfundings[_fundingId];
        require(funding.initiator == msg.sender, "Not initiator");
        require(funding.status == PaymentStatus.ACTIVE, "Crowdfunding not active");

        // --- Effects ---
        funding.status = PaymentStatus.CANCELLED;

        // Credit refunds (no external calls in loop)
        for (uint256 i = 0; i < funding.backers.length; i++) {
            address backer = funding.backers[i];
            uint256 amount = funding.contributions[backer];
            if (amount > 0) {
                funding.contributions[backer] = 0;
                pendingRefunds[backer] += amount;
                emit RefundCredited(backer, amount);
            }
        }

        emit CrowdfundingCancelled(_fundingId, msg.sender, block.timestamp);
    }

    /**
     * @dev Claim pending refund (pull-payment pattern).
     *      Any user with a positive `pendingRefunds` balance can call this.
     */
    function claimRefund() external nonReentrant {
        uint256 amount = pendingRefunds[msg.sender];
        require(amount > 0, "No pending refund");

        // --- Effects ---
        pendingRefunds[msg.sender] = 0;

        // --- Interactions ---
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Refund transfer failed");

        emit RefundWithdrawn(msg.sender, amount);
    }

    // ──────────────────────────── View Functions ─────────────────

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

    function getUserContribution(bytes32 _paymentId, address _user) external view returns (uint256) {
        return payments[_paymentId].contributions[_user];
    }

    function hasUserPaid(bytes32 _paymentId, address _user) external view returns (bool) {
        return payments[_paymentId].hasPaid[_user];
    }

    function getGroupPayments(string calldata _groupId) external view returns (bytes32[] memory) {
        return groupPayments[_groupId];
    }

    function getUserPayments(address _user) external view returns (bytes32[] memory) {
        return userPayments[_user];
    }

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

    function getCrowdfundingContribution(bytes32 _fundingId, address _backer) external view returns (uint256) {
        return crowdfundings[_fundingId].contributions[_backer];
    }

    // ──────────────────────────── Admin ───────────────────────────

    /// @dev Pause the contract (emergency circuit-breaker).
    function pause() external onlyOwner {
        _pause();
    }

    /// @dev Unpause the contract.
    function unpause() external onlyOwner {
        _unpause();
    }
}

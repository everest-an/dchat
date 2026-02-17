// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title PaymentEscrow
 * @dev Secure peer-to-peer payment and escrow contract for in-chat cryptocurrency transfers.
 * @notice Supports instant payments and time-locked escrow with dual-party approval.
 *
 * Security features:
 *   - ReentrancyGuard on every state-mutating function that transfers ETH
 *   - Checks-Effects-Interactions (CEI) pattern enforced throughout
 *   - Pausable for emergency circuit-breaker
 *   - Ownable for admin operations with transferable ownership
 */
contract PaymentEscrow is Ownable, ReentrancyGuard, Pausable {

    // ──────────────────────────── Enums ────────────────────────────

    enum PaymentStatus {
        Pending,
        Completed,
        Refunded,
        Disputed
    }

    // ──────────────────────────── Structs ──────────────────────────

    struct Payment {
        bytes32 paymentId;
        address sender;
        address recipient;
        uint256 amount;
        uint256 createdAt;
        uint256 completedAt;
        PaymentStatus status;
        string description;
        bool isEscrow;
    }

    struct Escrow {
        bytes32 escrowId;
        address payer;
        address payee;
        uint256 amount;
        uint256 createdAt;
        uint256 releaseTime;
        PaymentStatus status;
        string terms;
        bool payerApproved;
        bool payeeApproved;
    }

    // ──────────────────────────── State ────────────────────────────

    mapping(bytes32 => Payment) public payments;
    mapping(bytes32 => Escrow) public escrows;
    mapping(address => bytes32[]) public userPayments;
    mapping(address => bytes32[]) public userEscrows;

    /// @notice Platform fee in basis points (1 bp = 0.01 %).
    uint256 public platformFee = 50; // 0.5 %

    /// @notice Accumulated platform fees available for withdrawal.
    uint256 public collectedFees;

    // ──────────────────────────── Events ───────────────────────────

    event PaymentCreated(
        bytes32 indexed paymentId,
        address indexed sender,
        address indexed recipient,
        uint256 amount,
        uint256 timestamp
    );

    event PaymentCompleted(bytes32 indexed paymentId, uint256 timestamp);
    event PaymentRefunded(bytes32 indexed paymentId, uint256 timestamp);

    event EscrowCreated(
        bytes32 indexed escrowId,
        address indexed payer,
        address indexed payee,
        uint256 amount,
        uint256 releaseTime
    );

    event EscrowApproved(bytes32 indexed escrowId, address indexed approver, uint256 timestamp);
    event EscrowReleased(bytes32 indexed escrowId, uint256 timestamp);
    event EscrowRefunded(bytes32 indexed escrowId, uint256 timestamp);

    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    event FeesWithdrawn(address indexed to, uint256 amount);

    // ──────────────────────────── Constructor ──────────────────────

    constructor() Ownable(msg.sender) {}

    // ──────────────────────────── Instant Payment ─────────────────

    /**
     * @dev Create an instant payment. Funds are transferred to the recipient
     *      immediately (minus platform fee).
     * @param _recipient Recipient address.
     * @param _description Human-readable payment description.
     * @return paymentId Unique payment identifier.
     */
    function createPayment(
        address _recipient,
        string calldata _description
    ) external payable nonReentrant whenNotPaused returns (bytes32) {
        require(_recipient != address(0), "Invalid recipient");
        require(_recipient != msg.sender, "Cannot pay yourself");
        require(msg.value > 0, "Amount must be > 0");

        // --- Checks ---
        uint256 fee = (msg.value * platformFee) / 10000;
        uint256 netAmount = msg.value - fee;

        bytes32 paymentId = keccak256(
            abi.encodePacked(msg.sender, _recipient, msg.value, block.timestamp, block.number)
        );

        // --- Effects ---
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

        userPayments[msg.sender].push(paymentId);
        userPayments[_recipient].push(paymentId);
        collectedFees += fee;

        // --- Interactions ---
        (bool success, ) = _recipient.call{value: netAmount}("");
        require(success, "Transfer failed");

        emit PaymentCreated(paymentId, msg.sender, _recipient, msg.value, block.timestamp);
        emit PaymentCompleted(paymentId, block.timestamp);

        return paymentId;
    }

    // ──────────────────────────── Escrow ───────────────────────────

    /**
     * @dev Create a time-locked escrow. Funds are held until both parties
     *      approve or the release time elapses.
     * @param _payee   Payee (recipient) address.
     * @param _releaseTime Unix timestamp after which funds can be released.
     * @param _terms   Human-readable escrow terms.
     * @return escrowId Unique escrow identifier.
     */
    function createEscrow(
        address _payee,
        uint256 _releaseTime,
        string calldata _terms
    ) external payable nonReentrant whenNotPaused returns (bytes32) {
        require(_payee != address(0), "Invalid payee");
        require(_payee != msg.sender, "Cannot escrow with yourself");
        require(msg.value > 0, "Amount must be > 0");
        require(_releaseTime > block.timestamp, "Release time must be future");

        bytes32 escrowId = keccak256(
            abi.encodePacked(msg.sender, _payee, msg.value, _releaseTime, block.timestamp)
        );

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

        userEscrows[msg.sender].push(escrowId);
        userEscrows[_payee].push(escrowId);

        emit EscrowCreated(escrowId, msg.sender, _payee, msg.value, _releaseTime);

        return escrowId;
    }

    /**
     * @dev Approve and potentially release escrow funds.
     *      Both payer and payee must approve, OR the release time must have passed.
     * @param _escrowId Escrow identifier.
     */
    function releaseEscrow(bytes32 _escrowId) external nonReentrant whenNotPaused {
        Escrow storage escrow = escrows[_escrowId];
        require(escrow.createdAt > 0, "Escrow does not exist");
        require(escrow.status == PaymentStatus.Pending, "Escrow not pending");
        require(
            msg.sender == escrow.payer || msg.sender == escrow.payee,
            "Not authorized"
        );

        // --- Checks ---
        if (msg.sender == escrow.payer) {
            escrow.payerApproved = true;
        } else {
            escrow.payeeApproved = true;
        }

        emit EscrowApproved(_escrowId, msg.sender, block.timestamp);

        bool canRelease = (escrow.payerApproved && escrow.payeeApproved) ||
                          block.timestamp >= escrow.releaseTime;

        if (!canRelease) {
            return; // Approval recorded; waiting for the other party.
        }

        // --- Effects (all state changes BEFORE external call) ---
        uint256 fee = (escrow.amount * platformFee) / 10000;
        uint256 netAmount = escrow.amount - fee;

        escrow.status = PaymentStatus.Completed;
        collectedFees += fee;

        // --- Interactions ---
        (bool success, ) = escrow.payee.call{value: netAmount}("");
        require(success, "Transfer failed");

        emit EscrowReleased(_escrowId, block.timestamp);
    }

    /**
     * @dev Refund escrow to the payer. Only the payer may request a refund,
     *      and only before the payee has approved.
     * @param _escrowId Escrow identifier.
     */
    function refundEscrow(bytes32 _escrowId) external nonReentrant whenNotPaused {
        Escrow storage escrow = escrows[_escrowId];
        require(escrow.createdAt > 0, "Escrow does not exist");
        require(escrow.status == PaymentStatus.Pending, "Escrow not pending");
        require(msg.sender == escrow.payer, "Only payer can refund");
        require(!escrow.payeeApproved, "Payee already approved");

        // --- Effects ---
        uint256 refundAmount = escrow.amount;
        escrow.status = PaymentStatus.Refunded;
        escrow.amount = 0; // Prevent double-refund even with reentrancy guard.

        // --- Interactions ---
        (bool success, ) = escrow.payer.call{value: refundAmount}("");
        require(success, "Refund failed");

        emit EscrowRefunded(_escrowId, block.timestamp);
    }

    // ──────────────────────────── View Functions ──────────────────

    function getPayment(bytes32 _paymentId) external view returns (Payment memory) {
        Payment memory p = payments[_paymentId];
        require(p.createdAt > 0, "Payment does not exist");
        require(p.sender == msg.sender || p.recipient == msg.sender, "Not authorized");
        return p;
    }

    function getEscrow(bytes32 _escrowId) external view returns (Escrow memory) {
        Escrow memory e = escrows[_escrowId];
        require(e.createdAt > 0, "Escrow does not exist");
        require(e.payer == msg.sender || e.payee == msg.sender, "Not authorized");
        return e;
    }

    function getUserPayments(address _user) external view returns (bytes32[] memory) {
        return userPayments[_user];
    }

    function getUserEscrows(address _user) external view returns (bytes32[] memory) {
        return userEscrows[_user];
    }

    // ──────────────────────────── Admin ────────────────────────────

    /**
     * @dev Update the platform fee. Maximum 10 % (1000 bp).
     * @param _newFee New fee in basis points.
     */
    function setPlatformFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= 1000, "Fee cannot exceed 10%");
        emit PlatformFeeUpdated(platformFee, _newFee);
        platformFee = _newFee;
    }

    /**
     * @dev Withdraw accumulated platform fees.
     */
    function withdrawFees() external onlyOwner nonReentrant {
        uint256 amount = collectedFees;
        require(amount > 0, "No fees to withdraw");

        // --- Effects ---
        collectedFees = 0;

        // --- Interactions ---
        (bool success, ) = owner().call{value: amount}("");
        require(success, "Withdrawal failed");

        emit FeesWithdrawn(owner(), amount);
    }

    /// @dev Pause the contract (emergency circuit-breaker).
    function pause() external onlyOwner {
        _pause();
    }

    /// @dev Unpause the contract.
    function unpause() external onlyOwner {
        _unpause();
    }

    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}


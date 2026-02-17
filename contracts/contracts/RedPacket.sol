// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title RedPacket
 * @dev Red-packet (hongbao) contract supporting random, fixed, and exclusive red packets.
 * @notice Used for sending cryptocurrency red packets within chat groups.
 *
 * Security features:
 *   - ReentrancyGuard on all claim and refund functions
 *   - Checks-Effects-Interactions (CEI) pattern enforced
 *   - Pausable for emergency circuit-breaker
 *
 * Randomness note:
 *   On-chain pseudo-randomness (block.prevrandao + msg.sender + nonce) is used for random
 *   red-packet amounts. This is NOT cryptographically secure and can be influenced by
 *   validators. For a production deployment on mainnet, consider integrating Chainlink VRF.
 *   For the social-app use case (small amounts, fun feature), this trade-off is acceptable.
 */
contract RedPacket is Ownable, ReentrancyGuard, Pausable {

    // ──────────────────────────── Enums ───────────────────────────

    enum RedPacketType {
        RANDOM,
        FIXED,
        EXCLUSIVE
    }

    enum RedPacketStatus {
        ACTIVE,
        COMPLETED,
        EXPIRED,
        REFUNDED
    }

    // ──────────────────────────── Structs ─────────────────────────

    struct RedPacketInfo {
        bytes32 redPacketId;
        string groupId;
        address sender;
        RedPacketType packetType;
        uint256 totalAmount;
        uint256 remainingAmount;
        uint256 totalCount;
        uint256 remainingCount;
        uint256 fixedAmount;
        address[] recipients;
        mapping(address => uint256) claims;
        mapping(address => bool) hasClaimed;
        address[] exclusiveRecipients;
        string message;
        uint256 createdAt;
        uint256 expireAt;
        RedPacketStatus status;
    }

    struct ClaimRecord {
        bytes32 redPacketId;
        address claimer;
        uint256 amount;
        uint256 claimedAt;
        uint256 order;
    }

    // ──────────────────────────── Constants ───────────────────────

    uint256 public constant MIN_AMOUNT = 0.001 ether;
    uint256 public constant MAX_COUNT = 100;
    uint256 public constant EXPIRATION_TIME = 24 hours;

    // ──────────────────────────── State ───────────────────────────

    mapping(bytes32 => RedPacketInfo) private _redPackets;
    mapping(string => bytes32[]) public groupRedPackets;
    mapping(address => bytes32[]) public userSentRedPackets;
    mapping(address => bytes32[]) public userClaimedRedPackets;
    mapping(bytes32 => ClaimRecord[]) public claimRecords;

    uint256 public redPacketCounter;

    /// @dev Nonce for pseudo-random number generation, incremented on every claim.
    uint256 private _randomNonce;

    // ──────────────────────────── Events ──────────────────────────

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

    event RedPacketCompleted(bytes32 indexed redPacketId, uint256 timestamp);
    event RedPacketExpired(bytes32 indexed redPacketId, uint256 timestamp);

    event RedPacketRefunded(
        bytes32 indexed redPacketId,
        address indexed sender,
        uint256 amount,
        uint256 timestamp
    );

    // ──────────────────────────── Constructor ─────────────────────

    constructor() Ownable(msg.sender) {}

    // ──────────────────────────── Create Functions ────────────────

    /**
     * @dev Create a random red packet.
     * @param _groupId Chat group identifier.
     * @param _count   Number of red packets.
     * @param _message Greeting message.
     * @return redPacketId Unique identifier.
     */
    function createRandomRedPacket(
        string calldata _groupId,
        uint256 _count,
        string calldata _message
    ) external payable whenNotPaused returns (bytes32) {
        require(msg.value >= MIN_AMOUNT, "Amount too small");
        require(_count > 0 && _count <= MAX_COUNT, "Invalid count");
        require(msg.value >= _count * MIN_AMOUNT, "Amount too small for count");

        bytes32 redPacketId = _createPacket(_groupId, RedPacketType.RANDOM, _count, 0, _message);
        return redPacketId;
    }

    /**
     * @dev Create a fixed-amount red packet.
     * @param _groupId Chat group identifier.
     * @param _count   Number of red packets.
     * @param _message Greeting message.
     * @return redPacketId Unique identifier.
     */
    function createFixedRedPacket(
        string calldata _groupId,
        uint256 _count,
        string calldata _message
    ) external payable whenNotPaused returns (bytes32) {
        require(msg.value >= MIN_AMOUNT, "Amount too small");
        require(_count > 0 && _count <= MAX_COUNT, "Invalid count");
        require(msg.value % _count == 0, "Amount must be divisible by count");

        uint256 fixedAmt = msg.value / _count;
        require(fixedAmt >= MIN_AMOUNT, "Fixed amount too small");

        bytes32 redPacketId = _createPacket(_groupId, RedPacketType.FIXED, _count, fixedAmt, _message);
        return redPacketId;
    }

    /**
     * @dev Create an exclusive red packet for specific recipients.
     * @param _groupId    Chat group identifier.
     * @param _recipients Array of exclusive recipient addresses.
     * @param _message    Greeting message.
     * @return redPacketId Unique identifier.
     */
    function createExclusiveRedPacket(
        string calldata _groupId,
        address[] calldata _recipients,
        string calldata _message
    ) external payable whenNotPaused returns (bytes32) {
        require(msg.value >= MIN_AMOUNT, "Amount too small");
        require(_recipients.length > 0 && _recipients.length <= MAX_COUNT, "Invalid recipients");
        require(msg.value % _recipients.length == 0, "Amount must be divisible by recipients");

        uint256 fixedAmt = msg.value / _recipients.length;
        require(fixedAmt >= MIN_AMOUNT, "Amount per recipient too small");

        redPacketCounter++;
        bytes32 redPacketId = keccak256(
            abi.encodePacked("exclusive", redPacketCounter, block.timestamp, msg.sender)
        );

        RedPacketInfo storage packet = _redPackets[redPacketId];
        packet.redPacketId = redPacketId;
        packet.groupId = _groupId;
        packet.sender = msg.sender;
        packet.packetType = RedPacketType.EXCLUSIVE;
        packet.totalAmount = msg.value;
        packet.remainingAmount = msg.value;
        packet.totalCount = _recipients.length;
        packet.remainingCount = _recipients.length;
        packet.fixedAmount = fixedAmt;
        packet.exclusiveRecipients = _recipients;
        packet.message = _message;
        packet.createdAt = block.timestamp;
        packet.expireAt = block.timestamp + EXPIRATION_TIME;
        packet.status = RedPacketStatus.ACTIVE;

        groupRedPackets[_groupId].push(redPacketId);
        userSentRedPackets[msg.sender].push(redPacketId);

        emit RedPacketCreated(
            redPacketId, _groupId, msg.sender, RedPacketType.EXCLUSIVE,
            msg.value, _recipients.length, block.timestamp
        );

        return redPacketId;
    }

    // ──────────────────────────── Claim ───────────────────────────

    /**
     * @dev Claim a red packet. CEI pattern: all state changes happen before the ETH transfer.
     * @param _redPacketId Red packet identifier.
     */
    function claimRedPacket(bytes32 _redPacketId) external nonReentrant whenNotPaused {
        RedPacketInfo storage packet = _redPackets[_redPacketId];

        require(packet.status == RedPacketStatus.ACTIVE, "Red packet not active");
        require(block.timestamp <= packet.expireAt, "Red packet expired");
        require(packet.remainingCount > 0, "No red packets left");
        require(!packet.hasClaimed[msg.sender], "Already claimed");
        require(msg.sender != packet.sender, "Cannot claim own red packet");

        // Exclusive recipient check
        if (packet.packetType == RedPacketType.EXCLUSIVE) {
            require(_isExclusiveRecipient(packet, msg.sender), "Not an exclusive recipient");
        }

        // Calculate claim amount
        uint256 claimAmount;
        if (packet.packetType == RedPacketType.RANDOM) {
            claimAmount = _calculateRandomAmount(packet.remainingAmount, packet.remainingCount);
        } else {
            claimAmount = packet.fixedAmount;
        }

        // --- Effects (all state changes BEFORE external call) ---
        packet.hasClaimed[msg.sender] = true;
        packet.claims[msg.sender] = claimAmount;
        packet.recipients.push(msg.sender);
        packet.remainingAmount -= claimAmount;
        packet.remainingCount--;

        uint256 order = packet.totalCount - packet.remainingCount;
        claimRecords[_redPacketId].push(ClaimRecord({
            redPacketId: _redPacketId,
            claimer: msg.sender,
            amount: claimAmount,
            claimedAt: block.timestamp,
            order: order
        }));

        userClaimedRedPackets[msg.sender].push(_redPacketId);

        bool isCompleted = (packet.remainingCount == 0);
        if (isCompleted) {
            packet.status = RedPacketStatus.COMPLETED;
        }

        // --- Interactions ---
        (bool success, ) = msg.sender.call{value: claimAmount}("");
        require(success, "Transfer failed");

        emit RedPacketClaimed(_redPacketId, msg.sender, claimAmount, order, block.timestamp);

        if (isCompleted) {
            emit RedPacketCompleted(_redPacketId, block.timestamp);
        }
    }

    // ──────────────────────────── Refund ──────────────────────────

    /**
     * @dev Refund remaining balance of an expired red packet to the sender.
     * @param _redPacketId Red packet identifier.
     */
    function refundExpiredRedPacket(bytes32 _redPacketId) external nonReentrant {
        RedPacketInfo storage packet = _redPackets[_redPacketId];

        require(packet.sender == msg.sender, "Not sender");
        require(packet.status == RedPacketStatus.ACTIVE, "Red packet not active");
        require(block.timestamp > packet.expireAt, "Not expired yet");
        require(packet.remainingAmount > 0, "No remaining amount");

        // --- Effects ---
        uint256 refundAmount = packet.remainingAmount;
        packet.remainingAmount = 0;
        packet.status = RedPacketStatus.REFUNDED;

        // --- Interactions ---
        (bool success, ) = msg.sender.call{value: refundAmount}("");
        require(success, "Refund failed");

        emit RedPacketRefunded(_redPacketId, msg.sender, refundAmount, block.timestamp);
        emit RedPacketExpired(_redPacketId, block.timestamp);
    }

    // ──────────────────────────── View Functions ─────────────────

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
        RedPacketInfo storage packet = _redPackets[_redPacketId];
        return (
            packet.redPacketId, packet.groupId, packet.sender,
            packet.packetType, packet.totalAmount, packet.remainingAmount,
            packet.totalCount, packet.remainingCount, packet.fixedAmount,
            packet.message, packet.createdAt, packet.expireAt, packet.status
        );
    }

    function getUserClaimAmount(bytes32 _redPacketId, address _user) external view returns (uint256) {
        return _redPackets[_redPacketId].claims[_user];
    }

    function hasUserClaimed(bytes32 _redPacketId, address _user) external view returns (bool) {
        return _redPackets[_redPacketId].hasClaimed[_user];
    }

    function getClaimRecords(bytes32 _redPacketId) external view returns (ClaimRecord[] memory) {
        return claimRecords[_redPacketId];
    }

    function getGroupRedPackets(string calldata _groupId) external view returns (bytes32[] memory) {
        return groupRedPackets[_groupId];
    }

    function getUserSentRedPackets(address _user) external view returns (bytes32[] memory) {
        return userSentRedPackets[_user];
    }

    function getUserClaimedRedPackets(address _user) external view returns (bytes32[] memory) {
        return userClaimedRedPackets[_user];
    }

    function getRedPacketRecipients(bytes32 _redPacketId) external view returns (address[] memory) {
        return _redPackets[_redPacketId].recipients;
    }

    function getExclusiveRecipients(bytes32 _redPacketId) external view returns (address[] memory) {
        return _redPackets[_redPacketId].exclusiveRecipients;
    }

    function isClaimable(bytes32 _redPacketId, address _user) external view returns (bool) {
        RedPacketInfo storage packet = _redPackets[_redPacketId];

        if (packet.status != RedPacketStatus.ACTIVE) return false;
        if (block.timestamp > packet.expireAt) return false;
        if (packet.remainingCount == 0) return false;
        if (packet.hasClaimed[_user]) return false;
        if (_user == packet.sender) return false;

        if (packet.packetType == RedPacketType.EXCLUSIVE) {
            return _isExclusiveRecipient(packet, _user);
        }

        return true;
    }

    // ──────────────────────────── Admin ───────────────────────────

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ──────────────────────────── Internal ────────────────────────

    /**
     * @dev Shared logic for creating RANDOM and FIXED red packets.
     */
    function _createPacket(
        string calldata _groupId,
        RedPacketType _type,
        uint256 _count,
        uint256 _fixedAmount,
        string calldata _message
    ) internal returns (bytes32) {
        redPacketCounter++;
        bytes32 redPacketId = keccak256(
            abi.encodePacked(
                _type == RedPacketType.RANDOM ? "redpacket" : "fixed",
                redPacketCounter,
                block.timestamp,
                msg.sender
            )
        );

        RedPacketInfo storage packet = _redPackets[redPacketId];
        packet.redPacketId = redPacketId;
        packet.groupId = _groupId;
        packet.sender = msg.sender;
        packet.packetType = _type;
        packet.totalAmount = msg.value;
        packet.remainingAmount = msg.value;
        packet.totalCount = _count;
        packet.remainingCount = _count;
        packet.fixedAmount = _fixedAmount;
        packet.message = _message;
        packet.createdAt = block.timestamp;
        packet.expireAt = block.timestamp + EXPIRATION_TIME;
        packet.status = RedPacketStatus.ACTIVE;

        groupRedPackets[_groupId].push(redPacketId);
        userSentRedPackets[msg.sender].push(redPacketId);

        emit RedPacketCreated(
            redPacketId, _groupId, msg.sender, _type,
            msg.value, _count, block.timestamp
        );

        return redPacketId;
    }

    /**
     * @dev Calculate a pseudo-random claim amount for random red packets.
     *      Uses an incrementing nonce to make each call produce a different result
     *      even within the same block.
     * @param remaining Total remaining amount in the red packet.
     * @param count     Number of remaining red packets.
     * @return amount   The calculated claim amount.
     */
    function _calculateRandomAmount(uint256 remaining, uint256 count) internal returns (uint256) {
        if (count == 1) {
            return remaining;
        }

        _randomNonce++;

        uint256 maxAmount = (remaining * 2) / count;
        uint256 minAmount = remaining / (count * 10);
        if (minAmount < MIN_AMOUNT / 10) {
            minAmount = MIN_AMOUNT / 10;
        }
        if (maxAmount <= minAmount) {
            return minAmount;
        }

        uint256 randomFactor = uint256(
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    block.prevrandao,
                    msg.sender,
                    count,
                    _randomNonce
                )
            )
        ) % (maxAmount - minAmount);

        uint256 amount = minAmount + randomFactor;

        // Safety cap: never exceed remaining
        if (amount > remaining) {
            amount = remaining;
        }

        return amount;
    }

    /**
     * @dev Check if an address is in the exclusive recipients list.
     */
    function _isExclusiveRecipient(
        RedPacketInfo storage packet,
        address _user
    ) internal view returns (bool) {
        for (uint256 i = 0; i < packet.exclusiveRecipients.length; i++) {
            if (packet.exclusiveRecipients[i] == _user) {
                return true;
            }
        }
        return false;
    }
}

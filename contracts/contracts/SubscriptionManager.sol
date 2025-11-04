// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title SubscriptionManager
 * @dev Manages user subscriptions with crypto payments and NFT membership cards
 * 
 * Features:
 * - Three subscription tiers: Free, Pro, Enterprise
 * - Monthly/yearly subscriptions with crypto payment (ETH, USDT, USDC)
 * - NFT membership cards for lifetime access
 * - Auto-renewal support
 * - Refund mechanism
 * - Subscription analytics
 * 
 * @author Manus AI
 * @notice This contract handles all subscription-related operations
 */
contract SubscriptionManager is Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    
    // Subscription tiers
    enum SubscriptionTier {
        FREE,      // Free tier (default)
        PRO,       // Pro tier ($4.99/month)
        ENTERPRISE // Enterprise tier ($19.99/month)
    }
    
    // Subscription duration
    enum SubscriptionDuration {
        MONTHLY,  // 30 days
        YEARLY    // 365 days
    }
    
    // Subscription status
    enum SubscriptionStatus {
        ACTIVE,
        EXPIRED,
        CANCELLED,
        REFUNDED
    }
    
    // Subscription structure
    struct Subscription {
        uint256 id;
        address user;
        SubscriptionTier tier;
        SubscriptionDuration duration;
        SubscriptionStatus status;
        uint256 startTime;
        uint256 endTime;
        uint256 amount;
        address paymentToken; // Address(0) for ETH
        bool autoRenew;
        uint256 createdAt;
    }
    
    // NFT Membership Card structure
    struct NFTMembership {
        uint256 tokenId;
        address owner;
        SubscriptionTier tier;
        uint256 mintedAt;
        bool active;
    }
    
    // Pricing structure (in wei for ETH, or token decimals for ERC20)
    struct Pricing {
        uint256 monthlyPrice;
        uint256 yearlyPrice;
        uint256 nftPrice; // One-time NFT membership price
    }
    
    // State variables
    Counters.Counter private _subscriptionIdCounter;
    Counters.Counter private _nftTokenIdCounter;
    
    // Subscription ID => Subscription
    mapping(uint256 => Subscription) public subscriptions;
    
    // User address => Current subscription ID
    mapping(address => uint256) public userSubscriptions;
    
    // User address => Subscription tier
    mapping(address => SubscriptionTier) public userTiers;
    
    // NFT token ID => NFT Membership
    mapping(uint256 => NFTMembership) public nftMemberships;
    
    // User address => NFT token ID
    mapping(address => uint256) public userNFTMemberships;
    
    // Tier => Pricing
    mapping(SubscriptionTier => Pricing) public pricing;
    
    // Supported payment tokens (address(0) for ETH)
    mapping(address => bool) public supportedTokens;
    
    // Total revenue by token
    mapping(address => uint256) public totalRevenue;
    
    // Events
    event SubscriptionCreated(
        uint256 indexed subscriptionId,
        address indexed user,
        SubscriptionTier tier,
        SubscriptionDuration duration,
        uint256 amount
    );
    
    event SubscriptionRenewed(
        uint256 indexed subscriptionId,
        address indexed user,
        uint256 newEndTime
    );
    
    event SubscriptionCancelled(
        uint256 indexed subscriptionId,
        address indexed user
    );
    
    event SubscriptionRefunded(
        uint256 indexed subscriptionId,
        address indexed user,
        uint256 refundAmount
    );
    
    event NFTMembershipMinted(
        uint256 indexed tokenId,
        address indexed owner,
        SubscriptionTier tier
    );
    
    event NFTMembershipTransferred(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to
    );
    
    event PricingUpdated(
        SubscriptionTier tier,
        uint256 monthlyPrice,
        uint256 yearlyPrice,
        uint256 nftPrice
    );
    
    event PaymentTokenAdded(address indexed token);
    event PaymentTokenRemoved(address indexed token);
    
    /**
     * @dev Constructor
     */
    constructor() {
        // Initialize pricing (in wei for ETH)
        // Pro: $4.99/month, $49.99/year, $199 NFT
        // Enterprise: $19.99/month, $199.99/year, $999 NFT
        // Assuming 1 ETH = $2000, adjust prices accordingly
        
        // Pro tier (0.0025 ETH/month ≈ $5)
        pricing[SubscriptionTier.PRO] = Pricing({
            monthlyPrice: 0.0025 ether,
            yearlyPrice: 0.025 ether,  // ~17% discount
            nftPrice: 0.1 ether        // ~$200
        });
        
        // Enterprise tier (0.01 ETH/month ≈ $20)
        pricing[SubscriptionTier.ENTERPRISE] = Pricing({
            monthlyPrice: 0.01 ether,
            yearlyPrice: 0.1 ether,    // ~17% discount
            nftPrice: 0.5 ether        // ~$1000
        });
        
        // Support ETH by default
        supportedTokens[address(0)] = true;
    }
    
    /**
     * @dev Subscribe to a tier
     * @param tier Subscription tier
     * @param duration Subscription duration
     * @param paymentToken Payment token address (address(0) for ETH)
     * @param autoRenew Enable auto-renewal
     */
    function subscribe(
        SubscriptionTier tier,
        SubscriptionDuration duration,
        address paymentToken,
        bool autoRenew
    ) external payable nonReentrant {
        require(tier != SubscriptionTier.FREE, "Cannot subscribe to FREE tier");
        require(supportedTokens[paymentToken], "Payment token not supported");
        
        // Get pricing
        Pricing memory price = pricing[tier];
        uint256 amount = duration == SubscriptionDuration.MONTHLY 
            ? price.monthlyPrice 
            : price.yearlyPrice;
        
        // Process payment
        if (paymentToken == address(0)) {
            // ETH payment
            require(msg.value == amount, "Incorrect payment amount");
        } else {
            // ERC20 payment
            require(msg.value == 0, "ETH not accepted for token payment");
            IERC20(paymentToken).transferFrom(msg.sender, address(this), amount);
        }
        
        // Calculate subscription period
        uint256 durationDays = duration == SubscriptionDuration.MONTHLY ? 30 : 365;
        uint256 endTime = block.timestamp + (durationDays * 1 days);
        
        // Cancel existing subscription if any
        uint256 existingSubId = userSubscriptions[msg.sender];
        if (existingSubId != 0) {
            subscriptions[existingSubId].status = SubscriptionStatus.CANCELLED;
        }
        
        // Create new subscription
        _subscriptionIdCounter.increment();
        uint256 newSubId = _subscriptionIdCounter.current();
        
        subscriptions[newSubId] = Subscription({
            id: newSubId,
            user: msg.sender,
            tier: tier,
            duration: duration,
            status: SubscriptionStatus.ACTIVE,
            startTime: block.timestamp,
            endTime: endTime,
            amount: amount,
            paymentToken: paymentToken,
            autoRenew: autoRenew,
            createdAt: block.timestamp
        });
        
        userSubscriptions[msg.sender] = newSubId;
        userTiers[msg.sender] = tier;
        
        // Update revenue
        totalRevenue[paymentToken] += amount;
        
        emit SubscriptionCreated(newSubId, msg.sender, tier, duration, amount);
    }
    
    /**
     * @dev Mint NFT membership card for lifetime access
     * @param tier Subscription tier
     * @param paymentToken Payment token address (address(0) for ETH)
     */
    function mintNFTMembership(
        SubscriptionTier tier,
        address paymentToken
    ) external payable nonReentrant {
        require(tier != SubscriptionTier.FREE, "Cannot mint FREE tier NFT");
        require(supportedTokens[paymentToken], "Payment token not supported");
        require(userNFTMemberships[msg.sender] == 0, "Already owns NFT membership");
        
        // Get pricing
        uint256 amount = pricing[tier].nftPrice;
        
        // Process payment
        if (paymentToken == address(0)) {
            require(msg.value == amount, "Incorrect payment amount");
        } else {
            require(msg.value == 0, "ETH not accepted for token payment");
            IERC20(paymentToken).transferFrom(msg.sender, address(this), amount);
        }
        
        // Mint NFT
        _nftTokenIdCounter.increment();
        uint256 tokenId = _nftTokenIdCounter.current();
        
        nftMemberships[tokenId] = NFTMembership({
            tokenId: tokenId,
            owner: msg.sender,
            tier: tier,
            mintedAt: block.timestamp,
            active: true
        });
        
        userNFTMemberships[msg.sender] = tokenId;
        userTiers[msg.sender] = tier;
        
        // Update revenue
        totalRevenue[paymentToken] += amount;
        
        emit NFTMembershipMinted(tokenId, msg.sender, tier);
    }
    
    /**
     * @dev Renew subscription (manual or auto)
     * @param subscriptionId Subscription ID to renew
     */
    function renewSubscription(uint256 subscriptionId) external payable nonReentrant {
        Subscription storage sub = subscriptions[subscriptionId];
        require(sub.user == msg.sender, "Not subscription owner");
        require(sub.status == SubscriptionStatus.ACTIVE, "Subscription not active");
        
        // Get pricing
        Pricing memory price = pricing[sub.tier];
        uint256 amount = sub.duration == SubscriptionDuration.MONTHLY 
            ? price.monthlyPrice 
            : price.yearlyPrice;
        
        // Process payment
        if (sub.paymentToken == address(0)) {
            require(msg.value == amount, "Incorrect payment amount");
        } else {
            require(msg.value == 0, "ETH not accepted for token payment");
            IERC20(sub.paymentToken).transferFrom(msg.sender, address(this), amount);
        }
        
        // Extend subscription
        uint256 durationDays = sub.duration == SubscriptionDuration.MONTHLY ? 30 : 365;
        sub.endTime = sub.endTime + (durationDays * 1 days);
        
        // Update revenue
        totalRevenue[sub.paymentToken] += amount;
        
        emit SubscriptionRenewed(subscriptionId, msg.sender, sub.endTime);
    }
    
    /**
     * @dev Cancel subscription
     * @param subscriptionId Subscription ID to cancel
     */
    function cancelSubscription(uint256 subscriptionId) external {
        Subscription storage sub = subscriptions[subscriptionId];
        require(sub.user == msg.sender, "Not subscription owner");
        require(sub.status == SubscriptionStatus.ACTIVE, "Subscription not active");
        
        sub.status = SubscriptionStatus.CANCELLED;
        sub.autoRenew = false;
        
        emit SubscriptionCancelled(subscriptionId, msg.sender);
    }
    
    /**
     * @dev Request refund (within 7 days of subscription start)
     * @param subscriptionId Subscription ID to refund
     */
    function requestRefund(uint256 subscriptionId) external nonReentrant {
        Subscription storage sub = subscriptions[subscriptionId];
        require(sub.user == msg.sender, "Not subscription owner");
        require(sub.status == SubscriptionStatus.ACTIVE, "Subscription not active");
        require(block.timestamp <= sub.startTime + 7 days, "Refund period expired");
        
        // Calculate refund amount (100% within 7 days)
        uint256 refundAmount = sub.amount;
        
        // Update subscription status
        sub.status = SubscriptionStatus.REFUNDED;
        userTiers[msg.sender] = SubscriptionTier.FREE;
        
        // Process refund
        if (sub.paymentToken == address(0)) {
            payable(msg.sender).transfer(refundAmount);
        } else {
            IERC20(sub.paymentToken).transfer(msg.sender, refundAmount);
        }
        
        // Update revenue
        totalRevenue[sub.paymentToken] -= refundAmount;
        
        emit SubscriptionRefunded(subscriptionId, msg.sender, refundAmount);
    }
    
    /**
     * @dev Transfer NFT membership to another user
     * @param tokenId NFT token ID
     * @param to Recipient address
     */
    function transferNFTMembership(uint256 tokenId, address to) external {
        NFTMembership storage nft = nftMemberships[tokenId];
        require(nft.owner == msg.sender, "Not NFT owner");
        require(nft.active, "NFT not active");
        require(to != address(0), "Invalid recipient");
        require(userNFTMemberships[to] == 0, "Recipient already owns NFT");
        
        // Transfer ownership
        address from = msg.sender;
        nft.owner = to;
        
        // Update mappings
        userNFTMemberships[from] = 0;
        userNFTMemberships[to] = tokenId;
        userTiers[from] = SubscriptionTier.FREE;
        userTiers[to] = nft.tier;
        
        emit NFTMembershipTransferred(tokenId, from, to);
    }
    
    /**
     * @dev Get user's current subscription tier
     * @param user User address
     * @return Current subscription tier
     */
    function getUserTier(address user) external view returns (SubscriptionTier) {
        // Check NFT membership first (lifetime access)
        uint256 nftTokenId = userNFTMemberships[user];
        if (nftTokenId != 0 && nftMemberships[nftTokenId].active) {
            return nftMemberships[nftTokenId].tier;
        }
        
        // Check regular subscription
        uint256 subId = userSubscriptions[user];
        if (subId != 0) {
            Subscription memory sub = subscriptions[subId];
            if (sub.status == SubscriptionStatus.ACTIVE && block.timestamp <= sub.endTime) {
                return sub.tier;
            }
        }
        
        return SubscriptionTier.FREE;
    }
    
    /**
     * @dev Check if user has active subscription
     * @param user User address
     * @return True if user has active subscription
     */
    function hasActiveSubscription(address user) external view returns (bool) {
        SubscriptionTier tier = this.getUserTier(user);
        return tier != SubscriptionTier.FREE;
    }
    
    /**
     * @dev Get subscription details
     * @param subscriptionId Subscription ID
     * @return Subscription details
     */
    function getSubscription(uint256 subscriptionId) external view returns (Subscription memory) {
        return subscriptions[subscriptionId];
    }
    
    /**
     * @dev Get NFT membership details
     * @param tokenId NFT token ID
     * @return NFT membership details
     */
    function getNFTMembership(uint256 tokenId) external view returns (NFTMembership memory) {
        return nftMemberships[tokenId];
    }
    
    /**
     * @dev Update pricing (owner only)
     * @param tier Subscription tier
     * @param monthlyPrice Monthly price
     * @param yearlyPrice Yearly price
     * @param nftPrice NFT membership price
     */
    function updatePricing(
        SubscriptionTier tier,
        uint256 monthlyPrice,
        uint256 yearlyPrice,
        uint256 nftPrice
    ) external onlyOwner {
        require(tier != SubscriptionTier.FREE, "Cannot set pricing for FREE tier");
        
        pricing[tier] = Pricing({
            monthlyPrice: monthlyPrice,
            yearlyPrice: yearlyPrice,
            nftPrice: nftPrice
        });
        
        emit PricingUpdated(tier, monthlyPrice, yearlyPrice, nftPrice);
    }
    
    /**
     * @dev Add supported payment token (owner only)
     * @param token Token address (address(0) for ETH)
     */
    function addPaymentToken(address token) external onlyOwner {
        supportedTokens[token] = true;
        emit PaymentTokenAdded(token);
    }
    
    /**
     * @dev Remove supported payment token (owner only)
     * @param token Token address
     */
    function removePaymentToken(address token) external onlyOwner {
        require(token != address(0), "Cannot remove ETH");
        supportedTokens[token] = false;
        emit PaymentTokenRemoved(token);
    }
    
    /**
     * @dev Withdraw funds (owner only)
     * @param token Token address (address(0) for ETH)
     * @param amount Amount to withdraw
     */
    function withdraw(address token, uint256 amount) external onlyOwner nonReentrant {
        if (token == address(0)) {
            payable(owner()).transfer(amount);
        } else {
            IERC20(token).transfer(owner(), amount);
        }
    }
    
    /**
     * @dev Get total subscription count
     * @return Total subscriptions
     */
    function getTotalSubscriptions() external view returns (uint256) {
        return _subscriptionIdCounter.current();
    }
    
    /**
     * @dev Get total NFT memberships count
     * @return Total NFT memberships
     */
    function getTotalNFTMemberships() external view returns (uint256) {
        return _nftTokenIdCounter.current();
    }
}

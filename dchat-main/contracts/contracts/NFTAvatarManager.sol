// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title NFTAvatarManager
 * @dev Manages NFT avatars for user profiles
 * 
 * Features:
 * - Users can set any NFT they own as their avatar
 * - Supports ERC-721 and ERC-1155 NFTs
 * - Automatic ownership verification
 * - NFT avatar history tracking
 * - Whitelist/blacklist for NFT collections
 * 
 * @author Manus AI
 * @notice This contract allows users to showcase their NFTs as profile avatars
 */
contract NFTAvatarManager is Ownable {
    
    // NFT standard types
    enum NFTStandard {
        ERC721,
        ERC1155
    }
    
    // NFT Avatar structure
    struct NFTAvatar {
        address contractAddress;
        uint256 tokenId;
        NFTStandard standard;
        uint256 setAt;
    }
    
    // User address => Current NFT avatar
    mapping(address => NFTAvatar) public userAvatars;
    
    // User address => Avatar history
    mapping(address => NFTAvatar[]) public userAvatarHistory;
    
    // NFT contract address => Is whitelisted
    mapping(address => bool) public whitelistedCollections;
    
    // NFT contract address => Is blacklisted
    mapping(address => bool) public blacklistedCollections;
    
    // Whether whitelist is enabled (if false, all collections allowed except blacklisted)
    bool public whitelistEnabled;
    
    // Events
    event AvatarSet(
        address indexed user,
        address indexed nftContract,
        uint256 tokenId,
        NFTStandard standard
    );
    
    event AvatarRemoved(address indexed user);
    
    event CollectionWhitelisted(address indexed nftContract);
    event CollectionRemovedFromWhitelist(address indexed nftContract);
    event CollectionBlacklisted(address indexed nftContract);
    event CollectionRemovedFromBlacklist(address indexed nftContract);
    event WhitelistToggled(bool enabled);
    
    /**
     * @dev Constructor
     */
    constructor() Ownable(msg.sender) {
        whitelistEnabled = false; // Allow all collections by default
    }
    
    /**
     * @dev Set NFT as avatar (ERC-721)
     * @param nftContract NFT contract address
     * @param tokenId Token ID
     */
    function setAvatarERC721(address nftContract, uint256 tokenId) external {
        require(!blacklistedCollections[nftContract], "Collection is blacklisted");
        if (whitelistEnabled) {
            require(whitelistedCollections[nftContract], "Collection not whitelisted");
        }
        
        // Verify ownership
        IERC721 nft = IERC721(nftContract);
        require(nft.ownerOf(tokenId) == msg.sender, "Not NFT owner");
        
        // Set avatar
        NFTAvatar memory newAvatar = NFTAvatar({
            contractAddress: nftContract,
            tokenId: tokenId,
            standard: NFTStandard.ERC721,
            setAt: block.timestamp
        });
        
        userAvatars[msg.sender] = newAvatar;
        userAvatarHistory[msg.sender].push(newAvatar);
        
        emit AvatarSet(msg.sender, nftContract, tokenId, NFTStandard.ERC721);
    }
    
    /**
     * @dev Set NFT as avatar (ERC-1155)
     * @param nftContract NFT contract address
     * @param tokenId Token ID
     */
    function setAvatarERC1155(address nftContract, uint256 tokenId) external {
        require(!blacklistedCollections[nftContract], "Collection is blacklisted");
        if (whitelistEnabled) {
            require(whitelistedCollections[nftContract], "Collection not whitelisted");
        }
        
        // Verify ownership (at least 1 token)
        IERC1155 nft = IERC1155(nftContract);
        require(nft.balanceOf(msg.sender, tokenId) > 0, "Not NFT owner");
        
        // Set avatar
        NFTAvatar memory newAvatar = NFTAvatar({
            contractAddress: nftContract,
            tokenId: tokenId,
            standard: NFTStandard.ERC1155,
            setAt: block.timestamp
        });
        
        userAvatars[msg.sender] = newAvatar;
        userAvatarHistory[msg.sender].push(newAvatar);
        
        emit AvatarSet(msg.sender, nftContract, tokenId, NFTStandard.ERC1155);
    }
    
    /**
     * @dev Remove current NFT avatar
     */
    function removeAvatar() external {
        delete userAvatars[msg.sender];
        emit AvatarRemoved(msg.sender);
    }
    
    /**
     * @dev Get user's current NFT avatar
     * @param user User address
     * @return NFT avatar details
     */
    function getUserAvatar(address user) external view returns (NFTAvatar memory) {
        return userAvatars[user];
    }
    
    /**
     * @dev Verify if user still owns the NFT avatar
     * @param user User address
     * @return True if user still owns the NFT
     */
    function verifyAvatarOwnership(address user) external view returns (bool) {
        NFTAvatar memory avatar = userAvatars[user];
        
        // No avatar set
        if (avatar.contractAddress == address(0)) {
            return false;
        }
        
        // Check ownership based on standard
        if (avatar.standard == NFTStandard.ERC721) {
            IERC721 nft = IERC721(avatar.contractAddress);
            try nft.ownerOf(avatar.tokenId) returns (address owner) {
                return owner == user;
            } catch {
                return false;
            }
        } else {
            IERC1155 nft = IERC1155(avatar.contractAddress);
            try nft.balanceOf(user, avatar.tokenId) returns (uint256 balance) {
                return balance > 0;
            } catch {
                return false;
            }
        }
    }
    
    /**
     * @dev Get user's avatar history
     * @param user User address
     * @return Array of past avatars
     */
    function getUserAvatarHistory(address user) external view returns (NFTAvatar[] memory) {
        return userAvatarHistory[user];
    }
    
    /**
     * @dev Get avatar history count
     * @param user User address
     * @return Number of avatars in history
     */
    function getAvatarHistoryCount(address user) external view returns (uint256) {
        return userAvatarHistory[user].length;
    }
    
    /**
     * @dev Whitelist NFT collection (owner only)
     * @param nftContract NFT contract address
     */
    function whitelistCollection(address nftContract) external onlyOwner {
        whitelistedCollections[nftContract] = true;
        emit CollectionWhitelisted(nftContract);
    }
    
    /**
     * @dev Remove collection from whitelist (owner only)
     * @param nftContract NFT contract address
     */
    function removeFromWhitelist(address nftContract) external onlyOwner {
        whitelistedCollections[nftContract] = false;
        emit CollectionRemovedFromWhitelist(nftContract);
    }
    
    /**
     * @dev Blacklist NFT collection (owner only)
     * @param nftContract NFT contract address
     */
    function blacklistCollection(address nftContract) external onlyOwner {
        blacklistedCollections[nftContract] = true;
        emit CollectionBlacklisted(nftContract);
    }
    
    /**
     * @dev Remove collection from blacklist (owner only)
     * @param nftContract NFT contract address
     */
    function removeFromBlacklist(address nftContract) external onlyOwner {
        blacklistedCollections[nftContract] = false;
        emit CollectionRemovedFromBlacklist(nftContract);
    }
    
    /**
     * @dev Toggle whitelist mode (owner only)
     * @param enabled True to enable whitelist, false to allow all (except blacklisted)
     */
    function toggleWhitelist(bool enabled) external onlyOwner {
        whitelistEnabled = enabled;
        emit WhitelistToggled(enabled);
    }
    
    /**
     * @dev Batch whitelist collections (owner only)
     * @param nftContracts Array of NFT contract addresses
     */
    function batchWhitelist(address[] calldata nftContracts) external onlyOwner {
        for (uint256 i = 0; i < nftContracts.length; i++) {
            whitelistedCollections[nftContracts[i]] = true;
            emit CollectionWhitelisted(nftContracts[i]);
        }
    }
    
    /**
     * @dev Batch blacklist collections (owner only)
     * @param nftContracts Array of NFT contract addresses
     */
    function batchBlacklist(address[] calldata nftContracts) external onlyOwner {
        for (uint256 i = 0; i < nftContracts.length; i++) {
            blacklistedCollections[nftContracts[i]] = true;
            emit CollectionBlacklisted(nftContracts[i]);
        }
    }
}

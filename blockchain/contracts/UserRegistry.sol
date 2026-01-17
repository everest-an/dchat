// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title UserRegistry
 * @dev User registration and public key management for Dchat
 * Stores user profiles and encryption public keys on-chain
 */
contract UserRegistry {
    
    struct UserProfile {
        address walletAddress;
        string username;
        string publicKey;         // RSA public key for encryption
        string profileIPFS;       // IPFS hash for additional profile data
        uint256 registeredAt;
        bool isActive;
    }
    
    // Mapping from wallet address to user profile
    mapping(address => UserProfile) private users;
    
    // Mapping from username to wallet address (for username uniqueness)
    mapping(string => address) private usernameToAddress;
    
    // Array of all registered user addresses
    address[] private userAddresses;
    
    // Events
    event UserRegistered(
        address indexed userAddress,
        string username,
        string publicKey,
        uint256 timestamp
    );
    
    event UserUpdated(
        address indexed userAddress,
        string username,
        string publicKey
    );
    
    /**
     * @dev Register a new user
     * @param _username Unique username
     * @param _publicKey RSA public key for end-to-end encryption
     * @param _profileIPFS IPFS hash for additional profile data
     */
    function registerUser(
        string memory _username,
        string memory _publicKey,
        string memory _profileIPFS
    ) external {
        require(bytes(_username).length > 0, "Username cannot be empty");
        require(bytes(_username).length <= 32, "Username too long");
        require(bytes(_publicKey).length > 0, "Public key cannot be empty");
        require(!users[msg.sender].isActive, "User already registered");
        require(
            usernameToAddress[_username] == address(0),
            "Username already taken"
        );
        
        UserProfile memory newUser = UserProfile({
            walletAddress: msg.sender,
            username: _username,
            publicKey: _publicKey,
            profileIPFS: _profileIPFS,
            registeredAt: block.timestamp,
            isActive: true
        });
        
        users[msg.sender] = newUser;
        usernameToAddress[_username] = msg.sender;
        userAddresses.push(msg.sender);
        
        emit UserRegistered(
            msg.sender,
            _username,
            _publicKey,
            block.timestamp
        );
    }
    
    /**
     * @dev Get user profile by wallet address
     * @param _userAddress Wallet address of the user
     * @return UserProfile struct
     */
    function getUser(address _userAddress) 
        external 
        view 
        returns (UserProfile memory) 
    {
        require(users[_userAddress].isActive, "User not found or inactive");
        return users[_userAddress];
    }
    
    /**
     * @dev Get user public key by wallet address
     * @param _userAddress Wallet address of the user
     * @return Public key string
     */
    function getPublicKey(address _userAddress) 
        external 
        view 
        returns (string memory) 
    {
        require(users[_userAddress].isActive, "User not found or inactive");
        return users[_userAddress].publicKey;
    }
    
    /**
     * @dev Check if user is registered
     * @param _userAddress Wallet address to check
     * @return True if registered and active
     */
    function isUserRegistered(address _userAddress) 
        external 
        view 
        returns (bool) 
    {
        return users[_userAddress].isActive;
    }
}


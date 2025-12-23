// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MessageStorage
 * @dev Decentralized message storage contract for Dchat
 * Stores encrypted message metadata on-chain, actual content on IPFS
 */
contract MessageStorage {
    
    struct Message {
        address sender;
        address receiver;
        bytes32 contentHash;      // Hash of encrypted content
        string ipfsHash;          // IPFS CID for encrypted message
        uint256 timestamp;
        bool isDeleted;
    }
    
    // Mapping from user address to their messages (sent + received)
    mapping(address => uint256[]) private userMessageIds;
    
    // All messages stored
    Message[] private messages;
    
    // Events
    event MessageStored(
        uint256 indexed messageId,
        address indexed sender,
        address indexed receiver,
        bytes32 contentHash,
        string ipfsHash,
        uint256 timestamp
    );
    
    event MessageDeleted(uint256 indexed messageId, address indexed deleter);
    
    /**
     * @dev Store a new encrypted message
     * @param _receiver Address of the message receiver
     * @param _contentHash Hash of the encrypted message content
     * @param _ipfsHash IPFS CID where encrypted message is stored
     * @return messageId The ID of the stored message
     */
    function storeMessage(
        address _receiver,
        bytes32 _contentHash,
        string memory _ipfsHash
    ) external returns (uint256) {
        require(_receiver != address(0), "Invalid receiver address");
        require(_receiver != msg.sender, "Cannot send message to yourself");
        require(bytes(_ipfsHash).length > 0, "IPFS hash cannot be empty");
        require(_contentHash != bytes32(0), "Content hash cannot be empty");
        
        uint256 messageId = messages.length;
        
        Message memory newMessage = Message({
            sender: msg.sender,
            receiver: _receiver,
            contentHash: _contentHash,
            ipfsHash: _ipfsHash,
            timestamp: block.timestamp,
            isDeleted: false
        });
        
        messages.push(newMessage);
        userMessageIds[msg.sender].push(messageId);
        userMessageIds[_receiver].push(messageId);
        
        emit MessageStored(
            messageId,
            msg.sender,
            _receiver,
            _contentHash,
            _ipfsHash,
            block.timestamp
        );
        
        return messageId;
    }
    
    /**
     * @dev Get all message IDs for a user
     * @param _user Address of the user
     * @return Array of message IDs
     */
    function getUserMessageIds(address _user) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return userMessageIds[_user];
    }
    
    /**
     * @dev Get message details by ID
     * @param _messageId ID of the message
     * @return Message struct
     */
    function getMessage(uint256 _messageId) 
        external 
        view 
        returns (Message memory) 
    {
        require(_messageId < messages.length, "Message does not exist");
        Message memory message = messages[_messageId];
        
        // Only sender or receiver can view the message
        require(
            msg.sender == message.sender || 
            msg.sender == message.receiver,
            "Not authorized to view this message"
        );
        
        return message;
    }
    
    /**
     * @dev Get conversation between two users
     * @param _user1 First user address
     * @param _user2 Second user address
     * @return Array of message IDs in the conversation
     */
    function getConversation(address _user1, address _user2) 
        external 
        view 
        returns (uint256[] memory) 
    {
        require(
            msg.sender == _user1 || msg.sender == _user2,
            "Not authorized to view this conversation"
        );
        
        uint256[] memory user1Messages = userMessageIds[_user1];
        uint256 count = 0;
        
        // First pass: count matching messages
        for (uint256 i = 0; i < user1Messages.length; i++) {
            Message memory message = messages[user1Messages[i]];
            if ((message.sender == _user1 && message.receiver == _user2) ||
                (message.sender == _user2 && message.receiver == _user1)) {
                count++;
            }
        }
        
        // Second pass: collect matching message IDs
        uint256[] memory conversation = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < user1Messages.length; i++) {
            Message memory message = messages[user1Messages[i]];
            if ((message.sender == _user1 && message.receiver == _user2) ||
                (message.sender == _user2 && message.receiver == _user1)) {
                conversation[index] = user1Messages[i];
                index++;
            }
        }
        
        return conversation;
    }
}


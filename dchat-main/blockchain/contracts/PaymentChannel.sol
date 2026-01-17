// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PaymentChannel
 * @dev Simple payment channel for in-chat cryptocurrency payments
 * Allows users to send ETH directly within conversations
 */
contract PaymentChannel {
    
    struct Payment {
        address sender;
        address receiver;
        uint256 amount;
        uint256 timestamp;
        string message;           // Optional payment message
        bool isCompleted;
    }
    
    // All payments
    Payment[] private payments;
    
    // Mapping from user address to their payment IDs (sent + received)
    mapping(address => uint256[]) private userPayments;
    
    // Events
    event PaymentSent(
        uint256 indexed paymentId,
        address indexed sender,
        address indexed receiver,
        uint256 amount,
        string message,
        uint256 timestamp
    );
    
    /**
     * @dev Send payment to another user
     * @param _receiver Address of the payment receiver
     * @param _message Optional message with the payment
     */
    function sendPayment(address _receiver, string memory _message) 
        external 
        payable 
    {
        require(_receiver != address(0), "Invalid receiver address");
        require(_receiver != msg.sender, "Cannot send payment to yourself");
        require(msg.value > 0, "Payment amount must be greater than 0");
        
        // Create payment record
        uint256 paymentId = payments.length;
        
        Payment memory newPayment = Payment({
            sender: msg.sender,
            receiver: _receiver,
            amount: msg.value,
            timestamp: block.timestamp,
            message: _message,
            isCompleted: true
        });
        
        payments.push(newPayment);
        userPayments[msg.sender].push(paymentId);
        userPayments[_receiver].push(paymentId);
        
        // Transfer to receiver
        (bool success, ) = _receiver.call{value: msg.value}("");
        require(success, "Payment transfer failed");
        
        emit PaymentSent(
            paymentId,
            msg.sender,
            _receiver,
            msg.value,
            _message,
            block.timestamp
        );
    }
    
    /**
     * @dev Get payment details by ID
     * @param _paymentId ID of the payment
     * @return Payment struct
     */
    function getPayment(uint256 _paymentId) 
        external 
        view 
        returns (Payment memory) 
    {
        require(_paymentId < payments.length, "Payment does not exist");
        Payment memory payment = payments[_paymentId];
        
        // Only sender or receiver can view
        require(
            msg.sender == payment.sender || 
            msg.sender == payment.receiver,
            "Not authorized to view this payment"
        );
        
        return payment;
    }
    
    /**
     * @dev Get all payment IDs for a user
     * @param _user Address of the user
     * @return Array of payment IDs
     */
    function getUserPayments(address _user) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return userPayments[_user];
    }
    
    /**
     * @dev Receive function to accept ETH
     */
    receive() external payable {}
}


# Frontend Integration Guide

This document explains how to integrate the new Web3 services and components into your dchat.pro frontend application.

## Table of Contents

1. [Services Overview](#services-overview)
2. [Authentication](#authentication)
3. [Group Chat](#group-chat)
4. [Payments and Red Packets](#payments-and-red-packets)
5. [Real-time Communication](#real-time-communication)
6. [File Upload](#file-upload)
7. [Best Practices](#best-practices)

---

## Services Overview

### Available Services

| Service | File | Purpose |
|---------|------|---------|
| `Web3AuthService` | `services/Web3AuthService.js` | Wallet authentication with signature verification |
| `Web3GroupService` | `services/Web3GroupService.js` | Group management (create, join, invite, leave) |
| `Web3PaymentService` | `services/Web3PaymentService.js` | Group payments and red packets |
| `socketService` | `services/socketService.js` | Real-time messaging via Socket.IO |
| `EncryptionService` | `services/EncryptionService.js` | End-to-end encryption (RSA + AES) |
| `IPFSService` | `services/IPFSService.js` | File upload to IPFS via Pinata |

### Service Initialization

```javascript
import { Web3AuthService } from './services/Web3AuthService';
import { Web3GroupService } from './services/Web3GroupService';
import { Web3PaymentService } from './services/Web3PaymentService';
import { socketService } from './services/socketService';

// Initialize services
const authService = new Web3AuthService();
const groupService = new Web3GroupService();
const paymentService = new Web3PaymentService();

// Socket.IO is a singleton, use directly
socketService.connect(userAddress);
```

---

## Authentication

### Web3 Wallet Authentication

#### 1. Request Nonce

```javascript
import { Web3AuthService } from './services/Web3AuthService';

const authService = new Web3AuthService();

// Get nonce for signing
const nonceResponse = await authService.getNonce(walletAddress);

if (nonceResponse.success) {
  const { nonce, message } = nonceResponse;
  console.log('Sign this message:', message);
}
```

#### 2. Sign Message with MetaMask

```javascript
import { ethers } from 'ethers';

// Connect to MetaMask
const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();

// Sign the message
const signature = await signer.signMessage(message);
```

#### 3. Verify Signature and Login

```javascript
const loginResponse = await authService.verifySignature(
  walletAddress,
  signature
);

if (loginResponse.success) {
  const { token, user } = loginResponse;
  
  // Store token
  localStorage.setItem('auth_token', token);
  localStorage.setItem('wallet_address', user.wallet_address);
  
  console.log('Logged in as:', user.name);
}
```

#### Complete Login Flow

```javascript
async function loginWithWallet() {
  try {
    // 1. Connect MetaMask
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send('eth_requestAccounts', []);
    const signer = provider.getSigner();
    const address = await signer.getAddress();
    
    // 2. Get nonce
    const nonceResponse = await authService.getNonce(address);
    if (!nonceResponse.success) {
      throw new Error(nonceResponse.error);
    }
    
    // 3. Sign message
    const signature = await signer.signMessage(nonceResponse.message);
    
    // 4. Verify and login
    const loginResponse = await authService.verifySignature(address, signature);
    if (!loginResponse.success) {
      throw new Error(loginResponse.error);
    }
    
    // 5. Store credentials
    localStorage.setItem('auth_token', loginResponse.token);
    localStorage.setItem('wallet_address', loginResponse.user.wallet_address);
    
    return loginResponse.user;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}
```

---

## Group Chat

### Create a Group

```javascript
import { Web3GroupService } from './services/Web3GroupService';

const groupService = new Web3GroupService();

const response = await groupService.createGroup({
  name: 'My Group',
  description: 'A cool group for friends',
  is_public: false,
  max_members: 100
});

if (response.success) {
  const { group_id, tx_hash } = response;
  console.log('Group created:', group_id);
  console.log('Transaction:', tx_hash);
}
```

### Get User's Groups

```javascript
const response = await groupService.getUserGroups(userAddress);

if (response.success) {
  const groups = response.groups;
  
  groups.forEach(group => {
    console.log(`${group.name} (${group.member_count} members)`);
  });
}
```

### Join a Group

```javascript
const response = await groupService.joinGroup(groupId);

if (response.success) {
  console.log('Joined group successfully!');
  
  // Join Socket.IO room for real-time updates
  socketService.joinRoom(groupId);
}
```

### Invite Member

```javascript
const response = await groupService.inviteMember(groupId, memberAddress);

if (response.success) {
  console.log('Member invited!');
}
```

### Leave Group

```javascript
const response = await groupService.leaveGroup(groupId);

if (response.success) {
  console.log('Left group successfully!');
  
  // Leave Socket.IO room
  socketService.leaveRoom(groupId);
}
```

### Get Group Members

```javascript
const response = await groupService.getGroupMembers(groupId);

if (response.success) {
  const members = response.members;
  
  members.forEach(member => {
    console.log(`${member.address} - ${member.role}`);
  });
}
```

---

## Payments and Red Packets

### Group Collection (AA Payment)

```javascript
import { Web3PaymentService } from './services/Web3PaymentService';

const paymentService = new Web3PaymentService();

// Create AA payment
const response = await paymentService.createAAPayment({
  group_id: groupId,
  total_amount: '1.0',  // ETH
  description: 'Dinner bill',
  deadline: Math.floor(Date.now() / 1000) + 86400  // 24 hours
});

if (response.success) {
  const { payment_id, amount_per_person } = response;
  console.log('AA Payment created:', payment_id);
  console.log('Amount per person:', amount_per_person, 'ETH');
}
```

### Contribute to AA Payment

```javascript
const response = await paymentService.contributeToPayment(
  paymentId,
  '0.5'  // ETH amount
);

if (response.success) {
  console.log('Contribution successful!');
  console.log('Transaction:', response.tx_hash);
}
```

### Create Random Red Packet

```javascript
const response = await paymentService.createRandomRedPacket({
  group_id: groupId,
  total_amount: '0.1',  // ETH
  count: 10,  // 10 red packets
  message: 'Happy New Year! 🧧'
});

if (response.success) {
  const { packet_id, tx_hash } = response;
  console.log('Red packet created:', packet_id);
}
```

### Claim Red Packet

```javascript
const response = await paymentService.claimRedPacket(packetId);

if (response.success) {
  const { amount, tx_hash } = response;
  console.log('Claimed:', amount, 'ETH');
}
```

### Get Red Packet Details

```javascript
const response = await paymentService.getRedPacketDetails(packetId);

if (response.success) {
  const packet = response.packet;
  
  console.log('Total:', packet.total_amount);
  console.log('Claimed:', packet.claimed_count, '/', packet.total_count);
  console.log('Remaining:', packet.remaining_amount);
}
```

---

## Real-time Communication

### Connect to Socket.IO

```javascript
import { socketService } from './services/socketService';

// Connect with user ID
socketService.connect(userAddress);

// Check connection status
if (socketService.connected) {
  console.log('Connected to Socket.IO server');
}
```

### Join a Chat Room

```javascript
socketService.joinRoom(roomId);
```

### Send a Message

```javascript
const messageId = socketService.sendMessage(
  roomId,
  'Hello, world!',
  'optional-message-id'
);
```

### Listen for New Messages

```javascript
const unsubscribe = socketService.onMessage((data) => {
  console.log('New message:', data.message);
  console.log('From:', data.user_id);
  console.log('Room:', data.room_id);
  
  // Mark as delivered
  socketService.markMessageDelivered(data.message_id, data.room_id);
  
  // Mark as read (if user is viewing)
  if (document.hasFocus()) {
    socketService.markMessageRead(data.message_id, data.room_id);
  }
});

// Cleanup when component unmounts
return () => unsubscribe();
```

### Listen for Message Status

```javascript
const unsubscribe = socketService.onMessageStatus((data) => {
  console.log('Message status:', data.status);  // 'delivered', 'read', 'all_read'
  console.log('Message ID:', data.message_id);
  
  // Update UI to show checkmarks
  updateMessageStatus(data.message_id, data.status);
});
```

### Typing Indicators

```javascript
// Start typing
socketService.startTyping(roomId);

// Stop typing
socketService.stopTyping(roomId);

// Listen for typing
const unsubscribe = socketService.onTyping((data) => {
  if (data.typing) {
    console.log(data.user_id, 'is typing...');
  } else {
    console.log(data.user_id, 'stopped typing');
  }
});
```

### Get Online Users

```javascript
const onlineUsers = await socketService.getOnlineUsers();
console.log('Online users:', onlineUsers);
```

### Disconnect

```javascript
socketService.disconnect();
```

---

## File Upload

### Upload File to IPFS

```javascript
import { IPFSService } from './services/IPFSService';

const ipfsService = new IPFSService();

// Upload file
const file = document.querySelector('input[type="file"]').files[0];

const response = await ipfsService.uploadFile(file, {
  onProgress: (progress) => {
    console.log('Upload progress:', progress, '%');
  }
});

if (response.success) {
  const { ipfs_hash, url } = response;
  console.log('IPFS Hash:', ipfs_hash);
  console.log('URL:', url);
}
```

### Download File

```javascript
const response = await ipfsService.downloadFile(ipfsHash);

if (response.success) {
  const blob = response.blob;
  
  // Create download link
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'filename.ext';
  a.click();
}
```

---

## Best Practices

### 1. Error Handling

Always check `response.success` and handle errors:

```javascript
const response = await groupService.createGroup(groupData);

if (response.success) {
  // Success
  console.log('Group created:', response.group_id);
} else {
  // Error
  console.error('Error:', response.error);
  alert('Failed to create group: ' + response.error);
}
```

### 2. Loading States

Show loading indicators during async operations:

```javascript
const [loading, setLoading] = useState(false);

const handleCreateGroup = async () => {
  setLoading(true);
  try {
    const response = await groupService.createGroup(groupData);
    // Handle response
  } catch (error) {
    console.error(error);
  } finally {
    setLoading(false);
  }
};
```

### 3. Cleanup Socket.IO Listeners

Always unsubscribe from Socket.IO events when component unmounts:

```javascript
useEffect(() => {
  const unsubscribeMessage = socketService.onMessage(handleMessage);
  const unsubscribeStatus = socketService.onMessageStatus(handleStatus);
  
  return () => {
    unsubscribeMessage();
    unsubscribeStatus();
  };
}, []);
```

### 4. Optimistic UI Updates

Update UI immediately, then sync with backend:

```javascript
const sendMessage = async (message) => {
  // 1. Add to local state immediately
  setMessages(prev => [...prev, {
    id: tempId,
    message: message,
    status: 'sending'
  }]);
  
  // 2. Send to server
  const response = await socketService.sendMessage(roomId, message);
  
  // 3. Update status
  if (response.success) {
    updateMessageStatus(tempId, 'sent');
  } else {
    updateMessageStatus(tempId, 'failed');
  }
};
```

### 5. Token Management

Store and use authentication tokens:

```javascript
// Store token after login
localStorage.setItem('auth_token', token);

// Use token in API requests (automatically handled by services)
const token = localStorage.getItem('auth_token');
```

### 6. Wallet Connection

Check if wallet is connected before operations:

```javascript
const checkWalletConnection = async () => {
  if (!window.ethereum) {
    alert('Please install MetaMask!');
    return false;
  }
  
  const accounts = await window.ethereum.request({
    method: 'eth_accounts'
  });
  
  if (accounts.length === 0) {
    alert('Please connect your wallet!');
    return false;
  }
  
  return true;
};
```

### 7. Network Validation

Ensure user is on the correct network:

```javascript
const SEPOLIA_CHAIN_ID = '0xaa36a7';  // 11155111 in hex

const checkNetwork = async () => {
  const chainId = await window.ethereum.request({
    method: 'eth_chainId'
  });
  
  if (chainId !== SEPOLIA_CHAIN_ID) {
    // Request network switch
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SEPOLIA_CHAIN_ID }]
    });
  }
};
```

---

## Example Components

See the `src/examples/` directory for complete example components:

- `GroupChatExample.jsx` - Full group chat implementation
- `RedPacketExample.jsx` - Red packet creation and claiming
- `AAPaymentExample.jsx` - AA payment (split bill) implementation

---

## Troubleshooting

### Socket.IO Not Connecting

1. Check `VITE_SOCKET_URL` environment variable
2. Verify backend Socket.IO server is running
3. Check browser console for errors
4. Ensure CORS is configured correctly

### Transactions Failing

1. Check wallet has sufficient ETH for gas
2. Verify correct network (Sepolia testnet)
3. Check contract addresses in `contracts.js`
4. Ensure wallet is connected

### API Requests Failing

1. Check authentication token is valid
2. Verify backend API is running
3. Check browser console for errors
4. Ensure CORS is configured correctly

---

## References

- [Web3.js Documentation](https://web3js.readthedocs.io/)
- [ethers.js Documentation](https://docs.ethers.org/)
- [Socket.IO Client Documentation](https://socket.io/docs/v4/client-api/)
- [MetaMask Documentation](https://docs.metamask.io/)

---

**Last Updated**: 2024-11-05  
**Author**: Manus AI  
**Version**: 1.0

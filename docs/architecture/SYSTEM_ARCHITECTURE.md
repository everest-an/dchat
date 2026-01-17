# System Architecture

> **Version**: 1.0.0  
> **Last Updated**: October 30, 2025  
> **Status**: Production

## Table of Contents
- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Architecture Layers](#architecture-layers)
- [Data Flow](#data-flow)
- [Service Architecture](#service-architecture)
- [Storage Architecture](#storage-architecture)
- [Security Architecture](#security-architecture)
- [Scalability](#scalability)

---

## Overview

Dchat is built on a modern, scalable architecture that combines Web3 technologies with traditional web development best practices. The system is designed for decentralization, security, and performance.

### Design Principles

1. **Decentralization**: Data stored on IPFS and blockchain
2. **Security**: End-to-end encryption and Web3 authentication
3. **Performance**: Optimized for speed and responsiveness
4. **Scalability**: Designed to handle growth
5. **Maintainability**: Clean code and clear separation of concerns

---

## Technology Stack

### Frontend

**Core Framework**:
- **React 18**: UI framework with hooks and concurrent features
- **Vite**: Fast build tool and dev server
- **JavaScript ES6+**: Modern JavaScript with async/await

**Styling**:
- **TailwindCSS**: Utility-first CSS framework
- **CSS Modules**: Scoped component styles
- **Responsive Design**: Mobile-first approach

**UI Components**:
- **Lucide Icons**: Modern icon library
- **Custom Components**: Built from scratch for full control

**State Management**:
- **React Context**: Global state management
- **Custom Hooks**: Reusable stateful logic
- **localStorage**: Client-side persistence

### Backend Services

**Service Layer**:
- **GroupService**: Group management (900+ lines)
- **GroupMessageService**: Messaging system (600+ lines)
- **UserProfileService**: User management
- **IPFSService**: Decentralized storage

**Storage**:
- **localStorage**: Local data persistence
- **IPFS (Pinata)**: Decentralized file storage
- **Blockchain**: (Planned) On-chain data

### Infrastructure

**Hosting**:
- **Vercel**: Frontend hosting and serverless functions
- **Pinata**: IPFS pinning service
- **Custom Domain**: www.dchat.pro

**Development**:
- **Git**: Version control
- **GitHub**: Code repository
- **npm**: Package management

---

## Architecture Layers

### 1. Presentation Layer

**Responsibility**: User interface and user experience

**Components**:
```
src/components/
├── ChatList.jsx              # Chat list view
├── ChatRoom.jsx              # One-on-one chat
├── GroupChat.jsx             # Group chat interface
├── AvatarUpload.jsx          # Avatar upload component
└── dialogs/
    ├── CreateGroupDialog.jsx
    ├── EditProfileDialog.jsx
    └── GroupSettingsDialog.jsx
```

**Features**:
- Responsive design
- Real-time updates
- Drag & drop support
- Multi-language support

### 2. Business Logic Layer

**Responsibility**: Application logic and data processing

**Services**:
```
src/services/
├── GroupService.js           # Group management
├── GroupMessageService.js    # Message handling
├── UserProfileService.js     # User profiles
└── ipfsService.js            # IPFS operations
```

**Features**:
- Data validation
- Business rules enforcement
- Permission checking
- Error handling

### 3. Data Access Layer

**Responsibility**: Data storage and retrieval

**Storage Types**:
- **localStorage**: Fast local access
- **IPFS**: Decentralized storage
- **Blockchain**: (Planned) Immutable records

**Data Models**:
- User profiles
- Groups
- Messages
- Files

### 4. Infrastructure Layer

**Responsibility**: External services and APIs

**Services**:
- **Pinata API**: IPFS pinning
- **Web3 Providers**: Blockchain interaction
- **Vercel**: Hosting and deployment

---

## Data Flow

### User Authentication Flow

```
User opens app
    ↓
Select login method (Web3/Email/Phone/Alipay)
    ↓
Authenticate with provider
    ↓
Generate/retrieve wallet address
    ↓
Load user profile from localStorage
    ↓
If no profile, create new profile
    ↓
Store session in context
    ↓
Redirect to chat list
```

### Message Sending Flow

```
User types message
    ↓
Click send button
    ↓
Validate message content
    ↓
Create message object
    ↓
Upload to IPFS (via Pinata)
    ↓
Get IPFS hash
    ↓
Save message to localStorage
    ↓
Update UI
    ↓
(Future) Broadcast to other users
```

### File Upload Flow

```
User selects file
    ↓
Validate file (type, size)
    ↓
Show preview
    ↓
User confirms upload
    ↓
Upload to IPFS
    ↓
Get IPFS hash and gateway URL
    ↓
Create file message
    ↓
Save to localStorage
    ↓
Display in chat
```

---

## Service Architecture

### GroupService

**Purpose**: Manage group lifecycle and membership

**Architecture**:
```
GroupService
├── Group CRUD
│   ├── createGroup()
│   ├── updateGroup()
│   ├── deleteGroup()
│   └── getGroup()
├── Member Management
│   ├── addMember()
│   ├── removeMember()
│   ├── promoteMember()
│   └── demoteMember()
├── Permission System
│   ├── isAdmin()
│   ├── isMember()
│   └── canPerformAction()
└── IPFS Integration
    ├── uploadGroupData()
    └── getGroupFromIPFS()
```

**Data Storage**:
- localStorage key: `groups`
- IPFS: Group metadata
- Future: Blockchain smart contract

### GroupMessageService

**Purpose**: Handle all message operations

**Architecture**:
```
GroupMessageService
├── Message CRUD
│   ├── sendMessage()
│   ├── editMessage()
│   ├── deleteMessage()
│   └── getMessages()
├── File Messages
│   ├── sendFileMessage()
│   └── uploadFileToIPFS()
├── Message Reactions
│   ├── addReaction()
│   └── removeReaction()
└── Search & Filter
    ├── searchMessages()
    ├── getMessagesBySender()
    └── getMessagesByDate()
```

**Data Storage**:
- localStorage key: `group_messages_{groupId}`
- IPFS: Message data and files
- Future: Blockchain message hashes

### IPFSService

**Purpose**: Interface with IPFS network

**Architecture**:
```
IPFSService
├── File Operations
│   ├── uploadFile()
│   ├── getFileUrl()
│   └── deleteFile()
├── Configuration
│   ├── JWT authentication
│   ├── Gateway URL
│   └── API endpoint
└── Error Handling
    ├── Retry logic
    ├── Fallback gateways
    └── Error reporting
```

**Integration**:
- Pinata API for pinning
- Custom gateway for retrieval
- Future: Direct IPFS node

---

## Storage Architecture

### localStorage Schema

**User Profile**:
```javascript
// Key: user_profile_{address}
{
  address: string,
  username: string,
  bio: string,
  avatar: {
    type: string,
    value: string,
    ipfsHash: string,
    url: string
  },
  createdAt: string,
  updatedAt: string
}
```

**Groups**:
```javascript
// Key: groups
[
  {
    id: string,
    name: string,
    description: string,
    avatar: object,
    creator: string,
    members: array,
    settings: object,
    createdAt: string,
    updatedAt: string,
    ipfsHash: string
  }
]
```

**Messages**:
```javascript
// Key: group_messages_{groupId}
[
  {
    id: string,
    groupId: string,
    sender: string,
    type: string,
    content: string,
    file: object,
    reactions: array,
    timestamp: string,
    ipfsHash: string
  }
]
```

### IPFS Storage

**File Structure**:
```
IPFS Network
├── User Avatars
│   └── QmXxx... (image files)
├── Group Avatars
│   └── QmYyy... (image files)
├── Group Metadata
│   └── QmZzz... (JSON data)
├── Messages
│   └── QmAaa... (JSON data)
└── File Attachments
    └── QmBbb... (any file type)
```

**Data Format**:
```javascript
// Group metadata on IPFS
{
  id: "group-123",
  name: "Development Team",
  description: "Team chat",
  members: [...],
  settings: {...},
  version: "1.0.0",
  timestamp: "2025-10-30T12:00:00Z"
}
```

---

## Security Architecture

### Authentication

**Methods**:
1. **Web3 Wallet**: MetaMask, WalletConnect
2. **Email**: Magic link authentication
3. **Phone**: SMS verification
4. **Alipay**: OAuth integration

**Session Management**:
- Context-based session state
- localStorage for persistence
- Automatic logout on inactivity

### Data Security

**Current**:
- Client-side data validation
- IPFS content addressing
- Secure HTTPS connections

**Planned**:
- End-to-end encryption
- Message signing
- Key management

### Permission System

**Roles**:
- **Creator**: Full control, cannot be removed
- **Admin**: Manage members and settings
- **Member**: Send messages, limited actions

**Permission Matrix**:
| Action | Creator | Admin | Member |
|--------|---------|-------|--------|
| Delete Group | ✅ | ✅ | ❌ |
| Add Member | ✅ | ✅ | ❌ |
| Remove Member | ✅ | ✅ | ❌ |
| Promote/Demote | ✅ | ✅ | ❌ |
| Edit Settings | ✅ | ✅ | ❌ |
| Send Message | ✅ | ✅ | ✅ |
| Edit Own Message | ✅ | ✅ | ✅ |
| Leave Group | ❌ | ✅ | ✅ |

---

## Scalability

### Current Capacity

**localStorage Limits**:
- ~5-10MB per domain
- Sufficient for 1000s of messages
- Automatic cleanup for old data

**IPFS Performance**:
- Unlimited storage
- Global CDN delivery
- Sub-second retrieval

### Scaling Strategy

**Short-term** (1-1000 users):
- Current architecture sufficient
- localStorage for local data
- IPFS for files

**Medium-term** (1000-10,000 users):
- Add backend API
- Database for user data
- WebSocket for real-time
- Caching layer

**Long-term** (10,000+ users):
- Microservices architecture
- Distributed database
- Message queue
- Load balancing
- CDN for static assets

### Performance Optimization

**Current**:
- Code splitting
- Lazy loading
- Image optimization
- Debounced search

**Planned**:
- Service workers
- Offline support
- Progressive Web App
- Edge computing

---

## Related Documentation

- [Group Chat Feature](../features/GROUP_CHAT_FEATURE.md)
- [IPFS Integration](../features/PINATA_IPFS_INTEGRATION.md)
- [API Reference](./API_REFERENCE.md)

---

**Document Version**: 1.0.0  
**Last Updated**: October 30, 2025  
**Maintained by**: Dchat Development Team

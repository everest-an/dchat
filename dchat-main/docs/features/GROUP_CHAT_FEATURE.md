# Group Chat Feature

> **Status**: ✅ Production Ready  
> **Version**: 1.0.0  
> **Last Updated**: October 30, 2025  
> **Deployment**: https://www.dchat.pro  
> **Code**: 2,200+ lines

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Implementation](#implementation)
- [Service Layer API](#service-layer-api)
- [UI Components](#ui-components)
- [Usage Examples](#usage-examples)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Future Improvements](#future-improvements)

---

## Overview

The Group Chat Feature is an enterprise-grade communication system that enables users to create and manage group conversations with advanced features like member management, file sharing, IPFS storage, and fine-grained permissions.

### Key Highlights

- **2,200+ lines** of production-ready code
- **Complete service layer** with 1,500+ lines
- **Rich UI components** with 600+ lines
- **Full IPFS integration** for decentralized storage
- **Multi-language support** (EN/ZH)
- **Permission system** with role-based access control
- **File sharing** with IPFS storage
- **Message reactions** and editing
- **Search functionality** across messages

---

## Features

### Group Management

#### Create Groups
- Custom group name and description
- Upload group avatar (IPFS)
- Add initial members
- Configure privacy settings
- Set join approval requirements

#### Edit Groups
- Update group information
- Change group avatar
- Modify group description
- Update settings
- Archive/unarchive groups

#### Delete Groups
- Admin-only permission
- Confirmation dialog
- Cascade delete messages
- Remove from all members

### Member Management

#### Add Members
- Add by wallet address
- Bulk add support
- Automatic notifications
- Member limit enforcement

#### Remove Members
- Admin permission required
- Cannot remove creator
- Confirmation dialog
- Automatic cleanup

#### Role Management
- **Admin**: Full permissions
- **Member**: Limited permissions
- Promote/demote members
- Creator protection

### Messaging

#### Send Messages
- Text messages
- File attachments
- System messages
- Emoji support

#### Message Operations
- Edit messages
- Delete messages
- React to messages (emoji)
- Reply to messages

#### Message Features
- Real-time updates
- Message history
- Search messages
- Filter by sender/date

### IPFS Integration

#### Group Data Storage
- Group metadata on IPFS
- Decentralized storage
- Permanent records
- Global access

#### Message Storage
- Messages pinned to IPFS
- File attachments on IPFS
- Content addressing
- Censorship resistant

### Permission System

#### Admin Permissions
- Create/delete groups
- Add/remove members
- Promote/demote members
- Edit group settings
- Delete any message

#### Member Permissions
- Send messages
- Edit own messages
- Delete own messages
- Leave group
- View group info

### Settings

#### Privacy Settings
- Private groups (invite-only)
- Public groups (anyone can join)
- Join approval required
- Member visibility

#### Feature Settings
- Allow member invites
- Allow file sharing
- Message editing
- Message deletion

---

## Architecture

### System Design

```
┌─────────────────────────────────────────────────────┐
│                  React Components                   │
│  ┌──────────────┐  ┌────────────────────────────┐  │
│  │  GroupChat   │  │  CreateGroupDialog         │  │
│  └──────────────┘  └────────────────────────────┘  │
│  ┌──────────────┐  ┌────────────────────────────┐  │
│  │ GroupSettings│  │  GroupMemberList           │  │
│  └──────────────┘  └────────────────────────────┘  │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│                  Service Layer                      │
│  ┌──────────────────┐  ┌─────────────────────────┐ │
│  │  GroupService    │  │  GroupMessageService    │ │
│  │  (900+ lines)    │  │  (600+ lines)           │ │
│  └──────────────────┘  └─────────────────────────┘ │
└──────────────────────┬──────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────┐
│                  Storage Layer                      │
│  ┌──────────────────┐  ┌─────────────────────────┐ │
│  │  localStorage    │  │  IPFS (Pinata)          │ │
│  │  - Group data    │  │  - Group metadata       │ │
│  │  - Messages      │  │  - Messages             │ │
│  │  - Members       │  │  - File attachments     │ │
│  └──────────────────┘  └─────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Data Models

#### Group Model
```javascript
{
  id: string,                    // Unique group ID (UUID)
  name: string,                  // Group name
  description: string,           // Group description
  avatar: {                      // Group avatar
    type: 'ipfs' | 'emoji' | 'url',
    value: string,               // IPFS hash, emoji, or URL
    ipfsHash: string,            // IPFS CID (if type is 'ipfs')
    url: string                  // Gateway URL
  },
  creator: string,               // Creator's wallet address
  members: [                     // Group members
    {
      address: string,           // Member's wallet address
      username: string,          // Member's display name
      role: 'admin' | 'member',  // Member's role
      joinedAt: string,          // ISO timestamp
      avatar: object             // Member's avatar
    }
  ],
  settings: {                    // Group settings
    privacy: 'private' | 'public',
    joinApproval: boolean,       // Require approval to join
    allowMemberInvite: boolean,  // Members can invite others
    allowFileSharing: boolean    // Allow file attachments
  },
  createdAt: string,             // ISO timestamp
  updatedAt: string,             // ISO timestamp
  ipfsHash: string,              // IPFS CID of group data
  messageCount: number,          // Total message count
  lastActivity: string           // Last message timestamp
}
```

#### Message Model
```javascript
{
  id: string,                    // Unique message ID (UUID)
  groupId: string,               // Group ID
  sender: string,                // Sender's wallet address
  senderName: string,            // Sender's display name
  type: 'text' | 'file' | 'system',
  content: string,               // Message content
  file: {                        // File attachment (if type is 'file')
    name: string,                // File name
    size: number,                // File size in bytes
    type: string,                // MIME type
    ipfsHash: string,            // IPFS CID
    url: string                  // Gateway URL
  },
  reactions: [                   // Message reactions
    {
      emoji: string,             // Emoji character
      users: [string]            // Array of user addresses
    }
  ],
  edited: boolean,               // Whether message was edited
  editedAt: string,              // Edit timestamp
  timestamp: string,             // ISO timestamp
  ipfsHash: string               // IPFS CID of message data
}
```

### Service Architecture

#### GroupService (900+ lines)

**Responsibilities**:
- Group CRUD operations
- Member management
- Permission validation
- IPFS integration
- Search functionality

**Key Methods**:
- `createGroup(groupData)` - Create new group
- `updateGroup(groupId, updates)` - Update group info
- `deleteGroup(groupId, userId)` - Delete group
- `addMember(groupId, memberData, userId)` - Add member
- `removeMember(groupId, memberAddress, userId)` - Remove member
- `promoteMember(groupId, memberAddress, userId)` - Make admin
- `demoteMember(groupId, memberAddress, userId)` - Remove admin
- `leaveGroup(groupId, userId)` - Leave group
- `getGroup(groupId)` - Get group details
- `getUserGroups(userId)` - Get user's groups
- `searchGroups(query)` - Search groups

#### GroupMessageService (600+ lines)

**Responsibilities**:
- Message CRUD operations
- File message handling
- Message reactions
- Search functionality
- IPFS integration

**Key Methods**:
- `sendMessage(groupId, sender, content)` - Send text message
- `sendFileMessage(groupId, sender, file, caption)` - Send file
- `sendSystemMessage(groupId, content)` - System message
- `editMessage(messageId, newContent, userId)` - Edit message
- `deleteMessage(messageId, userId)` - Delete message
- `addReaction(messageId, emoji, userId)` - Add reaction
- `removeReaction(messageId, emoji, userId)` - Remove reaction
- `getMessages(groupId, options)` - Get messages
- `searchMessages(groupId, query)` - Search messages
- `getMessagesBySender(groupId, sender)` - Filter by sender

---

## Implementation

### File Structure

```
frontend/src/
├── services/
│   ├── GroupService.js              # Group management (900+ lines)
│   └── GroupMessageService.js       # Message management (600+ lines)
├── components/
│   ├── GroupChat.jsx                # Main chat interface
│   └── dialogs/
│       ├── CreateGroupDialog.jsx    # Create group dialog
│       └── GroupSettingsDialog.jsx  # Group settings (500+ lines)
└── locales/
    ├── en.js                        # English translations
    └── zh.js                        # Chinese translations
```

---

## Service Layer API

### GroupService

#### createGroup(groupData)

Create a new group.

**Parameters**:
```javascript
{
  name: string,              // Required: Group name
  description: string,       // Optional: Group description
  avatar: object,            // Optional: Group avatar
  creator: string,           // Required: Creator's address
  members: array,            // Optional: Initial members
  settings: object           // Optional: Group settings
}
```

**Returns**: Promise<Group>

**Example**:
```javascript
const group = await GroupService.createGroup({
  name: "Development Team",
  description: "Team communication channel",
  avatar: {
    type: "emoji",
    emoji: "💻"
  },
  creator: "0x123...",
  members: [
    {
      address: "0x123...",
      username: "Alice",
      role: "admin"
    }
  ],
  settings: {
    privacy: "private",
    joinApproval: true,
    allowMemberInvite: true,
    allowFileSharing: true
  }
})

console.log('Group created:', group.id)
console.log('IPFS hash:', group.ipfsHash)
```

#### addMember(groupId, memberData, userId)

Add a member to the group.

**Parameters**:
- `groupId` (string): Group ID
- `memberData` (object): Member information
  ```javascript
  {
    address: string,         // Member's wallet address
    username: string,        // Member's display name
    avatar: object,          // Member's avatar
    role: string            // 'admin' or 'member' (default: 'member')
  }
  ```
- `userId` (string): User performing the action

**Returns**: Promise<Group>

**Throws**: Error if user lacks permission

**Example**:
```javascript
await GroupService.addMember(
  'group-123',
  {
    address: '0x456...',
    username: 'Bob',
    role: 'member'
  },
  '0x123...' // Admin's address
)
```

#### removeMember(groupId, memberAddress, userId)

Remove a member from the group.

**Parameters**:
- `groupId` (string): Group ID
- `memberAddress` (string): Address of member to remove
- `userId` (string): User performing the action

**Returns**: Promise<Group>

**Throws**: 
- Error if user lacks permission
- Error if trying to remove creator
- Error if trying to remove last admin

**Example**:
```javascript
await GroupService.removeMember(
  'group-123',
  '0x456...',  // Member to remove
  '0x123...'   // Admin's address
)
```

#### promoteMember(groupId, memberAddress, userId)

Promote a member to admin.

**Parameters**:
- `groupId` (string): Group ID
- `memberAddress` (string): Address of member to promote
- `userId` (string): User performing the action

**Returns**: Promise<Group>

**Example**:
```javascript
await GroupService.promoteMember(
  'group-123',
  '0x456...',  // Member to promote
  '0x123...'   // Admin's address
)
```

#### updateGroup(groupId, updates)

Update group information.

**Parameters**:
- `groupId` (string): Group ID
- `updates` (object): Fields to update
  ```javascript
  {
    name: string,            // Optional: New name
    description: string,     // Optional: New description
    avatar: object,          // Optional: New avatar
    settings: object         // Optional: New settings
  }
  ```

**Returns**: Promise<Group>

**Example**:
```javascript
await GroupService.updateGroup('group-123', {
  name: "Dev Team - Updated",
  description: "New description",
  settings: {
    allowFileSharing: false
  }
})
```

### GroupMessageService

#### sendMessage(groupId, sender, content)

Send a text message.

**Parameters**:
- `groupId` (string): Group ID
- `sender` (string): Sender's wallet address
- `content` (string): Message content

**Returns**: Promise<Message>

**Example**:
```javascript
const message = await GroupMessageService.sendMessage(
  'group-123',
  '0x123...',
  'Hello, team!'
)

console.log('Message sent:', message.id)
console.log('IPFS hash:', message.ipfsHash)
```

#### sendFileMessage(groupId, sender, file, caption)

Send a file message.

**Parameters**:
- `groupId` (string): Group ID
- `sender` (string): Sender's wallet address
- `file` (File): File object to upload
- `caption` (string): Optional caption

**Returns**: Promise<Message>

**Example**:
```javascript
const file = document.querySelector('input[type="file"]').files[0]

const message = await GroupMessageService.sendFileMessage(
  'group-123',
  '0x123...',
  file,
  'Check out this document'
)

console.log('File uploaded:', message.file.url)
```

#### addReaction(messageId, emoji, userId)

Add emoji reaction to a message.

**Parameters**:
- `messageId` (string): Message ID
- `emoji` (string): Emoji character
- `userId` (string): User's wallet address

**Returns**: Promise<Message>

**Example**:
```javascript
await GroupMessageService.addReaction(
  'message-123',
  '👍',
  '0x123...'
)
```

#### searchMessages(groupId, query)

Search messages in a group.

**Parameters**:
- `groupId` (string): Group ID
- `query` (string): Search query

**Returns**: Array<Message>

**Example**:
```javascript
const results = GroupMessageService.searchMessages(
  'group-123',
  'important'
)

console.log(`Found ${results.length} messages`)
```

---

## UI Components

### GroupChat Component

Main group chat interface.

**Features**:
- Message list with infinite scroll
- Message input with file upload
- Member list sidebar
- Group settings access
- Real-time updates

**Usage**:
```jsx
<GroupChat
  groupId="group-123"
  currentUser={user}
  onClose={handleClose}
/>
```

### CreateGroupDialog Component

Dialog for creating new groups.

**Features**:
- Group name and description input
- Avatar upload (emoji or IPFS)
- Member selection
- Settings configuration

**Usage**:
```jsx
<CreateGroupDialog
  open={isOpen}
  onClose={handleClose}
  currentUser={user}
  onCreate={handleCreate}
/>
```

### GroupSettingsDialog Component

Dialog for managing group settings (500+ lines).

**Features**:
- Three tabs: Info, Members, Settings
- Edit group information
- Manage members
- Configure settings
- Leave/delete group

**Usage**:
```jsx
<GroupSettingsDialog
  open={isOpen}
  onClose={handleClose}
  group={currentGroup}
  currentUser={user}
  onUpdate={handleUpdate}
/>
```

---

## Usage Examples

### Create a Group

```javascript
import GroupService from './services/GroupService'

const createTeamGroup = async () => {
  try {
    const group = await GroupService.createGroup({
      name: "Product Team",
      description: "Product development discussions",
      avatar: {
        type: "emoji",
        emoji: "🚀"
      },
      creator: currentUser.address,
      members: [
        {
          address: currentUser.address,
          username: currentUser.username,
          role: "admin"
        }
      ],
      settings: {
        privacy: "private",
        joinApproval: true,
        allowMemberInvite: true,
        allowFileSharing: true
      }
    })
    
    console.log('Group created successfully!')
    console.log('Group ID:', group.id)
    console.log('IPFS Hash:', group.ipfsHash)
    
    return group
  } catch (error) {
    console.error('Failed to create group:', error)
  }
}
```

### Send a Message

```javascript
import GroupMessageService from './services/GroupMessageService'

const sendTeamMessage = async (groupId) => {
  try {
    const message = await GroupMessageService.sendMessage(
      groupId,
      currentUser.address,
      'Team meeting at 3 PM today!'
    )
    
    console.log('Message sent!')
    console.log('Message ID:', message.id)
    console.log('IPFS Hash:', message.ipfsHash)
    
    return message
  } catch (error) {
    console.error('Failed to send message:', error)
  }
}
```

### Add a Member

```javascript
const addTeamMember = async (groupId, memberAddress) => {
  try {
    await GroupService.addMember(
      groupId,
      {
        address: memberAddress,
        username: 'New Member',
        role: 'member'
      },
      currentUser.address
    )
    
    console.log('Member added successfully!')
  } catch (error) {
    console.error('Failed to add member:', error)
  }
}
```

### Search Messages

```javascript
const searchTeamMessages = (groupId, keyword) => {
  const results = GroupMessageService.searchMessages(groupId, keyword)
  
  console.log(`Found ${results.length} messages containing "${keyword}"`)
  
  results.forEach(msg => {
    console.log(`[${msg.senderName}]: ${msg.content}`)
  })
  
  return results
}
```

---

## Testing

### Manual Testing

See [GROUP_CHAT_QUICK_TEST_GUIDE.md](../../GROUP_CHAT_QUICK_TEST_GUIDE.md) for detailed testing steps.

### Automated Testing

```javascript
// test/GroupService.test.js
import { describe, it, expect, beforeEach } from 'vitest'
import GroupService from '../src/services/GroupService'

describe('GroupService', () => {
  let testGroup
  
  beforeEach(() => {
    localStorage.clear()
  })
  
  it('should create a group', async () => {
    testGroup = await GroupService.createGroup({
      name: 'Test Group',
      creator: '0x123...',
      members: [{
        address: '0x123...',
        role: 'admin'
      }]
    })
    
    expect(testGroup.id).toBeDefined()
    expect(testGroup.name).toBe('Test Group')
    expect(testGroup.members).toHaveLength(1)
  })
  
  it('should add a member', async () => {
    const updated = await GroupService.addMember(
      testGroup.id,
      {
        address: '0x456...',
        username: 'Bob',
        role: 'member'
      },
      '0x123...'
    )
    
    expect(updated.members).toHaveLength(2)
  })
  
  it('should not allow non-admin to remove members', async () => {
    await expect(
      GroupService.removeMember(
        testGroup.id,
        '0x456...',
        '0x789...' // Not an admin
      )
    ).rejects.toThrow('Only admins can remove members')
  })
})
```

---

## Troubleshooting

### Common Issues

#### 1. "Only admins can perform this action"

**Cause**: User lacks admin permission

**Solution**: Verify user role in group members list

#### 2. "Cannot remove group creator"

**Cause**: Attempting to remove the creator

**Solution**: Creator cannot be removed, only transfer ownership (future feature)

#### 3. "Group not found"

**Cause**: Invalid group ID or group deleted

**Solution**: Verify group exists in localStorage

#### 4. "IPFS upload failed"

**Cause**: Network error or IPFS service issue

**Solution**: Check IPFS service configuration and network connection

---

## Future Improvements

### Short-term
- End-to-end encryption
- Read receipts
- Typing indicators
- Voice messages

### Medium-term
- Video/voice calls
- Screen sharing
- Message threading
- Advanced search

### Long-term
- Blockchain storage
- Smart contracts
- Token gating
- DAO governance

---

## Related Documentation

- [Pinata IPFS Integration](./PINATA_IPFS_INTEGRATION.md)
- [System Architecture](../architecture/SYSTEM_ARCHITECTURE.md)
- [Testing Guide](../guides/TESTING_GUIDE.md)

---

**Document Version**: 1.0.0  
**Last Updated**: October 30, 2025  
**Maintained by**: Dchat Development Team

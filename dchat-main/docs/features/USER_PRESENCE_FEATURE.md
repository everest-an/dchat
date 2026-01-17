# User Presence/Online Status Feature

> **Status**: ✅ Production Ready  
> **Version**: 1.0.0  
> **Last Updated**: October 30, 2025

## Overview

The User Presence feature provides real-time online status tracking for dchat users. It shows who's online, away, busy, or offline, with support for custom status messages and automatic away detection.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Components](#components)
- [Service API](#service-api)
- [Usage Examples](#usage-examples)
- [Internationalization](#internationalization)
- [Testing](#testing)
- [Future Enhancements](#future-enhancements)

---

## Features

### Status Types

1. **Online** (🟢 Green)
   - User is actively using the application
   - Auto-set when user interacts with the app
   - Pulse animation for visual feedback

2. **Away** (🟡 Yellow)
   - User is inactive
   - Auto-set after 5 minutes of inactivity
   - Auto-return to Online when user becomes active

3. **Busy** (🔴 Red)
   - User is busy, do not disturb
   - Manually set by user
   - Persists until manually changed

4. **Offline** (⚫ Gray)
   - User is not online
   - Shows "Last seen" time
   - Auto-set when user closes the app

### Custom Status

- Set custom status message (up to 50 characters)
- Add emoji to status (10 common emojis provided)
- Set status duration (30min, 1h, 4h, 24h, or no duration)
- Auto-clear after duration expires
- Display custom status in user profile and chat list

### Privacy Controls

- Show/hide status to others
- Control who can see your status
- Respect user privacy preferences

### Activity Tracking

- Track mouse movements
- Track keyboard input
- Track touch events
- Detect page visibility changes
- Auto-detect away status after 5 minutes

### Last Seen

- Track last activity timestamp
- Display "Last seen X minutes ago"
- Smart time formatting (just now, minutes ago, hours ago, days ago)
- Real-time updates every minute

### Real-Time Updates

- Event-driven architecture
- Subscribe to status changes
- Instant UI updates
- Efficient re-rendering

---

## Architecture

### Service Layer

```
PresenceService
├── Status Management
│   ├── initialize(userId)
│   ├── setStatus(status)
│   ├── getUserStatus(userId)
│   ├── getOnlineUsers()
│   └── cleanup()
├── Custom Status
│   ├── setCustomStatus(customStatus)
│   ├── getCustomStatus()
│   └── clearCustomStatus()
├── Visibility Control
│   ├── setVisibility(isVisible)
│   └── isVisible()
├── Activity Tracking
│   ├── trackActivity()
│   ├── startTracking()
│   └── stopTracking()
├── Event System
│   ├── onStatusChange(callback)
│   ├── emit(event, data)
│   └── listeners
└── Persistence
    ├── saveToStorage()
    └── loadFromStorage()
```

### Data Models

```javascript
// User Status
{
  userId: string,           // User's wallet address
  status: string,           // online | away | busy | offline
  lastSeen: number,         // Timestamp
  customStatus: {
    emoji: string,          // Optional emoji
    message: string,        // Status message
    expiresAt: number      // Expiration timestamp
  },
  isVisible: boolean        // Privacy setting
}

// Status Types
enum PresenceStatus {
  ONLINE = 'online',
  AWAY = 'away',
  BUSY = 'busy',
  OFFLINE = 'offline'
}
```

---

## Components

### StatusBadge

Small colored dot indicator showing user's status.

**Props**:
```javascript
{
  userId: string,           // Optional: fetch status for this user
  status: string,           // Optional: use this status directly
  size: 'sm'|'md'|'lg',    // Badge size
  showPulse: boolean,       // Show pulse animation
  showTooltip: boolean,     // Show tooltip on hover
  className: string         // Additional CSS classes
}
```

**Usage**:
```jsx
// With userId (fetches status automatically)
<StatusBadge userId={userAddress} size="sm" />

// With direct status
<StatusBadge status="online" size="md" showPulse={true} />
```

### StatusIndicator

Status indicator with text label, last seen time, and custom status.

**Props**:
```javascript
{
  userId: string,           // Required: user's wallet address
  showLabel: boolean,       // Show status text label
  showLastSeen: boolean,    // Show last seen time
  showCustomStatus: boolean, // Show custom status message
  size: 'sm'|'md'|'lg',    // Badge size
  className: string         // Additional CSS classes
}
```

**Usage**:
```jsx
<StatusIndicator 
  userId={userAddress}
  showLabel={true}
  showLastSeen={true}
  showCustomStatus={true}
/>
```

### StatusPicker

Dropdown to change user status with custom status support.

**Props**:
```javascript
{
  currentStatus: string,    // Current status
  onStatusChange: function, // Callback when status changes
  allowCustomStatus: boolean, // Allow custom status input
  className: string         // Additional CSS classes
}
```

**Usage**:
```jsx
<StatusPicker
  currentStatus={currentStatus}
  onStatusChange={(status, customStatus) => {
    presenceService.setStatus(status);
    if (customStatus) {
      presenceService.setCustomStatus(customStatus);
    }
  }}
  allowCustomStatus={true}
/>
```

---

## Service API

### PresenceService

#### Initialize

```javascript
import presenceService from '../services/PresenceService';

// Initialize for current user
presenceService.initialize(userAddress);

// Cleanup on unmount
presenceService.cleanup();
```

#### Set Status

```javascript
// Set status
presenceService.setStatus(PresenceStatus.ONLINE);
presenceService.setStatus(PresenceStatus.AWAY);
presenceService.setStatus(PresenceStatus.BUSY);
presenceService.setStatus(PresenceStatus.OFFLINE);
```

#### Get Status

```javascript
// Get user status
const userStatus = presenceService.getUserStatus(userAddress);
console.log(userStatus);
// {
//   userId: '0x123...',
//   status: 'online',
//   lastSeen: 1698765432000,
//   customStatus: { emoji: '💻', message: 'Working' },
//   isVisible: true
// }

// Get all online users
const onlineUsers = presenceService.getOnlineUsers();
console.log(onlineUsers); // ['0x123...', '0x456...']
```

#### Custom Status

```javascript
// Set custom status
presenceService.setCustomStatus({
  emoji: '💻',
  message: 'Working on a project',
  duration: 60 // minutes (optional)
});

// Get custom status
const customStatus = presenceService.getCustomStatus();

// Clear custom status
presenceService.clearCustomStatus();
```

#### Visibility

```javascript
// Hide status
presenceService.setVisibility(false);

// Show status
presenceService.setVisibility(true);

// Check visibility
const isVisible = presenceService.isVisible();
```

#### Subscribe to Changes

```javascript
// Subscribe to status changes
const unsubscribe = presenceService.onStatusChange((userId) => {
  console.log(`User ${userId} status changed`);
  const newStatus = presenceService.getUserStatus(userId);
  // Update UI
});

// Unsubscribe
unsubscribe();
```

#### Utility Methods

```javascript
// Get last seen text
const lastSeenText = presenceService.getLastSeenText(timestamp);
// Returns: "Just now", "5 minutes ago", "2 hours ago", etc.

// Track activity manually
presenceService.trackActivity();
```

---

## Usage Examples

### Example 1: Display Status in Chat List

```jsx
import React from 'react';
import StatusBadge from './StatusBadge';

const ChatListItem = ({ user }) => {
  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <img src={user.avatar} alt="Avatar" className="w-12 h-12 rounded-full" />
        <div className="absolute bottom-0 right-0">
          <StatusBadge userId={user.address} size="sm" />
        </div>
      </div>
      <div>
        <h3>{user.name}</h3>
        <p>{user.lastMessage}</p>
      </div>
    </div>
  );
};
```

### Example 2: Status Picker in Profile

```jsx
import React, { useState, useEffect } from 'react';
import StatusPicker from './StatusPicker';
import presenceService from '../services/PresenceService';

const UserProfile = ({ userAddress }) => {
  const [currentStatus, setCurrentStatus] = useState('online');

  useEffect(() => {
    const status = presenceService.getUserStatus(userAddress);
    setCurrentStatus(status.status);
  }, [userAddress]);

  const handleStatusChange = (status, customStatus) => {
    presenceService.setStatus(status);
    if (customStatus) {
      presenceService.setCustomStatus(customStatus);
    }
    setCurrentStatus(status);
  };

  return (
    <div>
      <h2>My Status</h2>
      <StatusPicker
        currentStatus={currentStatus}
        onStatusChange={handleStatusChange}
        allowCustomStatus={true}
      />
    </div>
  );
};
```

### Example 3: Real-Time Status Updates

```jsx
import React, { useState, useEffect } from 'react';
import StatusIndicator from './StatusIndicator';
import presenceService from '../services/PresenceService';

const UserCard = ({ userAddress }) => {
  const [, setUpdate] = useState(0);

  useEffect(() => {
    // Subscribe to status changes
    const unsubscribe = presenceService.onStatusChange((changedUserId) => {
      if (changedUserId === userAddress) {
        setUpdate(prev => prev + 1); // Force re-render
      }
    });

    return unsubscribe;
  }, [userAddress]);

  return (
    <div>
      <StatusIndicator
        userId={userAddress}
        showLabel={true}
        showLastSeen={true}
        showCustomStatus={true}
      />
    </div>
  );
};
```

### Example 4: Initialize Presence on App Start

```jsx
import React, { useEffect } from 'react';
import { useWeb3 } from '../contexts/Web3Context';
import presenceService from '../services/PresenceService';

const App = () => {
  const { account } = useWeb3();

  useEffect(() => {
    if (account) {
      // Initialize presence tracking
      presenceService.initialize(account);
    }

    return () => {
      // Cleanup on unmount
      presenceService.cleanup();
    };
  }, [account]);

  return (
    <div>
      {/* Your app content */}
    </div>
  );
};
```

---

## Internationalization

### English (en.js)

```javascript
presence: {
  online: 'Online',
  away: 'Away',
  busy: 'Busy',
  offline: 'Offline',
  lastSeen: 'Last seen {time}',
  justNow: 'Just now',
  minutesAgo: '{count} minutes ago',
  hoursAgo: '{count} hours ago',
  daysAgo: '{count} days ago',
  setStatus: 'Set status',
  customStatus: 'Custom status',
  setCustomStatus: 'Set custom status',
  clearStatus: 'Clear status',
  hideStatus: 'Hide my status',
  showStatus: 'Show my status',
  emoji: 'Emoji',
  message: 'Message',
  messagePlaceholder: 'What\'s your status?',
  duration: 'Duration',
  noDuration: 'No duration',
  save: 'Save',
  cancel: 'Cancel'
}
```

### Chinese (zh.js)

```javascript
presence: {
  online: '在线',
  away: '离开',
  busy: '忙碌',
  offline: '离线',
  lastSeen: '最后在线 {time}',
  justNow: '刚刚',
  minutesAgo: '{count} 分钟前',
  hoursAgo: '{count} 小时前',
  daysAgo: '{count} 天前',
  setStatus: '设置状态',
  customStatus: '自定义状态',
  setCustomStatus: '设置自定义状态',
  clearStatus: '清除状态',
  hideStatus: '隐藏我的状态',
  showStatus: '显示我的状态',
  emoji: '表情',
  message: '消息',
  messagePlaceholder: '你的状态是什么？',
  duration: '持续时间',
  noDuration: '无持续时间',
  save: '保存',
  cancel: '取消'
}
```

---

## Testing

### Manual Testing

1. **Basic Status**
   - Open dchat.pro
   - Check your status (should be "Online")
   - Change status to "Away", "Busy", "Offline"
   - Verify color changes

2. **Custom Status**
   - Click "Set custom status"
   - Select an emoji
   - Enter a message
   - Set duration
   - Save and verify display

3. **Auto-Away**
   - Leave the page idle for 5 minutes
   - Status should change to "Away"
   - Move mouse to return to "Online"

4. **Last Seen**
   - Set status to "Offline"
   - Wait a few minutes
   - Check from another account
   - Should show "Last seen X minutes ago"

5. **Privacy**
   - Hide your status
   - Check from another account
   - Status should not be visible

### Automated Testing

```javascript
// Test PresenceService
describe('PresenceService', () => {
  test('should initialize correctly', () => {
    presenceService.initialize('0x123');
    const status = presenceService.getUserStatus('0x123');
    expect(status.status).toBe('online');
  });

  test('should set status', () => {
    presenceService.setStatus('away');
    const status = presenceService.getUserStatus('0x123');
    expect(status.status).toBe('away');
  });

  test('should set custom status', () => {
    presenceService.setCustomStatus({
      emoji: '💻',
      message: 'Working'
    });
    const customStatus = presenceService.getCustomStatus();
    expect(customStatus.message).toBe('Working');
  });
});
```

---

## Future Enhancements

### Phase 1 (1-2 weeks)
- [ ] Status history tracking
- [ ] Status sync across devices
- [ ] Bulk status operations
- [ ] Expanded emoji picker

### Phase 2 (1-2 months)
- [ ] Backend integration with WebSocket
- [ ] Status analytics
- [ ] Smart status suggestions
- [ ] Status scheduling

### Phase 3 (3-6 months)
- [ ] Rich presence (show current activity)
- [ ] Status reactions
- [ ] Status stories
- [ ] Third-party integrations

---

## Troubleshooting

### Status not updating

**Problem**: Status doesn't update in real-time

**Solution**:
1. Check if PresenceService is initialized
2. Verify event listeners are attached
3. Check browser console for errors

### Auto-away not working

**Problem**: Status doesn't change to "Away" automatically

**Solution**:
1. Ensure activity tracking is started
2. Check if page visibility API is supported
3. Verify inactivity timeout (default 5 minutes)

### Custom status not persisting

**Problem**: Custom status disappears after refresh

**Solution**:
1. Check localStorage permissions
2. Verify data is being saved
3. Check for storage quota errors

---

## Support

For questions or issues:
- GitHub: https://github.com/everest-an/dchat
- Documentation: /docs/features/USER_PRESENCE_FEATURE.md

---

**Last Updated**: October 30, 2025  
**Version**: 1.0.0  
**Status**: ✅ Production Ready

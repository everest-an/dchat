# Avatar Upload Feature

> **Status**: ✅ Production Ready  
> **Version**: 1.0.0  
> **Last Updated**: October 30, 2025  
> **Deployment**: https://www.dchat.pro

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Implementation](#implementation)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Future Improvements](#future-improvements)

---

## Overview

The Avatar Upload Feature allows users to upload and manage their profile pictures with IPFS storage integration. This feature provides a seamless user experience with drag-and-drop support, real-time preview, and automatic IPFS pinning.

### Key Benefits

- **Decentralized Storage**: Avatars stored on IPFS, never lost
- **Global Access**: Available from anywhere in the world
- **User Control**: Users own their profile pictures
- **Privacy**: No centralized server storing images
- **Permanence**: Images persist forever on IPFS

---

## Features

### Core Capabilities

1. **Image Upload**
   - Drag & drop support
   - Click to browse files
   - Multiple format support (JPEG, PNG, GIF, WebP)
   - File size validation (max 5MB)
   - Type validation

2. **Image Preview**
   - Real-time preview before upload
   - Circular avatar display
   - Responsive sizing
   - Loading states

3. **IPFS Integration**
   - Automatic upload to IPFS
   - Pinata service integration
   - IPFS hash storage
   - Gateway URL generation

4. **User Experience**
   - Progress indicator
   - Success/error feedback
   - Multi-language support (EN/ZH)
   - Responsive design
   - Accessibility support

---

## Architecture

### Component Structure

```
AvatarUpload Component
├── File Input Handler
│   ├── Drag & Drop Zone
│   ├── Click to Browse
│   └── File Validation
├── Image Preview
│   ├── Current Avatar Display
│   ├── Upload Preview
│   └── Loading State
├── Upload Handler
│   ├── IPFS Service Call
│   ├── Progress Tracking
│   └── Error Handling
└── Profile Update
    ├── UserProfileService Call
    ├── Avatar URL Update
    └── Success Feedback
```

### Data Flow

```
User selects image
    ↓
Validate file (type, size)
    ↓
Show preview
    ↓
User confirms upload
    ↓
Upload to IPFS (via Pinata)
    ↓
Get IPFS hash & URL
    ↓
Update user profile
    ↓
Save to localStorage
    ↓
Display new avatar
    ↓
Show success message
```

### Integration Points

1. **IPFSService**
   - Upload file to IPFS
   - Get gateway URL
   - Handle errors

2. **UserProfileService**
   - Update user avatar
   - Save profile data
   - Retrieve user info

3. **Language Service**
   - Translate UI text
   - Support EN/ZH
   - Dynamic language switching

---

## Implementation

### File Structure

```
frontend/src/
├── components/
│   ├── AvatarUpload.jsx              # Main component
│   └── dialogs/
│       └── EditProfileDialog.jsx     # Profile editor (uses AvatarUpload)
├── services/
│   ├── ipfsService.js                # IPFS operations
│   └── UserProfileService.js         # Profile management
└── locales/
    ├── en.js                          # English translations
    └── zh.js                          # Chinese translations
```

### Key Components

#### 1. AvatarUpload.jsx

**Purpose**: Reusable avatar upload component

**Props**:
```javascript
{
  currentAvatar: string,      // Current avatar URL or IPFS hash
  onAvatarChange: function,   // Callback when avatar changes
  size: string               // 'sm' | 'md' | 'lg' (default: 'md')
}
```

**State**:
```javascript
{
  preview: string,           // Preview image URL
  uploading: boolean,        // Upload in progress
  error: string,            // Error message
  dragActive: boolean       // Drag over state
}
```

**Key Methods**:
- `handleFileSelect(file)` - Process selected file
- `handleUpload()` - Upload to IPFS
- `handleDrop(e)` - Handle drag & drop
- `validateFile(file)` - Validate file type and size

**Example Usage**:
```jsx
<AvatarUpload
  currentAvatar={user.avatar}
  onAvatarChange={(newAvatar) => {
    setUser({ ...user, avatar: newAvatar })
  }}
  size="lg"
/>
```

#### 2. EditProfileDialog.jsx

**Purpose**: Profile editing dialog with avatar upload

**Features**:
- Avatar upload section
- Username editing
- Bio editing
- Save/Cancel actions

**Integration**:
```jsx
<EditProfileDialog
  open={isOpen}
  onClose={handleClose}
  user={currentUser}
  onSave={handleSave}
/>
```

#### 3. UserProfileService.js

**Purpose**: User profile data management

**Key Methods**:
- `updateAvatar(userId, avatarData)` - Update user avatar
- `getProfile(userId)` - Get user profile
- `saveProfile(userId, profileData)` - Save profile data

**Avatar Data Structure**:
```javascript
{
  type: 'ipfs' | 'url' | 'emoji',
  value: string,              // IPFS hash, URL, or emoji
  ipfsHash: string,           // IPFS CID (if type is 'ipfs')
  url: string,                // Gateway URL
  uploadedAt: string          // ISO timestamp
}
```

---

## Usage

### Basic Implementation

```jsx
import React, { useState } from 'react'
import AvatarUpload from './components/AvatarUpload'

function ProfilePage() {
  const [user, setUser] = useState({
    address: '0x123...',
    username: 'Alice',
    avatar: null
  })

  const handleAvatarChange = (newAvatar) => {
    setUser({ ...user, avatar: newAvatar })
    console.log('New avatar:', newAvatar)
  }

  return (
    <div>
      <h1>Edit Profile</h1>
      <AvatarUpload
        currentAvatar={user.avatar}
        onAvatarChange={handleAvatarChange}
      />
    </div>
  )
}
```

### With Profile Service

```jsx
import UserProfileService from './services/UserProfileService'

const handleAvatarChange = async (newAvatar) => {
  try {
    await UserProfileService.updateAvatar(user.address, {
      type: 'ipfs',
      value: newAvatar.hash,
      ipfsHash: newAvatar.hash,
      url: newAvatar.url,
      uploadedAt: new Date().toISOString()
    })
    
    console.log('Avatar updated successfully')
  } catch (error) {
    console.error('Failed to update avatar:', error)
  }
}
```

### Custom Styling

```jsx
<AvatarUpload
  currentAvatar={user.avatar}
  onAvatarChange={handleAvatarChange}
  size="lg"
  className="custom-avatar-upload"
  style={{
    borderRadius: '50%',
    border: '3px solid #3b82f6'
  }}
/>
```

---

## API Reference

### AvatarUpload Component

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| currentAvatar | string \| object | No | null | Current avatar (URL, hash, or emoji) |
| onAvatarChange | function | Yes | - | Callback when avatar changes |
| size | string | No | 'md' | Size: 'sm' (64px), 'md' (96px), 'lg' (128px) |
| className | string | No | '' | Additional CSS classes |
| style | object | No | {} | Inline styles |
| disabled | boolean | No | false | Disable upload |

#### Events

**onAvatarChange(avatarData)**

Called when avatar is successfully uploaded.

**Parameters**:
```javascript
{
  hash: 'QmXxx...',           // IPFS CID
  url: 'https://...',         // Gateway URL
  type: 'ipfs',               // Avatar type
  size: 1024,                 // File size in bytes
  uploadedAt: '2025-10-30'    // Upload timestamp
}
```

### UserProfileService

#### updateAvatar(userId, avatarData)

Update user's avatar.

**Parameters**:
- `userId` (string): User's wallet address or ID
- `avatarData` (object): Avatar data object

**Returns**: Promise<void>

**Example**:
```javascript
await UserProfileService.updateAvatar('0x123...', {
  type: 'ipfs',
  value: 'QmXxx...',
  ipfsHash: 'QmXxx...',
  url: 'https://gateway.pinata.cloud/ipfs/QmXxx...',
  uploadedAt: new Date().toISOString()
})
```

#### getProfile(userId)

Get user's profile including avatar.

**Parameters**:
- `userId` (string): User's wallet address or ID

**Returns**: Promise<Object>

**Example**:
```javascript
const profile = await UserProfileService.getProfile('0x123...')
console.log(profile.avatar)
```

---

## Testing

### Manual Testing Steps

1. **Open Profile Editor**
   - Click "Edit Profile" button
   - Verify dialog opens

2. **Test Drag & Drop**
   - Drag an image file over the avatar area
   - Verify drag highlight appears
   - Drop the file
   - Verify preview shows

3. **Test Click Upload**
   - Click on avatar area
   - File picker should open
   - Select an image
   - Verify preview shows

4. **Test File Validation**
   - Try uploading a non-image file
   - Should show error message
   - Try uploading a file > 5MB
   - Should show error message

5. **Test Upload Process**
   - Upload a valid image
   - Verify progress indicator shows
   - Wait for upload to complete
   - Verify success message
   - Verify avatar updates

6. **Test IPFS Integration**
   - Open browser console
   - Check for IPFS hash in logs
   - Copy gateway URL
   - Open URL in new tab
   - Verify image loads

7. **Test Multi-language**
   - Switch language to Chinese
   - Verify all text translates
   - Switch back to English
   - Verify translations

### Automated Testing

```javascript
// test/AvatarUpload.test.jsx
import { render, screen, fireEvent } from '@testing-library/react'
import AvatarUpload from '../components/AvatarUpload'

describe('AvatarUpload', () => {
  it('renders upload area', () => {
    render(<AvatarUpload onAvatarChange={() => {}} />)
    expect(screen.getByText(/upload/i)).toBeInTheDocument()
  })

  it('handles file selection', async () => {
    const handleChange = jest.fn()
    render(<AvatarUpload onAvatarChange={handleChange} />)
    
    const file = new File(['image'], 'avatar.png', { type: 'image/png' })
    const input = screen.getByLabelText(/upload/i)
    
    fireEvent.change(input, { target: { files: [file] } })
    
    // Wait for upload
    await screen.findByText(/success/i)
    
    expect(handleChange).toHaveBeenCalled()
  })

  it('validates file type', () => {
    render(<AvatarUpload onAvatarChange={() => {}} />)
    
    const file = new File(['text'], 'file.txt', { type: 'text/plain' })
    const input = screen.getByLabelText(/upload/i)
    
    fireEvent.change(input, { target: { files: [file] } })
    
    expect(screen.getByText(/invalid file type/i)).toBeInTheDocument()
  })

  it('validates file size', () => {
    render(<AvatarUpload onAvatarChange={() => {}} />)
    
    const largeFile = new File(
      [new ArrayBuffer(6 * 1024 * 1024)],
      'large.png',
      { type: 'image/png' }
    )
    const input = screen.getByLabelText(/upload/i)
    
    fireEvent.change(input, { target: { files: [largeFile] } })
    
    expect(screen.getByText(/file too large/i)).toBeInTheDocument()
  })
})
```

### Integration Testing

```javascript
// Test complete flow
describe('Avatar Upload Integration', () => {
  it('uploads avatar and updates profile', async () => {
    // 1. Render profile editor
    const { getByText, getByLabelText } = render(<EditProfileDialog />)
    
    // 2. Select file
    const file = new File(['image'], 'avatar.png', { type: 'image/png' })
    const input = getByLabelText(/upload/i)
    fireEvent.change(input, { target: { files: [file] } })
    
    // 3. Wait for upload
    await waitFor(() => {
      expect(getByText(/uploaded successfully/i)).toBeInTheDocument()
    })
    
    // 4. Save profile
    fireEvent.click(getByText(/save/i))
    
    // 5. Verify profile updated
    const profile = await UserProfileService.getProfile('0x123...')
    expect(profile.avatar.type).toBe('ipfs')
    expect(profile.avatar.ipfsHash).toMatch(/^Qm/)
  })
})
```

---

## Troubleshooting

### Common Issues

#### 1. "File type not supported"

**Cause**: Trying to upload non-image file

**Solution**:
- Only upload image files (JPEG, PNG, GIF, WebP)
- Check file extension
- Verify MIME type

#### 2. "File too large"

**Cause**: File exceeds 5MB limit

**Solution**:
- Compress image before upload
- Use online tools like TinyPNG
- Reduce image dimensions
- Convert to more efficient format (WebP)

#### 3. "Upload failed"

**Cause**: Network error or IPFS service issue

**Solution**:
- Check internet connection
- Verify IPFS service is configured
- Check browser console for errors
- Try again after a few seconds

#### 4. "Avatar not updating"

**Cause**: Cache issue or state not syncing

**Solution**:
```javascript
// Force refresh
window.location.reload()

// Or clear cache
localStorage.removeItem(`user_profile_${userId}`)
```

#### 5. "Preview not showing"

**Cause**: File reader error

**Solution**:
```javascript
// Check file is valid
if (file && file.type.startsWith('image/')) {
  const reader = new FileReader()
  reader.onload = (e) => {
    setPreview(e.target.result)
  }
  reader.readAsDataURL(file)
}
```

---

## Future Improvements

### Short-term (1-2 weeks)

1. **Image Cropping**
   - Built-in image cropper
   - Aspect ratio selection
   - Zoom and pan controls

2. **Filters and Effects**
   - Basic filters (brightness, contrast)
   - Preset effects
   - Real-time preview

3. **Multiple Avatars**
   - Save multiple avatars
   - Quick switch between avatars
   - Avatar history

### Medium-term (1-2 months)

1. **AI-Generated Avatars**
   - Generate avatar from description
   - Style transfer
   - Avatar customization

2. **NFT Avatars**
   - Use NFTs as avatars
   - Verify NFT ownership
   - Display NFT metadata

3. **Avatar Frames**
   - Decorative frames
   - Animated frames
   - Premium frames

### Long-term (3-6 months)

1. **3D Avatars**
   - 3D avatar creation
   - VRM format support
   - AR preview

2. **Avatar Marketplace**
   - Buy/sell avatar designs
   - Commission custom avatars
   - Avatar NFTs

3. **Social Features**
   - Avatar reactions
   - Avatar emotes
   - Avatar accessories

---

## Related Documentation

- [Pinata IPFS Integration](./PINATA_IPFS_INTEGRATION.md)
- [User Profile Service](../architecture/API_REFERENCE.md#userprofileservice)
- [Multi-language Support](../guides/INTERNATIONALIZATION.md)

---

## Support

For issues or questions:
- Check troubleshooting section
- Review [IPFS Integration docs](./PINATA_IPFS_INTEGRATION.md)
- Create [GitHub Issue](https://github.com/everest-an/dchat/issues)

---

**Document Version**: 1.0.0  
**Last Updated**: October 30, 2025  
**Maintained by**: Dchat Development Team

# Pinata IPFS Integration

> **Status**: ✅ Production Ready  
> **Version**: 1.0.0  
> **Last Updated**: October 30, 2025  
> **Deployment**: https://www.dchat.pro

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Implementation](#implementation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Future Improvements](#future-improvements)

---

## Overview

This document describes the complete integration of Pinata IPFS service into Dchat, enabling decentralized file storage for user avatars, group files, and message attachments.

### What is IPFS?

**IPFS (InterPlanetary File System)** is a peer-to-peer hypermedia protocol designed to make the web faster, safer, and more open. Files stored on IPFS are:
- **Decentralized**: No single point of failure
- **Permanent**: Content-addressed storage
- **Global**: Accessible from anywhere
- **Censorship-resistant**: Cannot be taken down

### Why Pinata?

**Pinata** is a leading IPFS pinning service that provides:
- Reliable IPFS infrastructure
- Fast global CDN
- Simple API integration
- Dedicated gateways
- File management dashboard

---

## Features

### Core Capabilities

1. **JWT Authentication**
   - Secure API access using JWT tokens
   - Environment variable configuration
   - Automatic token refresh

2. **File Upload**
   - Support for all file types
   - Automatic IPFS pinning
   - Progress tracking
   - Error handling

3. **File Retrieval**
   - Fast CDN delivery
   - Custom gateway support
   - Direct IPFS access
   - Fallback mechanisms

4. **File Management**
   - List uploaded files
   - Delete files
   - Update metadata
   - Search functionality

---

## Architecture

### System Design

```
┌─────────────────────────────────────────┐
│         React Components                │
│  (AvatarUpload, FileUpload, etc.)       │
└─────────────┬───────────────────────────┘
              │
              │ uploadFile()
              │ getFileUrl()
              ▼
┌─────────────────────────────────────────┐
│         IPFSService                     │
│  - uploadFile(file, metadata)           │
│  - getFileUrl(hash)                     │
│  - deleteFile(hash)                     │
│  - listFiles()                          │
└─────────────┬───────────────────────────┘
              │
              │ HTTP POST/GET
              ▼
┌─────────────────────────────────────────┐
│         Pinata API                      │
│  POST /pinning/pinFileToIPFS            │
│  GET  /data/pinList                     │
│  DELETE /pinning/unpin/{hash}           │
└─────────────┬───────────────────────────┘
              │
              │ Store & Pin
              ▼
┌─────────────────────────────────────────┐
│         IPFS Network                    │
│  - Distributed storage                  │
│  - Content addressing                   │
│  - Global replication                   │
└─────────────────────────────────────────┘
```

### Data Flow

1. **Upload Flow**:
   ```
   User selects file
   → Component calls IPFSService.uploadFile()
   → Service sends file to Pinata API
   → Pinata pins file to IPFS
   → Returns IPFS hash (CID)
   → Service returns gateway URL
   → Component displays success
   ```

2. **Retrieval Flow**:
   ```
   Component needs file
   → Calls IPFSService.getFileUrl(hash)
   → Service constructs gateway URL
   → Returns: https://gateway.pinata.cloud/ipfs/{hash}
   → Component loads file from URL
   ```

---

## Implementation

### File Structure

```
frontend/
├── src/
│   ├── services/
│   │   └── ipfsService.js        # Main IPFS service
│   ├── components/
│   │   ├── AvatarUpload.jsx      # Avatar upload component
│   │   └── FileUpload.jsx        # Generic file upload
│   └── utils/
│       └── ipfsHelpers.js        # IPFS utility functions
```

### Key Files

#### 1. ipfsService.js

**Purpose**: Core service for IPFS operations

**Key Methods**:
- `uploadFile(file, metadata)` - Upload file to IPFS
- `getFileUrl(hash)` - Get gateway URL for IPFS hash
- `deleteFile(hash)` - Unpin file from IPFS
- `listFiles()` - List all pinned files

**Code Structure**:
```javascript
class IPFSService {
  constructor() {
    this.jwt = import.meta.env.VITE_PINATA_JWT
    this.gateway = import.meta.env.VITE_PINATA_GATEWAY
    this.apiUrl = 'https://api.pinata.cloud'
  }

  async uploadFile(file, metadata = {}) {
    // Implementation
  }

  getFileUrl(hash) {
    // Implementation
  }
}

export default new IPFSService()
```

#### 2. AvatarUpload.jsx

**Purpose**: UI component for avatar upload

**Features**:
- Drag & drop support
- Image preview
- File validation
- Progress indicator
- Error handling

**Integration**:
```javascript
import ipfsService from '../services/ipfsService'

const handleUpload = async (file) => {
  const result = await ipfsService.uploadFile(file, {
    name: 'avatar',
    type: 'image'
  })
  
  setAvatarUrl(result.url)
  setIpfsHash(result.hash)
}
```

---

## Configuration

### Environment Variables

Required environment variables in `.env` or Vercel:

```bash
# Pinata JWT Token (Required)
VITE_PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Pinata Gateway URL (Optional)
VITE_PINATA_GATEWAY=https://green-jittery-gecko-888.mypinata.cloud/ipfs/

# API Endpoint (Optional, defaults to Pinata)
VITE_IPFS_API_URL=https://api.pinata.cloud
```

### Obtaining Pinata Credentials

1. **Create Pinata Account**
   - Visit https://app.pinata.cloud
   - Sign up for free account
   - Verify email

2. **Generate API Key**
   - Go to "API Keys" section
   - Click "New Key"
   - Name: "dchat-production"
   - Enable "Admin" permissions
   - Click "Create Key"

3. **Copy JWT Token**
   - Copy the JWT token (starts with `eyJ`)
   - Store securely
   - **Important**: Token only shown once!

4. **Get Gateway URL**
   - Go to "Gateways" section
   - Copy your dedicated gateway URL
   - Format: `https://[subdomain].mypinata.cloud/ipfs/`

### Vercel Configuration

1. **Add Environment Variable**:
   ```bash
   # Via Vercel Dashboard
   Project Settings → Environment Variables → Add
   
   Key: VITE_PINATA_JWT
   Value: [Your JWT Token]
   Environments: Production, Preview, Development
   ```

2. **Redeploy**:
   ```bash
   # Trigger new deployment
   git push origin main
   
   # Or via Vercel Dashboard
   Deployments → Redeploy
   ```

---

## Usage

### Basic File Upload

```javascript
import ipfsService from './services/ipfsService'

// Upload a file
const uploadFile = async (file) => {
  try {
    const result = await ipfsService.uploadFile(file, {
      name: file.name,
      description: 'User uploaded file'
    })
    
    console.log('IPFS Hash:', result.hash)
    console.log('Gateway URL:', result.url)
    
    return result
  } catch (error) {
    console.error('Upload failed:', error)
  }
}
```

### Upload with Progress

```javascript
const uploadWithProgress = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  
  const xhr = new XMLHttpRequest()
  
  xhr.upload.addEventListener('progress', (e) => {
    const percent = (e.loaded / e.total) * 100
    console.log(`Upload progress: ${percent}%`)
  })
  
  xhr.addEventListener('load', () => {
    const result = JSON.parse(xhr.responseText)
    console.log('Upload complete:', result)
  })
  
  xhr.open('POST', 'https://api.pinata.cloud/pinning/pinFileToIPFS')
  xhr.setRequestHeader('Authorization', `Bearer ${jwt}`)
  xhr.send(formData)
}
```

### Retrieve File

```javascript
// Get gateway URL
const url = ipfsService.getFileUrl('QmXxx...')
console.log(url)
// Output: https://green-jittery-gecko-888.mypinata.cloud/ipfs/QmXxx...

// Use in img tag
<img src={ipfsService.getFileUrl(hash)} alt="IPFS file" />
```

### Delete File

```javascript
const deleteFile = async (hash) => {
  try {
    await ipfsService.deleteFile(hash)
    console.log('File unpinned from IPFS')
  } catch (error) {
    console.error('Delete failed:', error)
  }
}
```

---

## API Reference

### IPFSService Class

#### uploadFile(file, metadata)

Upload a file to IPFS via Pinata.

**Parameters**:
- `file` (File): The file object to upload
- `metadata` (Object): Optional metadata
  - `name` (string): File name
  - `description` (string): File description
  - `keyvalues` (Object): Custom key-value pairs

**Returns**: Promise<Object>
```javascript
{
  hash: 'QmXxx...',           // IPFS CID
  url: 'https://...',         // Gateway URL
  size: 1024,                 // File size in bytes
  timestamp: '2025-10-30'     // Upload timestamp
}
```

**Example**:
```javascript
const result = await ipfsService.uploadFile(file, {
  name: 'avatar.png',
  description: 'User avatar',
  keyvalues: {
    userId: '0x123...',
    type: 'avatar'
  }
})
```

#### getFileUrl(hash)

Get the gateway URL for an IPFS hash.

**Parameters**:
- `hash` (string): IPFS CID (Content Identifier)

**Returns**: string - Full gateway URL

**Example**:
```javascript
const url = ipfsService.getFileUrl('QmXxx...')
// Returns: 'https://green-jittery-gecko-888.mypinata.cloud/ipfs/QmXxx...'
```

#### deleteFile(hash)

Unpin a file from IPFS (removes from Pinata).

**Parameters**:
- `hash` (string): IPFS CID to unpin

**Returns**: Promise<void>

**Example**:
```javascript
await ipfsService.deleteFile('QmXxx...')
```

#### listFiles(options)

List all pinned files.

**Parameters**:
- `options` (Object): Optional filters
  - `status` (string): 'pinned' | 'unpinned'
  - `pageLimit` (number): Results per page
  - `pageOffset` (number): Page offset

**Returns**: Promise<Array>

**Example**:
```javascript
const files = await ipfsService.listFiles({
  status: 'pinned',
  pageLimit: 10
})
```

---

## Testing

### Manual Testing

1. **Open Browser Console**:
   ```javascript
   // Test upload
   const input = document.createElement('input')
   input.type = 'file'
   input.onchange = async (e) => {
     const file = e.target.files[0]
     const result = await ipfsService.uploadFile(file)
     console.log('Uploaded:', result)
   }
   input.click()
   ```

2. **Verify Upload**:
   - Check console for IPFS hash
   - Copy gateway URL
   - Open URL in new tab
   - Verify file loads correctly

3. **Test Retrieval**:
   ```javascript
   const url = ipfsService.getFileUrl('QmXxx...')
   console.log(url)
   ```

### Automated Testing

```javascript
// test/ipfsService.test.js
import { describe, it, expect } from 'vitest'
import ipfsService from '../src/services/ipfsService'

describe('IPFSService', () => {
  it('should upload file to IPFS', async () => {
    const file = new File(['test'], 'test.txt')
    const result = await ipfsService.uploadFile(file)
    
    expect(result.hash).toMatch(/^Qm[a-zA-Z0-9]{44}$/)
    expect(result.url).toContain('ipfs')
  })
  
  it('should generate correct gateway URL', () => {
    const hash = 'QmTest123'
    const url = ipfsService.getFileUrl(hash)
    
    expect(url).toContain(hash)
    expect(url).toContain('ipfs')
  })
})
```

### Performance Testing

```javascript
// Test upload speed
console.time('upload')
await ipfsService.uploadFile(largeFile)
console.timeEnd('upload')

// Test concurrent uploads
const files = [file1, file2, file3]
const results = await Promise.all(
  files.map(f => ipfsService.uploadFile(f))
)
console.log('Uploaded', results.length, 'files')
```

---

## Troubleshooting

### Common Issues

#### 1. "IPFS service not configured"

**Cause**: Missing JWT token

**Solution**:
```bash
# Check environment variable
console.log(import.meta.env.VITE_PINATA_JWT)

# If undefined, add to .env.local
VITE_PINATA_JWT=your_jwt_token_here

# Restart dev server
npm run dev
```

#### 2. "Upload failed: 401 Unauthorized"

**Cause**: Invalid or expired JWT token

**Solution**:
1. Generate new API key in Pinata dashboard
2. Update environment variable
3. Redeploy application

#### 3. "File too large"

**Cause**: File exceeds size limit

**Solution**:
```javascript
// Add file size validation
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

if (file.size > MAX_SIZE) {
  throw new Error('File too large. Maximum size is 5MB')
}
```

#### 4. "Slow upload speed"

**Cause**: Network latency or large file

**Solutions**:
- Compress images before upload
- Use progressive upload for large files
- Implement retry logic
- Show progress indicator

#### 5. "Gateway timeout"

**Cause**: IPFS gateway overloaded

**Solution**:
```javascript
// Use fallback gateways
const gateways = [
  'https://green-jittery-gecko-888.mypinata.cloud/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.io/ipfs/'
]

const getFileUrl = (hash) => {
  return gateways[0] + hash // Try first gateway
}
```

---

## Future Improvements

### Short-term (1-2 weeks)

1. **File Compression**
   - Automatic image compression
   - Reduce upload size
   - Faster uploads

2. **Caching**
   - Cache IPFS URLs
   - Reduce API calls
   - Improve performance

3. **Retry Logic**
   - Automatic retry on failure
   - Exponential backoff
   - Better error handling

### Medium-term (1-2 months)

1. **File Encryption**
   - End-to-end encryption
   - Encrypted IPFS storage
   - Key management

2. **Batch Upload**
   - Upload multiple files
   - Progress tracking
   - Parallel uploads

3. **File Preview**
   - Generate thumbnails
   - Preview before upload
   - Image optimization

### Long-term (3-6 months)

1. **Direct IPFS Integration**
   - Remove Pinata dependency
   - Direct IPFS node connection
   - Lower costs

2. **Blockchain Storage**
   - Store IPFS hashes on-chain
   - Immutable references
   - Decentralized registry

3. **CDN Integration**
   - Custom CDN for faster delivery
   - Edge caching
   - Global distribution

---

## Related Documentation

- [Avatar Upload Feature](./AVATAR_UPLOAD_FEATURE.md)
- [Group Chat Feature](./GROUP_CHAT_FEATURE.md)
- [System Architecture](../architecture/SYSTEM_ARCHITECTURE.md)

---

## Support

For issues or questions:
- Check [Pinata Documentation](https://docs.pinata.cloud)
- Review [IPFS Documentation](https://docs.ipfs.tech)
- Create [GitHub Issue](https://github.com/everest-an/dchat/issues)

---

**Document Version**: 1.0.0  
**Last Updated**: October 30, 2025  
**Maintained by**: Dchat Development Team

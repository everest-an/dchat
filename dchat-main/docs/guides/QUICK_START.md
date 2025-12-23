# Quick Start Guide

> **Target Audience**: New developers joining the Dchat project  
> **Time to Complete**: 30-60 minutes  
> **Prerequisites**: Basic knowledge of React and JavaScript

## Table of Contents
- [Introduction](#introduction)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Project Structure](#project-structure)
- [Running the Application](#running-the-application)
- [Understanding the Codebase](#understanding-the-codebase)
- [Making Your First Change](#making-your-first-change)
- [Testing](#testing)
- [Deployment](#deployment)
- [Next Steps](#next-steps)

---

## Introduction

Welcome to Dchat! This guide will help you set up your development environment and understand the project structure. By the end of this guide, you'll be able to:

- ✅ Run Dchat locally
- ✅ Understand the codebase structure
- ✅ Make and test changes
- ✅ Deploy your changes

---

## Prerequisites

### Required Software

1. **Node.js** (v18 or higher)
   ```bash
   # Check version
   node --version
   
   # Install from https://nodejs.org if needed
   ```

2. **npm** (v9 or higher)
   ```bash
   # Check version
   npm --version
   ```

3. **Git**
   ```bash
   # Check version
   git --version
   
   # Install from https://git-scm.com if needed
   ```

### Required Accounts

1. **GitHub Account**: For code access
2. **Pinata Account**: For IPFS storage (free tier is fine)
3. **Vercel Account**: For deployment (optional)

### Recommended Tools

- **VS Code**: Code editor with React extensions
- **MetaMask**: Web3 wallet for testing
- **Postman**: API testing (optional)

---

## Installation

### 1. Clone the Repository

```bash
# Clone the repository
git clone https://github.com/everest-an/dchat.git

# Navigate to project directory
cd dchat

# Navigate to frontend
cd frontend
```

### 2. Install Dependencies

```bash
# Install all dependencies
npm install

# This will install:
# - React and related packages
# - Vite build tool
# - TailwindCSS
# - Other dependencies
```

### 3. Configure Environment Variables

```bash
# Create environment file
cp .env.example .env.local

# Edit .env.local with your credentials
nano .env.local
```

**Required Environment Variables**:
```bash
# Pinata IPFS Configuration
VITE_PINATA_JWT=your_jwt_token_here
VITE_PINATA_GATEWAY=https://your-gateway.mypinata.cloud/ipfs/

# Optional: API endpoints
VITE_API_URL=http://localhost:3000
```

**Getting Pinata Credentials**:

1. Visit https://app.pinata.cloud
2. Sign up for free account
3. Go to "API Keys" section
4. Click "New Key"
5. Name it "dchat-dev"
6. Enable "Admin" permissions
7. Copy the JWT token
8. Go to "Gateways" section
9. Copy your gateway URL

### 4. Verify Installation

```bash
# Check if everything is installed correctly
npm run check

# Or manually check
npm list react
npm list vite
```

---

## Project Structure

### Overview

```
dchat/
├── frontend/                 # Frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # Business logic
│   │   ├── contexts/        # React contexts
│   │   ├── locales/         # Translations
│   │   ├── utils/           # Utility functions
│   │   └── App.jsx          # Main app component
│   ├── public/              # Static assets
│   ├── package.json         # Dependencies
│   └── vite.config.js       # Vite configuration
├── docs/                    # Documentation
│   ├── features/            # Feature docs
│   ├── guides/              # Developer guides
│   └── architecture/        # Architecture docs
└── README.md                # Project readme
```

### Key Directories

#### `/src/components`

React components organized by feature:

```
components/
├── ChatList.jsx              # Chat list view
├── ChatRoom.jsx              # One-on-one chat
├── GroupChat.jsx             # Group chat interface
├── AvatarUpload.jsx          # Avatar upload
└── dialogs/                  # Dialog components
    ├── CreateGroupDialog.jsx
    ├── EditProfileDialog.jsx
    └── GroupSettingsDialog.jsx
```

#### `/src/services`

Business logic and data management:

```
services/
├── GroupService.js           # Group management (900+ lines)
├── GroupMessageService.js    # Messaging (600+ lines)
├── UserProfileService.js     # User profiles
└── ipfsService.js            # IPFS operations
```

#### `/src/locales`

Multi-language support:

```
locales/
├── en.js                     # English translations
└── zh.js                     # Chinese translations
```

---

## Running the Application

### Development Mode

```bash
# Start development server
npm run dev

# Output:
# VITE v5.0.0  ready in 500 ms
# ➜  Local:   http://localhost:5173/
# ➜  Network: use --host to expose
```

**Open in browser**: http://localhost:5173

### Build for Production

```bash
# Create production build
npm run build

# Output will be in /dist directory
```

### Preview Production Build

```bash
# Preview production build locally
npm run preview

# Open: http://localhost:4173
```

---

## Understanding the Codebase

### Application Entry Point

**File**: `src/main.jsx`

```javascript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

### Main App Component

**File**: `src/App.jsx`

```javascript
import { LanguageProvider } from './contexts/LanguageContext'
import { UserProvider } from './contexts/UserContext'
import ChatList from './components/ChatList'

function App() {
  return (
    <LanguageProvider>
      <UserProvider>
        <div className="app">
          <ChatList />
        </div>
      </UserProvider>
    </LanguageProvider>
  )
}

export default App
```

### Service Layer Example

**File**: `src/services/GroupService.js`

```javascript
class GroupService {
  // Create a new group
  async createGroup(groupData) {
    // Validate data
    // Generate group ID
    // Upload to IPFS
    // Save to localStorage
    // Return group object
  }
  
  // Add a member
  async addMember(groupId, memberData, userId) {
    // Check permissions
    // Add member to group
    // Update IPFS
    // Save changes
  }
}

export default new GroupService()
```

### Component Example

**File**: `src/components/AvatarUpload.jsx`

```jsx
import { useState } from 'react'
import ipfsService from '../services/ipfsService'

function AvatarUpload({ currentAvatar, onAvatarChange }) {
  const [uploading, setUploading] = useState(false)
  
  const handleUpload = async (file) => {
    setUploading(true)
    try {
      const result = await ipfsService.uploadFile(file)
      onAvatarChange(result)
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setUploading(false)
    }
  }
  
  return (
    <div>
      {/* Upload UI */}
    </div>
  )
}

export default AvatarUpload
```

---

## Making Your First Change

### Example: Add a Welcome Message

1. **Open the file**:
   ```bash
   # Open ChatList component
   code src/components/ChatList.jsx
   ```

2. **Find the render method**:
   ```jsx
   return (
     <div className="chat-list">
       {/* Existing code */}
     </div>
   )
   ```

3. **Add your message**:
   ```jsx
   return (
     <div className="chat-list">
       <div className="welcome-message">
         Welcome to Dchat! 👋
       </div>
       {/* Existing code */}
     </div>
   )
   ```

4. **Add styling** (optional):
   ```jsx
   <div className="welcome-message text-center p-4 bg-blue-100 rounded-lg mb-4">
     Welcome to Dchat! 👋
   </div>
   ```

5. **Save and check**:
   - Save the file (Ctrl+S / Cmd+S)
   - Browser will auto-reload
   - See your changes immediately

6. **Commit your change**:
   ```bash
   git add src/components/ChatList.jsx
   git commit -m "feat: Add welcome message to chat list"
   ```

---

## Testing

### Manual Testing

1. **Test User Flow**:
   ```
   1. Open app → Login page should appear
   2. Click "Email" → Email input should show
   3. Enter email → Continue button enabled
   4. Click Continue → Chat list should load
   5. Click "Create Group" → Dialog should open
   6. Fill form → Create button enabled
   7. Click Create → Group should be created
   ```

2. **Test Features**:
   - Avatar upload
   - Group creation
   - Send message
   - File upload
   - Language switch

### Console Testing

```javascript
// Open browser console (F12)

// Test GroupService
const GroupService = (await import('/src/services/GroupService.js')).default

// Create test group
const group = await GroupService.createGroup({
  name: "Test Group",
  creator: "0x123...",
  members: [{
    address: "0x123...",
    role: "admin"
  }]
})

console.log('Group created:', group)
```

### Automated Testing

```bash
# Run tests (if configured)
npm run test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

---

## Deployment

### Deploy to Vercel

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   # From frontend directory
   vercel
   
   # Follow prompts:
   # - Set up project? Yes
   # - Link to existing project? No
   # - Project name: dchat
   # - Directory: ./
   # - Override settings? No
   ```

4. **Configure Environment Variables**:
   ```bash
   # Add environment variables
   vercel env add VITE_PINATA_JWT
   # Paste your JWT token
   
   vercel env add VITE_PINATA_GATEWAY
   # Paste your gateway URL
   ```

5. **Deploy to Production**:
   ```bash
   vercel --prod
   ```

### Deploy via GitHub

1. **Push to GitHub**:
   ```bash
   git push origin main
   ```

2. **Vercel will automatically**:
   - Detect the push
   - Build the project
   - Deploy to production
   - Update the URL

---

## Next Steps

### Learn More

1. **Read Feature Documentation**:
   - [Group Chat Feature](../features/GROUP_CHAT_FEATURE.md)
   - [Avatar Upload](../features/AVATAR_UPLOAD_FEATURE.md)
   - [IPFS Integration](../features/PINATA_IPFS_INTEGRATION.md)

2. **Study Architecture**:
   - [System Architecture](../architecture/SYSTEM_ARCHITECTURE.md)
   - [API Reference](../architecture/API_REFERENCE.md)

3. **Review Code**:
   - Read through service files
   - Understand component structure
   - Learn state management patterns

### Practice Tasks

1. **Easy**:
   - Add a new translation key
   - Change button colors
   - Add a console log

2. **Medium**:
   - Add a new field to user profile
   - Create a new dialog component
   - Implement a new filter

3. **Hard**:
   - Add a new service method
   - Implement a new feature
   - Optimize performance

### Get Help

- **Documentation**: Check docs folder
- **Code Comments**: Read inline comments
- **GitHub Issues**: Search existing issues
- **Team Chat**: Ask in development channel

---

## Common Issues

### Issue: "Module not found"

**Solution**:
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

### Issue: "IPFS upload failed"

**Solution**:
```bash
# Check environment variables
echo $VITE_PINATA_JWT

# If empty, add to .env.local
# Restart dev server
```

### Issue: "Port already in use"

**Solution**:
```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9

# Or use different port
npm run dev -- --port 3000
```

---

## Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build

# Code Quality
npm run lint             # Run linter
npm run format           # Format code
npm run type-check       # Check TypeScript types

# Git
git status               # Check status
git add .                # Stage all changes
git commit -m "message"  # Commit changes
git push origin main     # Push to GitHub

# Vercel
vercel                   # Deploy to preview
vercel --prod            # Deploy to production
vercel logs              # View logs
```

---

## Resources

### Official Documentation
- [React](https://react.dev)
- [Vite](https://vitejs.dev)
- [TailwindCSS](https://tailwindcss.com)
- [IPFS](https://docs.ipfs.tech)
- [Pinata](https://docs.pinata.cloud)

### Project Documentation
- [Features](../features/)
- [Architecture](../architecture/)
- [Guides](../guides/)

### Community
- [GitHub Repository](https://github.com/everest-an/dchat)
- [GitHub Issues](https://github.com/everest-an/dchat/issues)
- [GitHub Discussions](https://github.com/everest-an/dchat/discussions)

---

**Welcome to the team! Happy coding! 🚀**

---

**Document Version**: 1.0.0  
**Last Updated**: October 30, 2025  
**Maintained by**: Dchat Development Team

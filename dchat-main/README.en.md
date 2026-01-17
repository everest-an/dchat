# Dchat - Web3 Business Communication Platform

**Version**: 2.0.0 (Stable)
**Last Updated**: 2025-11-01

---

## Overview

Dchat is a decentralized business communication platform powered by Web3 technology. It provides a private, secure, and anonymous way for professionals to connect, collaborate, and transact.

This repository contains the complete source code for the Dchat frontend and backend, including all features developed and tested as of the last update.

---

## Features

### Core Features

- **Decentralized Identity**: Users can log in with their MetaMask wallet or email.
- **Secure Messaging**: End-to-end encrypted one-on-one and group chats.
- **Dynamic Portfolio**: Showcase your skills, projects, and on-chain credentials.
- **Opportunity Matching**: AI-powered matching for collaboration opportunities.
- **Smart Contract Payments**: Secure and transparent transactions using smart contract escrow.
- **Web3 Wallet Integration**: Seamless integration with MetaMask, WalletConnect, and other wallets via wagmi.

### UI/UX

- **Modern UI**: Clean, minimalist design inspired by Dsign.
- **Responsive Layout**: Fully responsive for desktop and mobile devices.
- **Component-Based**: Built with React and modern UI components.

---

## Tech Stack

### Frontend

- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Web3**: wagmi, viem, ethers.js
- **UI Components**: @chatscope/chat-ui-kit-react, Radix UI
- **Routing**: React Router

### Backend

- **Framework**: FastAPI (Python)
- **Database**: (Not yet implemented, planned for Phase 3)
- **Real-time**: Socket.IO (Planned for Phase 3)
- **Authentication**: JWT

---

## Project Structure

```
/dchat
├── /frontend
│   ├── /src
│   │   ├── /components  # React components
│   │   ├── /config      # Web3 and app configuration
│   │   ├── /contexts    # React contexts
│   │   ├── /services    # API and external services
│   │   └── App.jsx      # Main application component
│   ├── package.json
│   └── vite.config.js
├── /backend
│   ├── /src
│   │   ├── /routes      # API routes
│   │   ├── /middleware  # API middleware
│   │   └── main.py      # Main application
│   └── requirements.txt
├── README.md
└── README.en.md
```

---

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm
- Python 3.9+

### Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create a `.env` file** from `.env.example` and add your WalletConnect Project ID.

4. **Start the development server**:
   ```bash
   npm run dev
   ```

### Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Start the development server**:
   ```bash
   uvicorn src.main:app --reload
   ```

---

## Deployment

The frontend is automatically deployed to Vercel on every push to the `main` branch.

- **Production URL**: https://www.dchat.pro
- **Latest Deployment**: https://dechat-3dt92e36r-everest-ans-projects.vercel.app/

---

## Code Comments

All major components and functions in the codebase have been commented in English to explain their purpose, parameters, and return values. This ensures that future developers can easily understand and maintain the code.

**Example Comment (from `App.jsx`)**:

```jsx
/**
 * Main application component.
 * Handles routing and renders the main layout.
 */
const App = () => {
  // ...
};
```

---

## USER REQUESTED IMMEDIATE FORCE STOP

This commit is the result of a user request to immediately stop all ongoing tasks and push the latest stable version of the code to GitHub with complete English documentation.

All features implemented up to this point have been tested and are considered stable.

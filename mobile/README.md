# Dchat Mobile App

**Platform:** iOS + Android  
**Framework:** React Native 0.73  
**Status:** 🚧 In Development

---

## 📱 Overview

Dchat Mobile is the native mobile application for the Dchat blockchain-based business communication platform. It provides a seamless, Telegram-like experience with integrated cryptocurrency wallet and payment features.

### Key Features

- ✅ **Secure Messaging** - End-to-end encrypted chat
- ✅ **Custodial Wallet** - Built-in cryptocurrency wallet
- ✅ **In-Chat Transfers** - Send money directly in conversations
- ✅ **Multi-Token Support** - ETH, USDT, USDC, DAI, WETH
- ✅ **Biometric Auth** - Face ID / Touch ID / Fingerprint
- ✅ **Push Notifications** - Real-time message alerts
- ✅ **QR Code Scanner** - Easy wallet address scanning
- ✅ **Offline Mode** - Read messages offline

---

## 🏗️ Architecture

### Project Structure

```
mobile/
├── android/              # Android native code
├── ios/                  # iOS native code
├── src/
│   ├── screens/         # Screen components
│   │   ├── Auth/        # Authentication screens
│   │   ├── Chat/        # Chat screens
│   │   ├── Wallet/      # Wallet screens
│   │   └── Profile/     # Profile screens
│   ├── components/      # Reusable components
│   │   ├── common/      # Common UI components
│   │   ├── chat/        # Chat-specific components
│   │   └── wallet/      # Wallet-specific components
│   ├── navigation/      # Navigation configuration
│   ├── services/        # API services
│   │   ├── api.ts       # API client
│   │   ├── auth.ts      # Authentication service
│   │   ├── chat.ts      # Chat service
│   │   └── wallet.ts    # Wallet service
│   ├── store/           # State management (Zustand)
│   │   ├── authStore.ts
│   │   ├── chatStore.ts
│   │   └── walletStore.ts
│   ├── utils/           # Utility functions
│   │   ├── crypto.ts    # Cryptography utilities
│   │   ├── format.ts    # Formatting utilities
│   │   └── validation.ts # Validation utilities
│   ├── assets/          # Images, fonts, etc.
│   ├── i18n/            # Internationalization
│   ├── types/           # TypeScript types
│   └── constants/       # Constants
├── package.json
├── tsconfig.json
├── babel.config.js
└── README.md
```

### Tech Stack

**Core:**
- React Native 0.73
- TypeScript 5.3
- React Navigation 6.x

**State Management:**
- Zustand (lightweight alternative to Redux)

**Web3:**
- Ethers.js 6.x
- WalletConnect 2.x

**Storage:**
- MMKV (fast key-value storage)
- AsyncStorage (fallback)
- React Native Keychain (secure storage)

**UI:**
- React Native Vector Icons
- React Native Linear Gradient
- React Native SVG
- React Native Modal

**Utilities:**
- Axios (HTTP client)
- date-fns (date formatting)
- i18next (internationalization)

---

## 🚀 Getting Started

### Prerequisites

**Required:**
- Node.js 18+
- npm 9+ or yarn
- React Native CLI
- Xcode 14+ (for iOS)
- Android Studio (for Android)
- CocoaPods (for iOS)

**Optional:**
- Java JDK 17 (for Android)
- Watchman (for macOS)

### Installation

```bash
# Navigate to mobile directory
cd mobile

# Install dependencies
npm install

# iOS only: Install CocoaPods
cd ios && pod install && cd ..
```

### Running the App

**iOS:**
```bash
npm run ios
# or
npx react-native run-ios
```

**Android:**
```bash
npm run android
# or
npx react-native run-android
```

**Start Metro Bundler:**
```bash
npm start
```

---

## 🔧 Configuration

### Environment Variables

Create `.env` file in the mobile directory:

```env
# API Configuration
API_BASE_URL=https://api.dchat.pro
WS_BASE_URL=wss://ws.dchat.pro

# Web3 Configuration
INFURA_PROJECT_ID=your_infura_project_id
WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# App Configuration
APP_ENV=development
ENABLE_LOGGING=true
```

### iOS Configuration

1. Open `ios/Dchat.xcworkspace` in Xcode
2. Select your development team
3. Configure signing & capabilities
4. Add required permissions in `Info.plist`:
   - Camera Usage
   - Photo Library Usage
   - Face ID Usage
   - Push Notifications

### Android Configuration

1. Open `android/` in Android Studio
2. Configure signing in `android/app/build.gradle`
3. Add required permissions in `AndroidManifest.xml`:
   - CAMERA
   - READ_EXTERNAL_STORAGE
   - WRITE_EXTERNAL_STORAGE
   - USE_BIOMETRIC
   - RECEIVE_PUSH_NOTIFICATIONS

---

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### E2E Testing

```bash
# Install Detox
npm install -g detox-cli

# Build for testing (iOS)
detox build --configuration ios.sim.debug

# Run E2E tests (iOS)
detox test --configuration ios.sim.debug
```

---

## 📦 Building for Production

### iOS

```bash
# Build release version
npm run build:ios

# Or use Xcode
# 1. Open ios/Dchat.xcworkspace
# 2. Select "Generic iOS Device"
# 3. Product > Archive
# 4. Distribute App
```

### Android

```bash
# Build release APK
npm run build:android

# Output: android/app/build/outputs/apk/release/app-release.apk

# Build AAB (for Google Play)
cd android
./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

---

## 🔒 Security

### Best Practices

1. **Private Key Storage**
   - Never store private keys in plain text
   - Use React Native Keychain for secure storage
   - Encrypt sensitive data before storing

2. **API Security**
   - Use HTTPS only
   - Implement certificate pinning
   - Validate all API responses

3. **Biometric Authentication**
   - Enable Face ID / Touch ID
   - Fallback to PIN/password
   - Lock app after inactivity

4. **Code Obfuscation**
   - Enable ProGuard (Android)
   - Enable bitcode (iOS)
   - Remove console logs in production

---

## 🌍 Internationalization

Supported languages:
- English (en)
- Chinese (zh)

Add new language:
```typescript
// src/i18n/locales/es.json
{
  "welcome": "Bienvenido",
  "login": "Iniciar sesión"
}
```

---

## 📱 App Features

### 1. Authentication

- **Wallet Connect** - Connect with MetaMask, Trust Wallet, etc.
- **Biometric Auth** - Face ID / Touch ID / Fingerprint
- **PIN Code** - 6-digit PIN for quick access
- **Session Management** - Auto-logout after inactivity

### 2. Chat

- **Real-time Messaging** - WebSocket-based chat
- **Message Types** - Text, images, files, transfers
- **Read Receipts** - See when messages are read
- **Typing Indicators** - See when someone is typing
- **Message Search** - Search through conversations
- **Push Notifications** - Get notified of new messages

### 3. Wallet

- **Multi-Token Support** - ETH, USDT, USDC, DAI, WETH
- **Balance Display** - Real-time balance updates
- **Transaction History** - View all transactions
- **Send/Receive** - Transfer tokens easily
- **QR Code** - Scan or share wallet address
- **Gas Estimation** - See transaction costs upfront

### 4. In-Chat Transfers

- **Quick Send** - Send money in chat
- **Claim Transfer** - Receive money sent to you
- **Transfer Status** - Track transfer status
- **24h Expiry** - Auto-refund if not claimed

### 5. Profile

- **User Info** - Name, bio, avatar
- **Projects** - Showcase your work
- **Skills** - List your expertise
- **Resources** - What you offer
- **Opportunities** - What you're looking for

---

## 🐛 Troubleshooting

### Common Issues

**Metro Bundler not starting:**
```bash
npm start -- --reset-cache
```

**iOS build fails:**
```bash
cd ios
pod deintegrate
pod install
cd ..
npm run ios
```

**Android build fails:**
```bash
cd android
./gradlew clean
cd ..
npm run android
```

**Dependencies not installing:**
```bash
rm -rf node_modules
rm package-lock.json
npm install
```

---

## 📚 Documentation

- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [React Navigation](https://reactnavigation.org/docs/getting-started)
- [Ethers.js](https://docs.ethers.org/v6/)
- [WalletConnect](https://docs.walletconnect.com/)

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License - see LICENSE file for details

---

## 📞 Support

- **GitHub Issues:** https://github.com/everest-an/dchat/issues
- **Email:** support@dchat.pro
- **Documentation:** https://docs.dchat.pro

---

**Status:** 🚧 In Development  
**Version:** 1.0.0  
**Last Updated:** November 5, 2025

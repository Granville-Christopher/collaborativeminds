# CollaborativeSuccess - Mobile App

A React Native mobile application built with Expo for monitoring Discord server activity, managing multiple Discord accounts, and tracking member joins/verifications in real-time.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [Screens](#screens)
- [Building the App](#building-the-app)
- [Deep Linking](#deep-linking)
- [Push Notifications](#push-notifications)
- [Discord Account Linking](#discord-account-linking)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

CollaborativeSuccess is a mobile application that allows users to:

- Monitor Discord servers for new member joins and verifications
- Link multiple Discord accounts (based on subscription tier)
- Receive real-time push notifications for server activity
- Manage subscriptions (Basic and Pro tiers)
- View activity history and filter by account
- Copy usernames directly from the feed

The app connects to a Flask backend API and uses Discord tokens to monitor server activity in real-time.

## ✨ Features

### Core Features

- 🔐 **Authentication**
  - User registration and login
  - Password reset via email deep links
  - JWT token-based session management
  - Persistent login with AsyncStorage

- 📱 **Discord Monitoring**
  - Real-time activity feed
  - Member join tracking
  - Verification event detection
  - Multi-account support
  - Account filtering

- 💳 **Subscription Management**
  - Basic tier: 5 Discord accounts
  - Pro tier: 10 Discord accounts
  - Paystack payment integration
  - Subscription status tracking
  - Automatic expiry detection

- 🔔 **Push Notifications**
  - Real-time notifications for new joins
  - Background notification support
  - Notification channel configuration
  - Duplicate prevention

- 🔗 **Discord Account Linking**
  - WebView-based Discord login
  - Automatic token extraction
  - Incognito mode for fresh sessions
  - Multiple account management

- 📊 **User Interface**
  - Drawer navigation
  - Pull-to-refresh
  - Account filtering dropdown
  - Copy-to-clipboard functionality
  - Subscription status display

## 📦 Prerequisites

- Node.js 18+ and npm/yarn
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app (for development) or EAS Build account
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

## 🚀 Installation

1. **Navigate to the mobile-app directory:**
```bash
cd mobile-app
```

2. **Install dependencies:**
```bash
npm install
# or
yarn install
```

3. **Configure the API URL** (if different from default):
   - Edit `App.js` and screen files to update `API_URL` constant
   - Default: `https://intelligent-gratitude-production.up.railway.app`

4. **Set up Firebase** (for push notifications):
   - Place `google-services.json` in the root directory
   - Configure Firebase project in Expo dashboard

## ⚙️ Configuration

### App Configuration

The app configuration is in `app.json`:

```json
{
  "expo": {
    "name": "CollaborativeSuccess",
    "slug": "collaborative-success",
    "version": "1.0.0",
    "scheme": "collaborativesuccess",
    "android": {
      "package": "com.collaborative.minds"
    },
    "ios": {
      "bundleIdentifier": "com.yourname.collaborativesuccess"
    }
  }
}
```

### EAS Build Configuration

Build profiles are configured in `eas.json`:
- **development**: Development client build
- **preview**: Internal distribution APK
- **production**: Production APK with auto-increment

## 🏃 Running the Application

### Development Mode

**Start the Expo development server:**
```bash
npm start
# or
expo start
```

**Run on Android:**
```bash
npm run android
# or
expo run:android
```

**Run on iOS:**
```bash
npm run ios
# or
expo run:ios
```

### Using Expo Go

1. Install Expo Go from App Store (iOS) or Play Store (Android)
2. Run `expo start`
3. Scan QR code with Expo Go app

## 📁 Project Structure

```
mobile-app/
├── App.js                    # Main app component with navigation
├── app.json                  # Expo configuration
├── eas.json                  # EAS Build configuration
├── package.json              # Dependencies and scripts
├── babel.config.js           # Babel configuration
├── assets/                   # Images and static assets
│   ├── icon.png             # App icon
│   └── beans.jpg            # Assets
├── screens/                  # Screen components
│   ├── WelcomeScreen.js     # Welcome/landing screen
│   ├── LoginScreen.js       # User login
│   ├── SignupScreen.js      # User registration
│   ├── ForgotPasswordScreen.js  # Password reset request
│   ├── ResetPasswordScreen.js   # Password reset form
│   ├── Dashboard.js         # Main activity feed
│   ├── ProfileScreen.js     # User profile and settings
│   ├── AccountLinkScreen.js # Discord account management
│   └── BlockedAccessScreen.js  # Subscription/payment screen
├── utils/                    # Utility functions
│   └── subscription.js      # Subscription helper functions
├── android/                  # Android native code
└── node_modules/            # Dependencies
```

## 📱 Screens

### Welcome Screen
- Landing page with app introduction
- Navigation to login/signup

### Login Screen
- Email and password authentication
- "Forgot Password" link
- Navigation to signup

### Signup Screen
- User registration form
- Email validation
- Password requirements

### Dashboard Screen
- Real-time activity feed
- Pull-to-refresh functionality
- Account filtering dropdown
- Link new Discord account button
- Copy username to clipboard
- WebView for Discord login

### Profile Screen
- User information display
- Subscription status
- Account management
- Logout functionality

### Account Link Screen
- List of linked Discord accounts
- Account details (username, Discord ID)
- Remove account functionality

### Blocked Access Screen
- Subscription upgrade/renewal
- Paystack payment integration
- Subscription tier information
- Payment status

## 🔨 Building the App

### Using EAS Build

**Install EAS CLI:**
```bash
npm install -g eas-cli
```

**Login to Expo:**
```bash
eas login
```

**Configure project:**
```bash
eas build:configure
```

**Build for Android (APK):**
```bash
eas build --platform android --profile preview
```

**Build for Production:**
```bash
eas build --platform android --profile production
```

**Build for iOS:**
```bash
eas build --platform ios --profile production
```

### Local Build (Android)

```bash
expo run:android
```

This will build and install the app on a connected Android device or emulator.

## 🔗 Deep Linking

The app supports deep linking for password reset:

**Scheme:** `collaborativesuccess://`

**Example:**
```
collaborativesuccess://reset-password?token=your_reset_token
```

The app automatically handles deep links and navigates to the appropriate screen.

## 🔔 Push Notifications

### Setup

1. **Configure Firebase:**
   - Add `google-services.json` to the project root
   - Configure Firebase project in Expo dashboard

2. **Request Permissions:**
   - App automatically requests notification permissions on first launch
   - Android notification channel is configured automatically

3. **Register Token:**
   - Push token is automatically registered when user logs in
   - Token is sent to backend API for notification delivery

### Notification Features

- Real-time notifications for new member joins
- Background notification support
- Notification sound and vibration
- Badge support (iOS)
- Notification channel management (Android)

## 🔐 Discord Account Linking

### How It Works

1. User taps "Link Account" button
2. WebView opens Discord login page (incognito mode)
3. User logs into Discord
4. JavaScript injection extracts Discord token
5. Token is sent to backend API
6. Account is linked and monitoring begins

### Token Extraction

The app uses advanced token extraction methods:
- Webpack module hook (primary method)
- iframe localStorage restoration (fallback)
- Continuous monitoring until token is captured

### Account Limits

- **Basic Tier**: 5 Discord accounts
- **Pro Tier**: 10 Discord accounts
- **Non-subscribed**: Cannot link accounts

## 🐛 Troubleshooting

### Common Issues

**App won't start:**
- Clear cache: `expo start -c`
- Delete `node_modules` and reinstall
- Check Node.js version (18+)

**Discord login not working:**
- Ensure WebView has internet permission
- Check if Discord website is accessible
- Try clearing WebView cache

**Push notifications not received:**
- Verify notification permissions are granted
- Check Firebase configuration
- Ensure backend API is sending notifications
- Verify push token is registered

**Build fails:**
- Check EAS Build logs
- Verify `eas.json` configuration
- Ensure all environment variables are set
- Check Android/iOS build requirements

**API connection errors:**
- Verify `API_URL` is correct
- Check network connectivity
- Verify backend server is running
- Check authentication token validity

### Debug Mode

Enable debug logging:
```javascript
// In App.js or any screen
console.log('Debug message');
```

View logs:
```bash
expo start
# Logs appear in terminal
```

For Android:
```bash
adb logcat | grep ReactNativeJS
```

## 📝 Development Notes

### Key Dependencies

- **React Native**: 0.81.5
- **Expo**: ~54.0.30
- **React Navigation**: Drawer navigation
- **React Native WebView**: Discord login integration
- **Expo Notifications**: Push notification support
- **AsyncStorage**: Local data persistence

### State Management

- Uses React hooks (`useState`, `useEffect`)
- AsyncStorage for persistent data
- Context/Props for user state sharing

### API Integration

All API calls use:
- Base URL: `https://intelligent-gratitude-production.up.railway.app`
- Authentication: JWT Bearer tokens
- Headers: `Authorization: Bearer <token>`

### Caching

- Activity feed is cached in AsyncStorage
- Cache key format: `cached_moves_{user_id}_{account_id}`
- Cache is cleared on account change

## 🔒 Security

### Best Practices

- Tokens stored securely in AsyncStorage
- HTTPS for all API communications
- JWT tokens expire after 7 days
- Discord tokens never exposed in UI
- WebView uses incognito mode for account linking

### Token Management

- JWT tokens stored in AsyncStorage
- Automatic token refresh on API calls
- Logout clears all stored data
- Deep link tokens are single-use

## 📄 License

[Your License Here]

## 👥 Support

For issues or questions:
- Check the troubleshooting section
- Review backend API documentation
- Contact: [Your Support Contact]

---

**Last Updated**: January 2026

# Setup Instructions

Follow these steps to set up and run the GamePlan app:

## Prerequisites

- Node.js (v18 or later)
- npm or yarn
- Expo CLI (will be installed automatically)
- Firebase account
- Google Cloud Console account (for Google Sign-In)

## 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project or select an existing one
3. Enable **Authentication**:
   - Go to Authentication > Sign-in method
   - Enable Google Sign-in provider
   - Add your app's SHA-1 fingerprint for Android (if building for Android)
4. Create a **Firestore Database**:
   - Go to Firestore Database
   - Create database in production mode or test mode
   - Set up security rules (see `SECURITY.md` for recommended rules)
5. Get your Firebase config:
   - Go to Project Settings > General
   - Scroll down to "Your apps"
   - Copy the Firebase SDK configuration

## 2. Google Sign-In Configuration

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your Firebase project
3. Go to APIs & Services > Credentials
4. Create OAuth 2.0 Client IDs for:
   - **Web application** (for Expo and testing)
   - **Android** (if building for Android)
   - **iOS** (if building for iOS)
5. Copy the Web Client ID

## 3. Environment Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Firebase credentials in `.env`:
   ```
   EXPO_PUBLIC_FIREBASE_API_KEY=your-api-key
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   EXPO_PUBLIC_FIREBASE_APP_ID=your-app-id
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
   ```

## 4. Install Dependencies

```bash
npm install
```

## 5. Run the App

### Development Server
```bash
npm start
```

This will start the Expo development server. You can then:
- Press `w` to open in web browser
- Press `a` to open in Android emulator
- Press `i` to open in iOS simulator (macOS only)
- Scan the QR code with Expo Go app on your phone

### Specific Platforms
```bash
npm run android  # Run on Android
npm run ios      # Run on iOS (macOS only)
npm run web      # Run in web browser
```

## 6. Firebase Security Rules

Set up Firestore security rules in Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Activities collection
    match /activities/{activityId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
        (resource.data.creatorId == request.auth.uid || 
         request.auth.uid in resource.data.participants);
      allow delete: if request.auth != null && resource.data.creatorId == request.auth.uid;
      
      // Messages subcollection
      match /messages/{messageId} {
        allow read: if request.auth != null && 
          request.auth.uid in get(/databases/$(database)/documents/activities/$(activityId)).data.participants;
        allow create: if request.auth != null && 
          request.auth.uid in get(/databases/$(database)/documents/activities/$(activityId)).data.participants;
      }
    }
  }
}
```

## 7. Testing

The app includes the following features to test:
- Google Sign-In authentication
- Creating a user profile with interests
- Creating activities
- Joining/leaving activities
- Real-time chat in activities
- Earning badges
- Adding activities to calendar

## Troubleshooting

### Google Sign-In Not Working
- Make sure you've added the correct Web Client ID to `.env`
- Verify Google Sign-In is enabled in Firebase Console
- Check that OAuth 2.0 credentials are properly configured in Google Cloud Console

### Build Errors
- Clear cache: `npx expo start -c`
- Reinstall dependencies: `rm -rf node_modules package-lock.json && npm install`

### Firebase Connection Issues
- Verify all environment variables are set correctly
- Check Firebase project settings
- Ensure Firestore database is created

## Next Steps

1. Customize the app colors and branding in `app.json`
2. Add more badge types in `src/utils/badges.ts`
3. Implement push notifications for activity updates
4. Add image upload for user profiles
5. Implement activity search with filters
6. Add more social features like following users

For more information, see the [README.md](README.md).

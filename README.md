# GamePlan

App designed to connect a community of individuals to go outside and participate in shared activities and goals.

Web (GitHub Pages): https://ayersdecker.github.io/gameplan/

## Features

- 🔐 **Google Sign-In Authentication** - Secure authentication with Firebase Auth
- 👤 **User Profiles** - Customizable profiles with interests and earned badges
- 🎯 **Activity Management** - Create, discover, and join activities
- 💬 **Activity Chat** - Real-time messaging for each activity
- 🏆 **Participation Badges** - Earn badges for achievements
- 📅 **Calendar Integration** - Add activities to your device calendar
- 🎨 **Clean UI** - Modern React Native interface with Expo Router

## Tech Stack

- **React Native** with **Expo**
- **TypeScript** for type safety
- **Expo Router** for navigation
- **Firebase Auth** + **Firestore** for backend
- **Google Sign-In** for authentication

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Firebase:
   - Create a Firebase project at https://console.firebase.google.com
   - Enable Google Sign-In in Authentication
   - Create a Firestore database
   - Copy `.env.example` to `.env` and fill in your Firebase credentials

4. Run the app:
   ```bash
   npm start
   ```

## Development

- `npm start` - Start the Expo development server
- `npm run android` - Run on Android emulator
- `npm run ios` - Run on iOS simulator (macOS only)
- `npm run web` - Run in web browser

## VS Code + Copilot Optimization

This project is optimized for VS Code with GitHub Copilot:
- Well-structured components with clear naming
- TypeScript types for better autocomplete
- Consistent code patterns for easier suggestions
- Comprehensive comments where needed

## Project Structure

```
/app
  /(auth)       - Authentication screens
  /(tabs)       - Main tab navigation screens
  /activities   - Activity-related screens
/src
  /components   - Reusable UI components
  /hooks        - Custom React hooks (useAuth)
  /services     - Firebase configuration
  /types        - TypeScript type definitions
  /utils        - Utility functions (badges, calendar)
```

## License

See LICENSE file for details.


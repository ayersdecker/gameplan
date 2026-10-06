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

   All web maps use OpenStreetMap tiles through Leaflet and do not require a map
   API key. Firebase
   credentials are needed for sign-in and activity data. Find these values in
   Firebase Console under **Project settings > General > Your apps > Web app >
   SDK setup and configuration > Config**. Use the Firebase web app's `apiKey`
   for `EXPO_PUBLIC_FIREBASE_API_KEY`, not a Google Maps key.

   After changing `.env`, restart Expo with `npx expo start --clear`. If these
   settings are missing or still contain placeholders, the app displays a
   configuration screen instead of attempting to initialize Firebase Auth.
   In the web app, select **Preview OpenStreetMap** on that screen to browse a
   map without configuring Firebase. This is a map-only preview; sign-in and
   activity data remain unavailable. Location permission is optional: the map
   opens to a world view and centers near you when location is available.

   The map renders independently of activity loading, with OpenStreetMap
   attribution visible. Internet access is required. The public tile service
   has no uptime guarantee; follow the
   [OpenStreetMap tile usage policy](https://operations.osmfoundation.org/policies/tiles/),
   including no bulk downloads or offline prefetching.

   Leaflet's stylesheet is bundled locally for development and production.
   Tile images explicitly use `strict-origin-when-cross-origin` to send the real
   page origin as the HTTP Referer, as required by OpenStreetMap. A browser
   extension or network policy that strips referrers can still prevent this.
   If tiles display **403 / Access blocked**, check the browser's Network panel
   for the tile request's Referer and consult the provider's
   [blocked-access guidance](https://osm.wiki/Blocked). An IP/network block
   requires resolution with the provider; do not bypass it with proxies or
   forged headers.

   For GitHub Pages, set the `EXPO_PUBLIC_FIREBASE_*` repository secrets used by
   the deployment workflow, then rebuild and redeploy. Environment variables are
   embedded in the web build; changing secrets alone does not update a deployed
   site.

4. Run the app:
   ```bash
   npm start
   ```

## Development

- `npm start` - Start the Expo development server
- `npm run android` - Run on Android emulator
- `npm run ios` - Run on iOS simulator (macOS only)
- `npm run web` - Run in web browser
- `node --test tests/map.test.cjs` - Test the keyless web map and configuration preview

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

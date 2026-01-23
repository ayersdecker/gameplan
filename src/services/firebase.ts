import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
};

const looksLikePlaceholder = (value: string) => {
  const normalized = value.trim().toLowerCase();
  return normalized === '' || normalized.startsWith('your-') || normalized.includes('your-api-key');
};

export const isFirebaseConfigured = () => {
  return (
    !looksLikePlaceholder(firebaseConfig.apiKey) &&
    !looksLikePlaceholder(firebaseConfig.authDomain) &&
    !looksLikePlaceholder(firebaseConfig.projectId)
  );
};

export const assertFirebaseConfigured = () => {
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase is not configured. Set EXPO_PUBLIC_FIREBASE_* env vars (local .env or GitHub Actions secrets) and redeploy.'
    );
  }
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
// NOTE: `expo export` (and Expo Router static rendering) executes parts of the app in a Node.js environment.
// Initializing Firebase Auth during SSR/SSG can crash the build (Auth expects a browser-like environment).
// We only initialize client-side; hooks/components should only use these in the browser/runtime.
const isServer = typeof window === 'undefined';

export const auth = isServer ? (null as unknown as ReturnType<typeof getAuth>) : getAuth(app);
export const db = isServer ? (null as unknown as ReturnType<typeof getFirestore>) : getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export default app;

import React, { createContext, useState, useEffect, useContext } from 'react';
import { User as FirebaseUser, signInWithCredential, signOut as firebaseSignOut, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { auth, db } from '../services/firebase';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Configure Google Sign-In
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'your-web-client-id.apps.googleusercontent.com',
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      if (firebaseUser) {
        // Fetch or create user profile
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'User',
            photoURL: firebaseUser.photoURL || undefined,
            interests: userData.interests || [],
            badges: userData.badges || [],
            createdAt: userData.createdAt?.toDate() || new Date(),
          });
        } else {
          // Create new user profile
          const newUser: User = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'User',
            photoURL: firebaseUser.photoURL || undefined,
            interests: [],
            badges: [],
            createdAt: new Date(),
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
          setUser(newUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      
      // Get the ID token from the response
      const idToken = userInfo.data?.idToken;
      
      if (!idToken) {
        throw new Error('No ID token received from Google Sign-In');
      }
      
      // Create a credential from the Google ID token
      const googleCredential = GoogleAuthProvider.credential(idToken);
      
      // Sign in with the credential
      await signInWithCredential(auth, googleCredential);
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await GoogleSignin.signOut();
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Sign Out Error:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

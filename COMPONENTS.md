# Component Reference

This document provides a reference for all components, hooks, and utilities in the GamePlan app. This helps GitHub Copilot provide better suggestions.

## Custom Hooks

### `useAuth()`
Located in: `src/hooks/useAuth.tsx`

Authentication hook that provides user state and authentication methods.

```typescript
const { user, firebaseUser, loading, signInWithGoogle, signOut } = useAuth();
```

**Returns:**
- `user: User | null` - Current user profile from Firestore
- `firebaseUser: FirebaseUser | null` - Firebase authentication user
- `loading: boolean` - Loading state during auth initialization
- `signInWithGoogle: () => Promise<void>` - Function to sign in with Google
- `signOut: () => Promise<void>` - Function to sign out

## Types

### User
```typescript
interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  interests: string[];
  badges: Badge[];
  createdAt: Date;
}
```

### Activity
```typescript
interface Activity {
  id: string;
  title: string;
  description: string;
  category: string;
  location?: string;
  date: Date;
  creatorId: string;
  creatorName: string;
  participants: string[];
  maxParticipants?: number;
  createdAt: Date;
}
```

### Message
```typescript
interface Message {
  id: string;
  activityId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  text: string;
  createdAt: Date;
}
```

### Badge
```typescript
interface Badge {
  id: string;
  name: string;
  description: string;
  iconName: string;
  earnedAt: Date;
}
```

## Utility Functions

### Badge Management
Located in: `src/utils/badges.ts`

#### `awardBadge(userId: string, badgeType: BadgeType)`
Awards a badge to a user if they don't already have it.

```typescript
await awardBadge(user.id, 'first_activity');
```

**Badge Types:**
- `first_activity` - Joined first activity
- `social_butterfly` - Joined 5 different activities
- `organizer` - Created first activity
- `consistent` - Joined activities 3 weeks in a row
- `early_adopter` - One of the first users

### Calendar Integration
Located in: `src/utils/calendar.ts`

#### `addActivityToCalendar(activity: Activity)`
Adds an activity to the device calendar.

```typescript
await addActivityToCalendar(activity);
```

#### `requestCalendarPermissions()`
Requests calendar permissions from the user.

```typescript
const hasPermission = await requestCalendarPermissions();
```

## Firebase Services

### Authentication
Located in: `src/services/firebase.ts`

```typescript
import { auth } from '../services/firebase';
```

### Firestore Database
```typescript
import { db } from '../services/firebase';
```

## Common Patterns

### Creating an Activity
```typescript
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

const activityData = {
  title: 'Morning Hike',
  description: 'Join us for a morning hike',
  category: 'Outdoor',
  location: 'Central Park',
  date: new Date('2024-12-25 09:00'),
  creatorId: user.id,
  creatorName: user.displayName,
  participants: [user.id],
  maxParticipants: 10,
  createdAt: serverTimestamp(),
};

await addDoc(collection(db, 'activities'), activityData);
```

### Joining an Activity
```typescript
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../services/firebase';

await updateDoc(doc(db, 'activities', activityId), {
  participants: arrayUnion(user.id),
});
```

### Sending a Message
```typescript
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

await addDoc(collection(db, 'activities', activityId, 'messages'), {
  activityId,
  userId: user.id,
  userName: user.displayName,
  userPhoto: user.photoURL || null,
  text: 'Hello!',
  createdAt: serverTimestamp(),
});
```

### Listening to Real-time Updates
```typescript
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

const unsubscribe = onSnapshot(
  query(collection(db, 'activities', activityId, 'messages'), orderBy('createdAt', 'asc')),
  (snapshot) => {
    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
    }));
    setMessages(messages);
  }
);

// Don't forget to unsubscribe
return () => unsubscribe();
```

### Updating User Profile
```typescript
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

await updateDoc(doc(db, 'users', user.id), {
  displayName: 'New Name',
  interests: ['Hiking', 'Running'],
});
```

## Navigation

### Navigating Between Screens
```typescript
import { useRouter } from 'expo-router';

const router = useRouter();

// Navigate to a screen
router.push('/activities/create');

// Navigate to activity detail
router.push(`/activities/${activityId}`);

// Go back
router.back();

// Replace current screen
router.replace('/(tabs)/home');
```

## Styling Conventions

### Common Style Patterns
```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    padding: 24,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

### Color Palette
- Primary: `#007AFF`
- Secondary: `#5AC8FA`
- Success: `#34C759`
- Warning: `#FF9500`
- Danger: `#FF3B30`
- Background: `#f5f5f5`
- Card: `#fff`
- Text: `#333`
- Text Secondary: `#666`
- Text Disabled: `#999`
- Border: `#e0e0e0`

## Error Handling

### Standard Error Pattern
```typescript
try {
  // Your code here
} catch (error) {
  console.error('Error description:', error);
  Alert.alert('Error', 'User-friendly error message');
}
```

## State Management

This app uses React hooks for state management:
- `useState` - Component-level state
- `useEffect` - Side effects and subscriptions
- `useContext` - Global auth state via AuthContext
- No Redux or external state management libraries

## Best Practices

1. **Always check authentication** before sensitive operations
2. **Use TypeScript types** for better type safety
3. **Handle loading states** for better UX
4. **Validate user input** before sending to Firebase
5. **Unsubscribe from listeners** to prevent memory leaks
6. **Use serverTimestamp()** for consistent timestamps
7. **Check for null/undefined** when accessing user data
8. **Provide user feedback** with Alert or Toast messages

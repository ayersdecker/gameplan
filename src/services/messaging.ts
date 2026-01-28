import { db } from "./firebase";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  Timestamp,
  doc,
  setDoc,
  getDoc,
  getDocs,
} from "firebase/firestore";
import {
  encryptMessage,
  decryptMessage,
  generateConversationKey,
} from "./encryption";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export interface Message {
  id: string;
  senderId: string;
  content: string;
  encryptedContent?: string;
  timestamp: Timestamp;
  read: boolean;
}

export interface Conversation {
  id: string;
  participants: string[];
  participantNames?: { [userId: string]: string };
  createdAt: Timestamp;
  lastMessageAt: Timestamp;
  lastMessagePreview?: string;
  unreadCount?: { [userId: string]: number };
}

/**
 * Create a new encrypted conversation between users
 */
export const createConversation = async (
  currentUserId: string,
  otherUserId: string,
  currentUserName: string,
  otherUserName: string,
): Promise<string> => {
  const conversationKey = generateConversationKey();

  // Store the key in Firestore under conversationKeysByUser
  const conversationRef = await addDoc(collection(db, "conversations"), {
    participants: [currentUserId, otherUserId],
    participantNames: {
      [currentUserId]: currentUserName,
      [otherUserId]: otherUserName,
    },
    createdAt: Timestamp.now(),
    lastMessageAt: Timestamp.now(),
    conversationKeysByUser: {
      [currentUserId]: conversationKey,
      [otherUserId]: conversationKey,
    },
  });

  await saveConversationKey(conversationRef.id, conversationKey, currentUserId);

  return conversationRef.id;
};

/**
 * Save conversation key to device secure storage (native) or localStorage (web)
 */
// Save conversation key to device and Firestore for the user
const saveConversationKey = async (
  conversationId: string,
  key: string,
  userId?: string,
): Promise<void> => {
  if (Platform.OS === "web") {
    window.localStorage.setItem(`conv_key_${conversationId}`, key);
  } else {
    await SecureStore.setItemAsync(`conv_key_${conversationId}`, key);
  }
  // Also save to Firestore if userId is provided
  if (userId) {
    const convDoc = doc(db, "conversations", conversationId);
    await setDoc(
      convDoc,
      { conversationKeysByUser: { [userId]: key } },
      { merge: true },
    );
  }
};

/**
 * Load conversation key from device secure storage (native) or localStorage (web)
 */
export const loadConversationKey = async (
  conversationId: string,
  userId?: string,
): Promise<string | null> => {
  console.log(
    `[loadConversationKey] Looking for key for conversation ${conversationId}, userId: ${userId}`,
  );

  // Try device storage first
  let key: string | null = null;
  if (Platform.OS === "web") {
    key = window.localStorage.getItem(`conv_key_${conversationId}`);
  } else {
    key = await SecureStore.getItemAsync(`conv_key_${conversationId}`);
  }
  if (key) {
    console.log(`[loadConversationKey] Found key in local storage`);
    return key;
  }

  // If not found, try Firestore if userId is provided
  if (userId) {
    console.log(
      `[loadConversationKey] Key not in local storage, checking Firestore...`,
    );
    const convDoc = await getDoc(doc(db, "conversations", conversationId));
    if (convDoc.exists()) {
      const data = convDoc.data();
      console.log(`[loadConversationKey] Conversation data:`, {
        participants: data.participants,
        hasKeysByUser: !!data.conversationKeysByUser,
        userIds: data.conversationKeysByUser
          ? Object.keys(data.conversationKeysByUser)
          : [],
        lookingForUserId: userId,
      });

      if (
        data.conversationKeysByUser &&
        typeof data.conversationKeysByUser[userId] === "string"
      ) {
        const firestoreKey = data.conversationKeysByUser[userId];
        console.log(
          `[loadConversationKey] Found key in Firestore for userId: ${userId}`,
        );
        await saveConversationKey(conversationId, firestoreKey, userId);
        return firestoreKey;
      } else {
        console.warn(
          `[loadConversationKey] Key not found in Firestore for userId: ${userId}`,
        );
        console.warn(
          `[loadConversationKey] Available keys:`,
          data.conversationKeysByUser,
        );

        // Migration: If this is an old conversation without conversationKeysByUser,
        // generate a new key and save it for all participants
        if (!data.conversationKeysByUser && data.participants) {
          console.log(
            `[loadConversationKey] Migrating old conversation - generating new key for all participants`,
          );
          const newKey = generateConversationKey();

          // Save key for all participants in Firestore
          const keysByUser: { [key: string]: string } = {};
          data.participants.forEach((participantId: string) => {
            keysByUser[participantId] = newKey;
          });

          await setDoc(
            doc(db, "conversations", conversationId),
            { conversationKeysByUser: keysByUser },
            { merge: true },
          );

          // Save to local storage for current user
          await saveConversationKey(conversationId, newKey, userId);

          console.log(
            `[loadConversationKey] Migration complete - key saved for ${data.participants.length} participants`,
          );
          return newKey;
        }
      }
    } else {
      console.error(
        `[loadConversationKey] Conversation document does not exist: ${conversationId}`,
      );
    }
  } else {
    console.error(
      `[loadConversationKey] No userId provided to fetch from Firestore`,
    );
  }
  return null;
};

/**
 * Send an encrypted message in a conversation
 */
export const sendEncryptedMessage = async (
  conversationId: string,
  senderId: string,
  message: string,
  userId?: string,
): Promise<void> => {
  const sharedKey = await loadConversationKey(conversationId, userId);

  if (!sharedKey) {
    throw new Error(
      "Conversation key not found. Cannot send encrypted message.",
    );
  }

  const encrypted = encryptMessage(message, sharedKey);

  await addDoc(collection(db, `conversations/${conversationId}/messages`), {
    senderId,
    encryptedContent: encrypted,
    timestamp: Timestamp.now(),
    read: false,
  });

  // Get conversation to find other participant
  const convDoc = await getDoc(doc(db, "conversations", conversationId));
  if (convDoc.exists()) {
    const participants = convDoc.data().participants as string[];
    const otherUserId = participants.find((id) => id !== senderId);

    if (otherUserId) {
      // Increment unread count for the other user
      const currentUnread = convDoc.data().unreadCount?.[otherUserId] || 0;
      await setDoc(
        doc(db, "conversations", conversationId),
        {
          lastMessageAt: Timestamp.now(),
          [`unreadCount.${otherUserId}`]: currentUnread + 1,
        },
        { merge: true },
      );
    }
  }
};

/**
 * Subscribe to messages in a conversation (real-time)
 */
export const subscribeToMessages = (
  conversationId: string,
  callback: (messages: Message[]) => void,
  userId?: string,
): (() => void) => {
  const q = query(
    collection(db, `conversations/${conversationId}/messages`),
    orderBy("timestamp", "asc"),
  );

  return onSnapshot(q, async (snapshot) => {
    const sharedKey = await loadConversationKey(conversationId, userId);

    if (!sharedKey) {
      console.error("No conversation key found");
      return;
    }

    const messages: Message[] = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        try {
          const decrypted = decryptMessage(data.encryptedContent, sharedKey);
          return {
            id: doc.id,
            senderId: data.senderId,
            content: decrypted,
            timestamp: data.timestamp,
            read: data.read,
          };
        } catch (e) {
          console.error("Failed to decrypt message:", e);
          return null;
        }
      })
      .filter((m): m is Message => m !== null);

    callback(messages);
  });
};

/**
 * Mark all messages in a conversation as read for the current user
 */
export const markMessagesAsRead = async (
  conversationId: string,
  userId: string,
): Promise<void> => {
  const messagesRef = collection(
    db,
    `conversations/${conversationId}/messages`,
  );
  const q = query(
    messagesRef,
    where("senderId", "!=", userId),
    where("read", "==", false),
  );

  const snapshot = await getDocs(q);
  const batch = snapshot.docs.map((doc) =>
    setDoc(doc.ref, { read: true }, { merge: true }),
  );

  await Promise.all(batch);

  // Reset unread count for this user in conversation
  await setDoc(
    doc(db, "conversations", conversationId),
    { [`unreadCount.${userId}`]: 0 },
    { merge: true },
  );
};

/**
 * Get all conversations for a user
 */
export const getUserConversations = async (
  userId: string,
): Promise<Conversation[]> => {
  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", userId),
    orderBy("lastMessageAt", "desc"),
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map(
    (doc) =>
      ({
        id: doc.id,
        ...doc.data(),
      }) as Conversation,
  );
};

/**
 * Subscribe to user's conversations (real-time)
 */
export const subscribeToConversations = (
  userId: string,
  callback: (conversations: Conversation[]) => void,
): (() => void) => {
  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", userId),
    orderBy("lastMessageAt", "desc"),
  );

  return onSnapshot(q, (snapshot) => {
    const conversations: Conversation[] = snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as Conversation,
    );

    callback(conversations);
  });
};

/**
 * Find existing conversation between two users
 */
export const findConversation = async (
  userId1: string,
  userId2: string,
): Promise<string | null> => {
  const q = query(
    collection(db, "conversations"),
    where("participants", "array-contains", userId1),
  );

  const snapshot = await getDocs(q);

  const conversation = snapshot.docs.find((doc) => {
    const participants = doc.data().participants as string[];
    return participants.includes(userId2);
  });

  return conversation ? conversation.id : null;
};

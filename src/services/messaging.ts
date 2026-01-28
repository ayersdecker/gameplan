import { db } from './firebase';
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
} from 'firebase/firestore';
import { encryptMessage, decryptMessage, generateConversationKey } from './encryption';
import * as SecureStore from 'expo-secure-store';

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
}

/**
 * Create a new encrypted conversation between users
 */
export const createConversation = async (
  currentUserId: string,
  otherUserId: string,
  currentUserName: string,
  otherUserName: string
): Promise<string> => {
  const conversationKey = generateConversationKey();
  
  const conversationRef = await addDoc(collection(db, 'conversations'), {
    participants: [currentUserId, otherUserId],
    participantNames: {
      [currentUserId]: currentUserName,
      [otherUserId]: otherUserName,
    },
    createdAt: Timestamp.now(),
    lastMessageAt: Timestamp.now(),
  });
  
  await saveConversationKey(conversationRef.id, conversationKey);
  
  return conversationRef.id;
};

/**
 * Save conversation key to device secure storage
 */
const saveConversationKey = async (conversationId: string, key: string): Promise<void> => {
  await SecureStore.setItemAsync(`conv_key_${conversationId}`, key);
};

/**
 * Load conversation key from device secure storage
 */
export const loadConversationKey = async (conversationId: string): Promise<string | null> => {
  return await SecureStore.getItemAsync(`conv_key_${conversationId}`);
};

/**
 * Send an encrypted message in a conversation
 */
export const sendEncryptedMessage = async (
  conversationId: string,
  senderId: string,
  message: string
): Promise<void> => {
  const sharedKey = await loadConversationKey(conversationId);
  
  if (!sharedKey) {
    throw new Error('Conversation key not found. Cannot send encrypted message.');
  }
  
  const encrypted = encryptMessage(message, sharedKey);
  
  await addDoc(collection(db, `conversations/${conversationId}/messages`), {
    senderId,
    encryptedContent: encrypted,
    timestamp: Timestamp.now(),
    read: false,
  });
  
  await setDoc(
    doc(db, 'conversations', conversationId),
    { lastMessageAt: Timestamp.now() },
    { merge: true }
  );
};

/**
 * Subscribe to messages in a conversation (real-time)
 */
export const subscribeToMessages = (
  conversationId: string,
  callback: (messages: Message[]) => void
): (() => void) => {
  const q = query(
    collection(db, `conversations/${conversationId}/messages`),
    orderBy('timestamp', 'asc')
  );
  
  return onSnapshot(q, async (snapshot) => {
    const sharedKey = await loadConversationKey(conversationId);
    
    if (!sharedKey) {
      console.error('No conversation key found');
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
          console.error('Failed to decrypt message:', e);
          return null;
        }
      })
      .filter((m): m is Message => m !== null);
    
    callback(messages);
  });
};

/**
 * Get all conversations for a user
 */
export const getUserConversations = async (userId: string): Promise<Conversation[]> => {
  const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', userId),
    orderBy('lastMessageAt', 'desc')
  );
  
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  } as Conversation));
};

/**
 * Subscribe to user's conversations (real-time)
 */
export const subscribeToConversations = (
  userId: string,
  callback: (conversations: Conversation[]) => void
): (() => void) => {
  const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', userId),
    orderBy('lastMessageAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const conversations: Conversation[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    } as Conversation));
    
    callback(conversations);
  });
};

/**
 * Find existing conversation between two users
 */
export const findConversation = async (
  userId1: string,
  userId2: string
): Promise<string | null> => {
  const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', userId1)
  );
  
  const snapshot = await getDocs(q);
  
  const conversation = snapshot.docs.find((doc) => {
    const participants = doc.data().participants as string[];
    return participants.includes(userId2);
  });
  
  return conversation ? conversation.id : null;
};

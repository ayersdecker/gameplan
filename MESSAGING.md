# End-to-End Encrypted Messaging

## Overview
Peer-to-peer encrypted messaging has been added to GamePlan. All messages are encrypted client-side before being sent to Firebase, ensuring true end-to-end encryption.

## Features
✅ **XChaCha20-Poly1305 encryption** - Industry-standard AEAD cipher
✅ **Client-side encryption** - Messages encrypted before leaving the device
✅ **Secure key storage** - Conversation keys stored in device secure storage (Expo SecureStore)
✅ **Real-time messaging** - Live updates via Firebase Firestore
✅ **Clean UI** - iMessage-style chat interface

## Architecture

### Encryption (`src/services/encryption.ts`)
- **generateConversationKey()** - Creates a new 256-bit encryption key
- **encryptMessage()** - Encrypts plaintext with XChaCha20-Poly1305
- **decryptMessage()** - Decrypts ciphertext and verifies authenticity

### Messaging Service (`src/services/messaging.ts`)
- **createConversation()** - Start new encrypted conversation
- **sendEncryptedMessage()** - Send encrypted message
- **subscribeToMessages()** - Real-time message updates
- **subscribeToConversations()** - Real-time conversation list
- **findConversation()** - Check if conversation already exists

### UI Components
- **app/messages/index.tsx** - Conversations list
- **app/messages/[id].tsx** - Chat interface
- **app/(tabs)/messages.tsx** - Messages tab
- **src/components/StartConversationButton.tsx** - Button to initiate chats

## Firestore Schema

```
/conversations/{conversationId}
  - participants: string[]
  - participantNames: { [userId]: name }
  - createdAt: timestamp
  - lastMessageAt: timestamp

/conversations/{conversationId}/messages/{messageId}
  - senderId: string
  - encryptedContent: string (base64)
  - timestamp: timestamp
  - read: boolean
```

## Security Notes

### ✅ What's Protected
- Message content is **encrypted at rest** in Firestore
- Firebase admins **cannot read** message contents
- Network interception reveals only encrypted data
- Each conversation has a unique encryption key

### ⚠️ Current Limitations
- **No forward secrecy** - If a key is compromised, all messages in that conversation are readable
- **Key exchange is simplified** - In production, use proper key exchange (Signal Protocol, ECDH)
- **No key rotation** - Keys should be rotated periodically
- **Metadata visible** - Timestamps, participants, and message count are not encrypted

### 🔐 Future Improvements
1. Implement **Signal Protocol** for forward secrecy and proper key exchange
2. Add **key rotation** every N messages or time period
3. Store keys in **device keychain** with biometric protection
4. Add **message deletion** with secure key wipe
5. Implement **typing indicators** (without revealing content)
6. Add **read receipts** (encrypted)

## Usage

### Start a Conversation
Add the button to any user profile or activity page:

```tsx
import StartConversationButton from '@/src/components/StartConversationButton';

<StartConversationButton 
  otherUserId={user.id} 
  otherUserName={user.name} 
/>
```

### Access Messages
Users can access their conversations via:
1. **Messages tab** in bottom navigation
2. **Direct links** from notifications or other screens

## Testing
1. Create two test accounts
2. Start a conversation from one account
3. Send messages back and forth
4. Verify encryption:
   - Check Firestore console - should see base64 encrypted content
   - Messages should decrypt properly in the app

## Dependencies Added
```json
{
  "@stablelib/xchacha20poly1305": "^1.0.1",
  "@stablelib/random": "^1.0.2",
  "@stablelib/base64": "^1.0.1",
  "expo-secure-store": "^13.0.2"
}
```

## Production Checklist
- [ ] Implement proper key exchange (Signal Protocol)
- [ ] Add key rotation mechanism
- [ ] Secure key backup/recovery flow
- [ ] Add message deletion
- [ ] Implement forward secrecy
- [ ] Security audit by professional
- [ ] Penetration testing
- [ ] Privacy policy update

---

**Note:** This is a solid foundation, but for a production app handling sensitive communications, consider using a battle-tested library like [@privacyresearch/libsignal-protocol-typescript](https://github.com/privacyresearch/libsignal-protocol-typescript).

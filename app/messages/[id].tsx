import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/src/hooks/useAuth';
import { sendEncryptedMessage, subscribeToMessages, Message } from '@/src/services/messaging';

export default function ConversationScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;

    const unsubscribe = subscribeToMessages(id, (msgs) => {
      setMessages(msgs);
      setLoading(false);
    });

    return unsubscribe;
  }, [id]);

  useEffect(() => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !user || typeof id !== 'string') return;

    try {
      await sendEncryptedMessage(id, user.uid, input);
      setInput('');
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Encrypted Chat 🔒</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        renderItem={({ item }) => {
          const isMe = item.senderId === user?.uid;
          return (
            <View
              style={[
                styles.messageBubble,
                isMe ? styles.myMessage : styles.theirMessage,
              ]}
            >
              <Text style={isMe ? styles.myMessageText : styles.theirMessageText}>
                {item.content}
              </Text>
              <Text style={styles.timestamp}>
                {item.timestamp?.toDate().toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          );
        }}
      />

      <View style={styles.inputContainer}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
          style={styles.input}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          onPress={handleSend}
          style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
          disabled={!input.trim()}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 16,
    color: '#666',
  },
  messageList: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#E5E5EA',
  },
  myMessageText: {
    color: '#fff',
    fontSize: 16,
  },
  theirMessageText: {
    color: '#000',
    fontSize: 16,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    opacity: 0.7,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});

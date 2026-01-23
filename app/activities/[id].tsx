import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../../src/services/firebase';
import { useAuth } from '../../src/hooks/useAuth';
import { Activity, Message } from '../../src/types';
import { addActivityToCalendar } from '../../src/utils/calendar';
import { awardBadge } from '../../src/utils/badges';

export default function ActivityDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!id) return;

    // Subscribe to activity changes
    const activityUnsubscribe = onSnapshot(doc(db, 'activities', id), (snapshot) => {
      if (!snapshot.exists()) {
        // Activity was deleted, navigate back
        console.log('Activity was deleted, navigating back');
        router.back();
        return;
      }
      const data = snapshot.data();
      setActivity({
        id: snapshot.id,
        ...data,
        date: data.date?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
      } as Activity);
    });

    // Subscribe to messages
    const messagesQuery = query(
      collection(db, 'activities', id, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const messagesUnsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messagesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Message[];
      setMessages(messagesData);
    });

    setLoading(false);
    return () => {
      activityUnsubscribe();
      messagesUnsubscribe();
    };
  }, [id]);

  const loadActivity = async () => {
    if (!id) return;

    try {
      const activityDoc = await getDoc(doc(db, 'activities', id));
      if (activityDoc.exists()) {
        const data = activityDoc.data();
        setActivity({
          id: activityDoc.id,
          ...data,
          date: data.date?.toDate() || new Date(),
          createdAt: data.createdAt?.toDate() || new Date(),
        } as Activity);
      }
    } catch (error) {
      console.error('Error loading activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!activity || !user || !id) return;

    if (activity.participants.includes(user.id)) {
      Alert.alert('Already Joined', 'You are already a participant of this activity');
      return;
    }

    if (activity.maxParticipants && activity.participants.length >= activity.maxParticipants) {
      Alert.alert('Full', 'This activity has reached maximum participants');
      return;
    }

    try {
      await updateDoc(doc(db, 'activities', id), {
        participants: arrayUnion(user.id),
      });
      
      // Award badge for joining first activity
      await awardBadge(user.id, 'first_activity');
      
      await loadActivity();
      Alert.alert('Success', 'You have joined this activity!');
    } catch (error) {
      console.error('Error joining activity:', error);
      Alert.alert('Error', 'Failed to join activity');
    }
  };

  const handleLeave = async () => {
    if (!activity || !user || !id) return;

    Alert.alert('Leave Activity', 'Are you sure you want to leave this activity?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          try {
            await updateDoc(doc(db, 'activities', id), {
              participants: arrayRemove(user.id),
            });
            await loadActivity();
            Alert.alert('Success', 'You have left this activity');
          } catch (error) {
            console.error('Error leaving activity:', error);
            Alert.alert('Error', 'Failed to leave activity');
          }
        },
      },
    ]);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !user || !id) return;

    try {
      setSending(true);
      await addDoc(collection(db, 'activities', id, 'messages'), {
        activityId: id,
        userId: user.id,
        userName: user.displayName,
        userPhoto: user.photoURL || null,
        text: messageText.trim(),
        createdAt: serverTimestamp(),
      });
      setMessageText('');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleAddToCalendar = async () => {
    if (!activity) return;
    await addActivityToCalendar(activity);
  };

  const handleDeleteActivity = async () => {
    if (!activity || !id) {
      Alert.alert('Error', 'Missing activity or id');
      return;
    }

    // Use browser confirm for web
    const confirmed = window.confirm(
      'Are you sure you want to delete this activity? This cannot be undone.'
    );

    if (!confirmed) {
      console.log('Delete cancelled');
      return;
    }

    try {
      console.log('Deleting activity:', id);
      await deleteDoc(doc(db, 'activities', id));
      console.log('Activity deleted successfully');
    } catch (error) {
      console.error('Error deleting activity:', error);
      Alert.alert('Error', `Failed to delete activity: ${error}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!activity) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Activity not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isParticipant = user ? activity.participants.includes(user.id) : false;
  const isCreator = user ? activity.creatorId === user.id : false;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleAddToCalendar}>
          <Text style={styles.calendarButton}>📅 Add to Calendar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.activitySection}>
          <View style={styles.activityHeader}>
            <Text style={styles.activityTitle}>{activity.title}</Text>
            <Text style={styles.activityCategory}>{activity.category}</Text>
          </View>
          <Text style={styles.activityDescription}>{activity.description}</Text>
          
          <View style={styles.activityDetails}>
            <Text style={styles.detailText}>📅 {activity.date.toLocaleDateString()}</Text>
            <Text style={styles.detailText}>⏰ {activity.date.toLocaleTimeString()}</Text>
            {activity.location && (
              <Text style={styles.detailText}>📍 {activity.location}</Text>
            )}
            <Text style={styles.detailText}>
              👥 {activity.participants.length}
              {activity.maxParticipants ? `/${activity.maxParticipants}` : ''} participants
            </Text>
          </View>

          <View style={styles.actionButtons}>
            {!isParticipant ? (
              <TouchableOpacity style={styles.joinButton} onPress={handleJoin}>
                <Text style={styles.joinButtonText}>Join Activity</Text>
              </TouchableOpacity>
            ) : !isCreator ? (
              <TouchableOpacity style={styles.leaveButton} onPress={handleLeave}>
                <Text style={styles.leaveButtonText}>Leave Activity</Text>
              </TouchableOpacity>
            ) : (
              <View>
                <View style={styles.creatorBadge}>
                  <Text style={styles.creatorBadgeText}>You created this activity</Text>
                </View>
                <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteActivity}>
                  <Text style={styles.deleteButtonText}>🗑️ Delete Activity</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <View style={styles.chatSection}>
          <Text style={styles.chatTitle}>Activity Chat</Text>
          {messages.length === 0 ? (
            <Text style={styles.noMessages}>No messages yet. Start the conversation!</Text>
          ) : (
            messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageContainer,
                  message.userId === user?.id && styles.ownMessage,
                ]}
              >
                <Text style={styles.messageSender}>{message.userName}</Text>
                <Text style={styles.messageText}>{message.text}</Text>
                <Text style={styles.messageTime}>
                  {message.createdAt.toLocaleTimeString()}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {isParticipant && (
        <View style={styles.messageInputContainer}>
          <TextInput
            style={styles.messageInput}
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Type a message..."
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, (!messageText.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!messageText.trim() || sending}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: '#333',
    marginBottom: 16,
  },
  backLink: {
    fontSize: 16,
    color: '#007AFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  calendarButton: {
    fontSize: 14,
    color: '#007AFF',
  },
  content: {
    flex: 1,
  },
  activitySection: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activityTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  activityCategory: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  activityDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 24,
  },
  activityDetails: {
    gap: 8,
    marginBottom: 16,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  actionButtons: {
    marginTop: 8,
  },
  joinButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  leaveButton: {
    backgroundColor: '#FF3B30',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  leaveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  creatorBadge: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  creatorBadgeText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  chatSection: {
    backgroundColor: '#fff',
    padding: 16,
    minHeight: 300,
  },
  chatTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  noMessages: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 32,
  },
  messageContainer: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    maxWidth: '80%',
  },
  ownMessage: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 10,
    color: '#999',
  },
  messageInputContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    gap: 8,
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#ff3b30',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },});
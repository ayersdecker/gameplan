import React, { useEffect, useState } from "react";
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
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
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
} from "firebase/firestore";
import { db } from "../../src/services/firebase";
import { useAuth } from "../../src/hooks/useAuth";
import { Activity, Message } from "../../src/types";
import { addActivityToCalendar } from "../../src/utils/calendar";
import { awardBadge } from "../../src/utils/badges";

export default function ActivityDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [showParticipants, setShowParticipants] = useState(false);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    if (!id) return;

    // Subscribe to activity changes
    const activityUnsubscribe = onSnapshot(
      doc(db, "activities", id),
      (snapshot) => {
        if (!snapshot.exists()) {
          // Activity was deleted, navigate back
          console.log("Activity was deleted, navigating back");
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
      },
    );

    // Subscribe to messages
    const messagesQuery = query(
      collection(db, "activities", id, "messages"),
      orderBy("createdAt", "asc"),
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

  const loadParticipants = async () => {
    if (!activity) return;

    try {
      const participantsData = [];
      for (const userId of activity.participants) {
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          participantsData.push({
            id: userDoc.id,
            ...userDoc.data(),
          });
        }
      }
      setParticipants(participantsData);
    } catch (error) {
      console.error("Error loading participants:", error);
    }
  };

  const loadActivity = async () => {
    if (!id) return;

    try {
      const activityDoc = await getDoc(doc(db, "activities", id));
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
      console.error("Error loading activity:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!activity || !user || !id) return;

    if (activity.participants.includes(user.id)) {
      Alert.alert(
        "Already Joined",
        "You are already a participant of this activity",
      );
      return;
    }

    if (
      activity.maxParticipants &&
      activity.participants.length >= activity.maxParticipants
    ) {
      Alert.alert("Full", "This activity has reached maximum participants");
      return;
    }

    try {
      await updateDoc(doc(db, "activities", id), {
        participants: arrayUnion(user.id),
      });

      // Award badge for joining first activity
      await awardBadge(user.id, "first_activity");

      await loadActivity();
      Alert.alert("Success", "You have joined this activity!");
    } catch (error) {
      console.error("Error joining activity:", error);
      Alert.alert("Error", "Failed to join activity");
    }
  };

  const handleLeave = async () => {
    if (!activity || !user || !id) return;

    Alert.alert(
      "Leave Activity",
      "Are you sure you want to leave this activity?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              await updateDoc(doc(db, "activities", id), {
                participants: arrayRemove(user.id),
              });
              await loadActivity();
              Alert.alert("Success", "You have left this activity");
            } catch (error) {
              console.error("Error leaving activity:", error);
              Alert.alert("Error", "Failed to leave activity");
            }
          },
        },
      ],
    );
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !user || !id) return;

    try {
      setSending(true);
      await addDoc(collection(db, "activities", id, "messages"), {
        activityId: id,
        userId: user.id,
        userName: user.displayName,
        userPhoto: user.photoURL || null,
        text: messageText.trim(),
        createdAt: serverTimestamp(),
      });
      setMessageText("");
    } catch (error) {
      console.error("Error sending message:", error);
      if (Platform.OS === "web") {
        window.alert("Failed to send message");
      } else {
        Alert.alert("Error", "Failed to send message");
      }
    } finally {
      setSending(false);
    }
  };

  const handleSendFriendRequest = async (
    friendId: string,
    friendName: string,
  ) => {
    if (!user) return;

    try {
      await updateDoc(doc(db, "users", user.id), {
        "friendRequests.sent": arrayUnion(friendId),
      });

      await updateDoc(doc(db, "users", friendId), {
        "friendRequests.received": arrayUnion(user.id),
      });

      if (Platform.OS === "web") {
        window.alert(`Friend request sent to ${friendName}!`);
      } else {
        Alert.alert("Success", `Friend request sent to ${friendName}!`);
      }
    } catch (error) {
      console.error("Error sending friend request:", error);
      if (Platform.OS === "web") {
        window.alert("Failed to send friend request");
      } else {
        Alert.alert("Error", "Failed to send friend request");
      }
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!id) return;

    try {
      await deleteDoc(doc(db, "activities", id, "messages", messageId));
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  const handleEditMessage = async (messageId: string) => {
    if (!id || !editText.trim()) return;

    try {
      await updateDoc(doc(db, "activities", id, "messages", messageId), {
        text: editText.trim(),
        edited: true,
      });
      setEditingMessage(null);
      setEditText("");
    } catch (error) {
      console.error("Error editing message:", error);
    }
  };

  const handleAddToCalendar = async () => {
    if (!activity || !user || !id) return;

    // First, join the activity if not already joined
    if (!activity.participants.includes(user.id)) {
      try {
        await updateDoc(doc(db, "activities", id), {
          participants: arrayUnion(user.id),
        });

        // Award badge for joining first activity
        await awardBadge(user.id, "first_activity");

        await loadActivity();
      } catch (error) {
        console.error("Error joining activity:", error);
        if (Platform.OS === "web") {
          window.alert("Failed to join activity");
        } else {
          Alert.alert("Error", "Failed to join activity");
        }
        return;
      }
    }

    // Then add to calendar
    await addActivityToCalendar(activity);
  };

  const handleDeleteActivity = async () => {
    if (!activity || !id) {
      Alert.alert("Error", "Missing activity or id");
      return;
    }

    // Use browser confirm for web
    const confirmed = window.confirm(
      "Are you sure you want to delete this activity? This cannot be undone.",
    );

    if (!confirmed) {
      console.log("Delete cancelled");
      return;
    }

    try {
      console.log("Deleting activity:", id);
      await deleteDoc(doc(db, "activities", id));
      console.log("Activity deleted successfully");
    } catch (error) {
      console.error("Error deleting activity:", error);
      Alert.alert("Error", `Failed to delete activity: ${error}`);
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
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleAddToCalendar}
          style={styles.calendarButtonContainer}
        >
          <Text style={styles.calendarButton}>Add to Calendar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.activitySection}>
          <View style={styles.activityHeader}>
            <Text style={styles.activityTitle}>{activity.title}</Text>
            <View style={styles.categoryContainer}>
              <Text style={styles.activityCategory}>{activity.category}</Text>
              {activity.subcategory && (
                <Text style={styles.subcategoryText}>
                  {activity.subcategory}
                </Text>
              )}
            </View>
          </View>
          <Text style={styles.activityDescription}>{activity.description}</Text>

          <View style={styles.activityDetails}>
            <Text style={styles.detailText}>
              📅 {activity.date.toLocaleDateString()}
            </Text>
            <Text style={styles.detailText}>
              ⏰ {activity.date.toLocaleTimeString()}
            </Text>
            {activity.location?.address && (
              <Text style={styles.detailText}>
                📍 {activity.location.address}
              </Text>
            )}
            <Text style={styles.detailText}>
              👥 {activity.participants.length}
              {activity.maxParticipants
                ? `/${activity.maxParticipants}`
                : ""}{" "}
              participants
            </Text>
          </View>

          <TouchableOpacity
            style={styles.viewParticipantsButton}
            onPress={() => {
              loadParticipants();
              setShowParticipants(true);
            }}
          >
            <Text style={styles.viewParticipantsText}>View Participants</Text>
          </TouchableOpacity>

          <View style={styles.actionButtons}>
            {!isParticipant ? (
              <TouchableOpacity style={styles.joinButton} onPress={handleJoin}>
                <Text style={styles.joinButtonText}>Join Activity</Text>
              </TouchableOpacity>
            ) : !isCreator ? (
              <TouchableOpacity
                style={styles.leaveButton}
                onPress={handleLeave}
              >
                <Text style={styles.leaveButtonText}>Leave Activity</Text>
              </TouchableOpacity>
            ) : (
              <View>
                <View style={styles.creatorBadge}>
                  <Text style={styles.creatorBadgeText}>
                    You created this activity
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={handleDeleteActivity}
                >
                  <Text style={styles.deleteButtonText}>Delete Activity</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <View style={styles.chatSection}>
          <Text style={styles.chatTitle}>Activity Chat</Text>
          {messages.length === 0 ? (
            <Text style={styles.noMessages}>
              No messages yet. Start the conversation!
            </Text>
          ) : (
            messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageContainer,
                  message.userId === user?.id && styles.ownMessage,
                ]}
              >
                <View style={styles.messageHeader}>
                  <Text
                    style={[
                      styles.messageSender,
                      message.userId === user?.id && styles.ownMessageSender,
                    ]}
                  >
                    {message.userName}
                  </Text>
                  {message.userId === user?.id && (
                    <View style={styles.messageActions}>
                      <TouchableOpacity
                        onPress={() => {
                          setEditingMessage(message.id);
                          setEditText(message.text);
                        }}
                        style={styles.messageActionButton}
                      >
                        <Text
                          style={[
                            styles.messageActionText,
                            message.userId === user?.id &&
                              styles.ownMessageActionText,
                          ]}
                        >
                          Edit
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteMessage(message.id)}
                        style={styles.messageActionButton}
                      >
                        <Text
                          style={[
                            styles.messageActionText,
                            message.userId === user?.id &&
                              styles.ownMessageActionText,
                          ]}
                        >
                          Delete
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                {editingMessage === message.id ? (
                  <View style={styles.editContainer}>
                    <TextInput
                      style={styles.editInput}
                      value={editText}
                      onChangeText={setEditText}
                      multiline
                    />
                    <View style={styles.editActions}>
                      <TouchableOpacity
                        onPress={() => handleEditMessage(message.id)}
                        style={styles.editSaveButton}
                      >
                        <Text style={styles.editSaveText}>Save</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setEditingMessage(null);
                          setEditText("");
                        }}
                        style={styles.editCancelButton}
                      >
                        <Text style={styles.editCancelText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <>
                    <Text
                      style={[
                        styles.messageText,
                        message.userId === user?.id && styles.ownMessageText,
                      ]}
                    >
                      {message.text}
                    </Text>
                    <Text
                      style={[
                        styles.messageTime,
                        message.userId === user?.id && styles.ownMessageTime,
                      ]}
                    >
                      {message.createdAt.toLocaleTimeString()}
                      {message.edited && " (edited)"}
                    </Text>
                  </>
                )}
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
            style={[
              styles.sendButton,
              (!messageText.trim() || sending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!messageText.trim() || sending}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Participants Modal */}
      {showParticipants && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Participants</Text>
              <TouchableOpacity onPress={() => setShowParticipants(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.participantsList}>
              {participants.map((participant) => {
                const isFriend = user?.friends?.includes(participant.id);
                const requestSent = user?.friendRequests?.sent?.includes(
                  participant.id,
                );
                const isCurrentUser = user?.id === participant.id;

                return (
                  <View key={participant.id} style={styles.participantItem}>
                    <View style={styles.participantInfo}>
                      <Text style={styles.participantName}>
                        {participant.displayName}
                        {isCurrentUser && " (You)"}
                      </Text>
                      <Text style={styles.participantEmail}>
                        {participant.email}
                      </Text>
                    </View>
                    {!isCurrentUser && !isFriend && !requestSent && (
                      <TouchableOpacity
                        style={styles.addFriendButton}
                        onPress={() =>
                          handleSendFriendRequest(
                            participant.id,
                            participant.displayName,
                          )
                        }
                      >
                        <Text style={styles.addFriendText}>Add Friend</Text>
                      </TouchableOpacity>
                    )}
                    {requestSent && (
                      <Text style={styles.requestSentText}>Request Sent</Text>
                    )}
                    {isFriend && (
                      <Text style={styles.friendBadge}>✓ Friends</Text>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: "#333",
    marginBottom: 16,
  },
  backLink: {
    fontSize: 16,
    color: "#007AFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  calendarButtonContainer: {
    flexDirection: "row",
  },
  calendarButton: {
    fontSize: 14,
    color: "#007AFF",
  },
  content: {
    flex: 1,
  },
  activitySection: {
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 12,
  },
  activityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  categoryContainer: {
    alignItems: "flex-end",
    gap: 4,
  },
  activityTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  activityCategory: {
    fontSize: 12,
    color: "#007AFF",
    fontWeight: "600",
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  subcategoryText: {
    fontSize: 10,
    color: "#666",
    fontWeight: "500",
  },
  activityDescription: {
    fontSize: 16,
    color: "#666",
    marginBottom: 16,
    lineHeight: 24,
  },
  activityDetails: {
    gap: 8,
    marginBottom: 16,
  },
  detailText: {
    fontSize: 14,
    color: "#666",
  },
  actionButtons: {
    marginTop: 8,
  },
  joinButton: {
    backgroundColor: "#007AFF",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  joinButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  leaveButton: {
    backgroundColor: "#FF3B30",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  leaveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  creatorBadge: {
    backgroundColor: "#E3F2FD",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  creatorBadgeText: {
    color: "#007AFF",
    fontSize: 14,
    fontWeight: "600",
  },
  chatSection: {
    backgroundColor: "#fff",
    padding: 16,
    minHeight: 300,
  },
  chatTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  noMessages: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    fontStyle: "italic",
    paddingVertical: 32,
  },
  messageContainer: {
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    maxWidth: "80%",
  },
  ownMessage: {
    backgroundColor: "#007AFF",
    alignSelf: "flex-end",
  },
  messageSender: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  messageText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 10,
    color: "#999",
  },
  ownMessageText: {
    color: "#fff",
  },
  ownMessageSender: {
    color: "#fff",
    opacity: 0.9,
  },
  ownMessageTime: {
    color: "#fff",
    opacity: 0.7,
  },
  messageInputContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    gap: 8,
  },
  messageInput: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  deleteButton: {
    backgroundColor: "#ff3b30",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  viewParticipantsButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  viewParticipantsText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    marginBottom: 4,
    gap: 12,
  },
  messageActions: {
    flexDirection: "row",
    gap: 4,
    marginLeft: "auto",
  },
  messageActionButton: {
    padding: 4,
  },
  messageActionText: {
    fontSize: 11,
    color: "#000",
  },
  ownMessageActionText: {
    color: "#fff",
  },
  editContainer: {
    marginTop: 8,
  },
  editInput: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    minHeight: 60,
    marginBottom: 8,
  },
  editActions: {
    flexDirection: "row",
    gap: 8,
  },
  editSaveButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  editSaveText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  editCancelButton: {
    backgroundColor: "#ccc",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  editCancelText: {
    color: "#333",
    fontSize: 12,
    fontWeight: "600",
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    width: "90%",
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  modalClose: {
    fontSize: 24,
    color: "#666",
  },
  participantsList: {
    maxHeight: 400,
  },
  participantItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  participantEmail: {
    fontSize: 14,
    color: "#666",
  },
  addFriendButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  addFriendText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  requestSentText: {
    fontSize: 12,
    color: "#999",
    fontStyle: "italic",
  },
  friendBadge: {
    fontSize: 12,
    color: "#34C759",
    fontWeight: "600",
  },
});

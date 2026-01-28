import React, { useEffect, useState } from "react";
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../../src/hooks/useAuth";
import {
  subscribeToConversations,
  Conversation,
} from "../../src/services/messaging";

export default function ConversationsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToConversations(user.id, (convos) => {
      setConversations(convos);
      setLoading(false);
    });

    return unsubscribe;
  }, [user]);

  const getOtherParticipantName = (conversation: Conversation) => {
    const otherUserId = conversation.participants.find((id) => id !== user?.id);
    return conversation.participantNames?.[otherUserId || ""] || "Unknown";
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading conversations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Messages 🔒</Text>
      {conversations.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No conversations yet</Text>
          <Text style={styles.emptySubtext}>
            Start a conversation from a user's profile
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.conversationItem}
              onPress={() => router.push(`/messages/${item.id}`)}
            >
              <View style={styles.conversationInfo}>
                <Text style={styles.participantName}>
                  {getOtherParticipantName(item)}
                </Text>
                <Text style={styles.timestamp}>
                  {item.lastMessageAt?.toDate().toLocaleDateString()}
                </Text>
              </View>
              {item.lastMessagePreview && (
                <Text style={styles.preview} numberOfLines={1}>
                  {item.lastMessagePreview}
                </Text>
              )}
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    color: "#666",
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  conversationItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  conversationInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  participantName: {
    fontSize: 16,
    fontWeight: "600",
  },
  timestamp: {
    fontSize: 12,
    color: "#999",
  },
  preview: {
    fontSize: 14,
    color: "#666",
  },
});

import React, { useState } from "react";
import { TouchableOpacity, Text, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "../hooks/useAuth";
import { createConversation, findConversation } from "../services/messaging";

interface Props {
  otherUserId: string;
  otherUserName: string;
}

export default function StartConversationButton({
  otherUserId,
  otherUserName,
}: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let conversationId = await findConversation(user.id, otherUserId);

      if (!conversationId) {
        conversationId = await createConversation(
          user.id,
          otherUserId,
          user.displayName || "You",
          otherUserName,
        );
      }

      router.push(`/messages/${conversationId}`);
    } catch (error) {
      console.error("Failed to start conversation:", error);
      Alert.alert("Error", "Failed to start conversation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handlePress}
      disabled={loading}
    >
      <Text style={styles.buttonText}>
        {loading ? "Starting..." : "💬 Message"}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

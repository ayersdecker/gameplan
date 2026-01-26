import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "../../src/services/firebase";
import { useAuth } from "../../src/hooks/useAuth";
import { User } from "../../src/types";

export default function FriendsList() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [friends, setFriends] = useState<User[]>([]);
  const [pendingRequests, setPendingRequests] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"friends" | "requests">("friends");

  useEffect(() => {
    loadFriends();
  }, [user]);

  const loadFriends = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Reload user data to get latest friends
      const userDoc = await getDoc(doc(db, "users", user.id));
      if (!userDoc.exists()) return;

      const userData = userDoc.data();
      const friendIds = userData.friends || [];
      const receivedRequests = userData.friendRequests?.received || [];

      // Load friends
      const friendsData: User[] = [];
      for (const friendId of friendIds) {
        const friendDoc = await getDoc(doc(db, "users", friendId));
        if (friendDoc.exists()) {
          friendsData.push({
            id: friendDoc.id,
            ...friendDoc.data(),
            createdAt: friendDoc.data().createdAt?.toDate() || new Date(),
          } as User);
        }
      }
      setFriends(friendsData);

      // Load pending requests
      const requestsData: User[] = [];
      for (const requesterId of receivedRequests) {
        const requesterDoc = await getDoc(doc(db, "users", requesterId));
        if (requesterDoc.exists()) {
          requestsData.push({
            id: requesterDoc.id,
            ...requesterDoc.data(),
            createdAt: requesterDoc.data().createdAt?.toDate() || new Date(),
          } as User);
        }
      }
      setPendingRequests(requestsData);
    } catch (error) {
      console.error("Error loading friends:", error);
    } finally {
      setLoading(false);
    }
  };

  const acceptFriendRequest = async (friendId: string, friendName: string) => {
    if (!user) return;

    try {
      // Add to friends list for both users
      await updateDoc(doc(db, "users", user.id), {
        friends: arrayUnion(friendId),
        "friendRequests.received": arrayRemove(friendId),
      });

      await updateDoc(doc(db, "users", friendId), {
        friends: arrayUnion(user.id),
        "friendRequests.sent": arrayRemove(user.id),
      });

      if (Platform.OS === "web") {
        window.alert(`You are now friends with ${friendName}!`);
      } else {
        Alert.alert("Success", `You are now friends with ${friendName}!`);
      }

      // Refresh user data and reload friends
      await refreshUser();
      await loadFriends();
    } catch (error) {
      console.error("Error accepting friend request:", error);
      if (Platform.OS === "web") {
        window.alert("Failed to accept friend request");
      } else {
        Alert.alert("Error", "Failed to accept friend request");
      }
    }
  };

  const declineFriendRequest = async (friendId: string) => {
    if (!user) return;

    try {
      await updateDoc(doc(db, "users", user.id), {
        "friendRequests.received": arrayRemove(friendId),
      });

      await updateDoc(doc(db, "users", friendId), {
        "friendRequests.sent": arrayRemove(user.id),
      });

      // Refresh user data and reload friends
      await refreshUser();
      await loadFriends();
    } catch (error) {
      console.error("Error declining friend request:", error);
      if (Platform.OS === "web") {
        window.alert("Failed to decline friend request");
      } else {
        Alert.alert("Error", "Failed to decline friend request");
      }
    }
  };

  const removeFriend = async (friendId: string, friendName: string) => {
    if (!user) return;

    const confirmed =
      Platform.OS === "web"
        ? window.confirm(`Remove ${friendName} from friends?`)
        : await new Promise((resolve) => {
            Alert.alert("Remove Friend", `Remove ${friendName} from friends?`, [
              {
                text: "Cancel",
                style: "cancel",
                onPress: () => resolve(false),
              },
              {
                text: "Remove",
                style: "destructive",
                onPress: () => resolve(true),
              },
            ]);
          });

    if (!confirmed) return;

    try {
      await updateDoc(doc(db, "users", user.id), {
        friends: arrayRemove(friendId),
      });

      await updateDoc(doc(db, "users", friendId), {
        friends: arrayRemove(user.id),
      });

      // Refresh user data and reload friends
      await refreshUser();
      await loadFriends();
    } catch (error) {
      console.error("Error removing friend:", error);
      if (Platform.OS === "web") {
        window.alert("Failed to remove friend");
      } else {
        Alert.alert("Error", "Failed to remove friend");
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() =>
            router.canGoBack() ? router.back() : router.push("/(tabs)/profile")
          }
        >
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Friends</Text>
        <TouchableOpacity onPress={() => router.push("/friends/search")}>
          <Text style={styles.addButton}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === "friends" && styles.tabActive]}
          onPress={() => setTab("friends")}
        >
          <Text
            style={[styles.tabText, tab === "friends" && styles.tabTextActive]}
          >
            Friends ({friends.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "requests" && styles.tabActive]}
          onPress={() => setTab("requests")}
        >
          <Text
            style={[styles.tabText, tab === "requests" && styles.tabTextActive]}
          >
            Requests ({pendingRequests.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <Text style={styles.loadingText}>Loading...</Text>
        ) : tab === "friends" ? (
          friends.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No friends yet</Text>
              <TouchableOpacity
                style={styles.searchButton}
                onPress={() => router.push("/friends/search")}
              >
                <Text style={styles.searchButtonText}>Find Friends</Text>
              </TouchableOpacity>
            </View>
          ) : (
            friends.map((friend) => (
              <View key={friend.id} style={styles.friendCard}>
                <Image
                  source={{
                    uri: friend.photoURL || "https://via.placeholder.com/50",
                  }}
                  style={styles.friendPhoto}
                />
                <View style={styles.friendInfo}>
                  <Text style={styles.friendName}>{friend.displayName}</Text>
                  {friend.interests && friend.interests.length > 0 && (
                    <Text style={styles.friendInterests}>
                      {friend.interests.slice(0, 3).join(", ")}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeFriend(friend.id, friend.displayName)}
                >
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ))
          )
        ) : pendingRequests.length === 0 ? (
          <Text style={styles.emptyText}>No pending requests</Text>
        ) : (
          pendingRequests.map((requester) => (
            <View key={requester.id} style={styles.requestCard}>
              <Image
                source={{
                  uri: requester.photoURL || "https://via.placeholder.com/50",
                }}
                style={styles.friendPhoto}
              />
              <View style={styles.friendInfo}>
                <Text style={styles.friendName}>{requester.displayName}</Text>
                {requester.interests && requester.interests.length > 0 && (
                  <Text style={styles.friendInterests}>
                    {requester.interests.slice(0, 3).join(", ")}
                  </Text>
                )}
              </View>
              <View style={styles.requestButtons}>
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() =>
                    acceptFriendRequest(requester.id, requester.displayName)
                  }
                >
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.declineButton}
                  onPress={() => declineFriendRequest(requester.id)}
                >
                  <Text style={styles.declineButtonText}>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backButton: {
    fontSize: 16,
    color: "#007AFF",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  addButton: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#007AFF",
  },
  tabText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#007AFF",
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  loadingText: {
    textAlign: "center",
    color: "#999",
    fontSize: 16,
    marginTop: 40,
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 60,
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    fontSize: 16,
    marginBottom: 20,
  },
  searchButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  searchButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  friendCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  requestCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  friendPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  friendInterests: {
    fontSize: 12,
    color: "#666",
  },
  removeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ff3b30",
  },
  removeButtonText: {
    color: "#ff3b30",
    fontSize: 14,
    fontWeight: "600",
  },
  requestButtons: {
    flexDirection: "row",
    gap: 8,
  },
  acceptButton: {
    backgroundColor: "#34C759",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  acceptButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  declineButton: {
    backgroundColor: "#ff3b30",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  declineButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});

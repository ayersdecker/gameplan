import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  getDoc,
} from "firebase/firestore";
import { db } from "../../src/services/firebase";
import { useAuth } from "../../src/hooks/useAuth";
import { User } from "../../src/types";

export default function FriendsSearch() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const usersRef = collection(db, "users");
      const q = query(
        usersRef,
        where("displayName", ">=", searchQuery),
        where("displayName", "<=", searchQuery + "\uf8ff"),
      );

      const snapshot = await getDocs(q);
      const users = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        }))
        .filter((u) => u.id !== user?.id) as User[];

      setSearchResults(users);
    } catch (error) {
      console.error("Error searching users:", error);
      if (Platform.OS === "web") {
        window.alert("Failed to search users");
      } else {
        Alert.alert("Error", "Failed to search users");
      }
    } finally {
      setLoading(false);
    }
  };

  const sendFriendRequest = async (friendId: string, friendName: string) => {
    if (!user) return;

    try {
      // Check if already friends
      if (user.friends?.includes(friendId)) {
        if (Platform.OS === "web") {
          window.alert("You are already friends with this user");
        } else {
          Alert.alert(
            "Already Friends",
            "You are already friends with this user",
          );
        }
        return;
      }

      // Check if request already sent (temporarily disabled for testing)
      // if (user.friendRequests?.sent?.includes(friendId)) {
      //   if (Platform.OS === "web") {
      //     window.alert("Friend request already sent");
      //   } else {
      //     Alert.alert("Pending", "Friend request already sent");
      //   }
      //   return;
      // }

      // Send friend request
      console.log("Step 1: Updating sender's sent array...");
      await updateDoc(doc(db, "users", user.id), {
        "friendRequests.sent": arrayUnion(friendId),
      });
      console.log("Step 1: Success");

      // Check if target user has friendRequests field
      console.log("Step 2: Checking target user document...");
      const targetUserDoc = await getDoc(doc(db, "users", friendId));
      if (!targetUserDoc.exists()) {
        throw new Error("Target user not found");
      }

      const targetUserData = targetUserDoc.data();
      console.log("Target user data:", targetUserData);

      // Initialize friendRequests if it doesn't exist
      if (!targetUserData.friendRequests) {
        console.log("Step 2: Initializing friendRequests for target user...");
        await updateDoc(doc(db, "users", friendId), {
          friendRequests: {
            sent: [],
            received: [user.id],
          },
        });
      } else {
        console.log("Step 2: Adding to target user's received array...");
        await updateDoc(doc(db, "users", friendId), {
          "friendRequests.received": arrayUnion(user.id),
        });
      }
      console.log("Step 2: Success");

      // Refresh user data to update local state
      console.log("Step 3: Refreshing user data...");
      await refreshUser();
      console.log("Step 3: Success");

      if (Platform.OS === "web") {
        window.alert(`Friend request sent to ${friendName}!`);
      } else {
        Alert.alert("Success", `Friend request sent to ${friendName}!`);
      }
    } catch (error: any) {
      console.error("Error sending friend request:", error);
      const errorMessage = error?.message || "Failed to send friend request";
      if (Platform.OS === "web") {
        window.alert(
          `Error: ${errorMessage}\n\nPlease update Firestore security rules in Firebase Console.`,
        );
      } else {
        Alert.alert(
          "Error",
          `${errorMessage}\n\nPlease update Firestore security rules.`,
        );
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
        <Text style={styles.headerTitle}>Find Friends</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by name..."
          placeholderTextColor="#999"
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearch}
          disabled={loading}
        >
          <Text style={styles.searchButtonText}>
            {loading ? "..." : "Search"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.results}>
        {searchResults.length === 0 ? (
          <Text style={styles.emptyText}>
            {searchQuery ? "No users found" : "Search for friends by name"}
          </Text>
        ) : (
          searchResults.map((searchUser) => (
            <View key={searchUser.id} style={styles.userCard}>
              <Image
                source={{
                  uri: searchUser.photoURL || "https://via.placeholder.com/50",
                }}
                style={styles.userPhoto}
              />
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{searchUser.displayName}</Text>
                {searchUser.interests && searchUser.interests.length > 0 && (
                  <Text style={styles.userInterests}>
                    {searchUser.interests.slice(0, 3).join(", ")}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() =>
                  sendFriendRequest(searchUser.id, searchUser.displayName)
                }
              >
                <Text style={styles.addButtonText}>Add Friend</Text>
              </TouchableOpacity>
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
  searchContainer: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#fff",
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: "center",
  },
  searchButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  results: {
    flex: 1,
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    fontSize: 16,
    marginTop: 40,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  userPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  userInterests: {
    fontSize: 12,
    color: "#666",
  },
  addButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});

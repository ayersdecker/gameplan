import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  where,
  limit,
} from "firebase/firestore";
import { db } from "../../src/services/firebase";
import { useAuth } from "../../src/hooks/useAuth";
import { Activity } from "../../src/types";

const getCategoryColor = (category: string) => {
  const colors: { [key: string]: string } = {
    sports: "#FF6B6B",
    music: "#4ECDC4",
    food: "#FFE66D",
    outdoor: "#95E1D3",
    gaming: "#A8E6CF",
    social: "#FF8B94",
    fitness: "#F38181",
    education: "#AA96DA",
    default: "#007AFF",
  };
  return colors[category.toLowerCase()] || colors.default;
};

export default function Activities() {
  const { user } = useAuth();
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "joined" | "created">("joined");

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    let q = query(
      collection(db, "activities"),
      orderBy("date", "asc"),
      limit(10),
    );

    if (filter === "joined") {
      q = query(
        collection(db, "activities"),
        where("participants", "array-contains", user.id),
        orderBy("date", "asc"),
        limit(10),
      );
    } else if (filter === "created") {
      q = query(
        collection(db, "activities"),
        where("creatorId", "==", user.id),
        orderBy("date", "asc"),
        limit(10),
      );
    }

    // Real-time listener for activities
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const activitiesData = snapshot.docs
          .map((doc) => {
            const data = doc.data() as any;
            return {
              id: doc.id,
              ...data,
              date: data.date?.toDate?.() || new Date(),
              createdAt: data.createdAt?.toDate?.() || new Date(),
              // Treat missing flag as public for legacy events.
              isPublic: data.isPublic ?? true,
            };
          })
          .filter((a) => a.isPublic !== false) as Activity[];
        setActivities(activitiesData);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading activities:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [filter, user]);

  const filteredActivities = activities.filter(
    (activity) =>
      activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      activity.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (activity.subcategory &&
        activity.subcategory.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Activities</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => router.push("/activities/create")}
        >
          <Text style={styles.createButtonText}>+ Create</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search activities..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === "joined" && styles.filterButtonActive,
          ]}
          onPress={() => setFilter("joined")}
        >
          <Text
            style={[
              styles.filterText,
              filter === "joined" && styles.filterTextActive,
            ]}
          >
            Joined
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === "all" && styles.filterButtonActive,
          ]}
          onPress={() => setFilter("all")}
        >
          <Text
            style={[
              styles.filterText,
              filter === "all" && styles.filterTextActive,
            ]}
          >
            In the Area
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filter === "created" && styles.filterButtonActive,
          ]}
          onPress={() => setFilter("created")}
        >
          <Text
            style={[
              styles.filterText,
              filter === "created" && styles.filterTextActive,
            ]}
          >
            Created
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <ActivityIndicator
            size="large"
            color="#007AFF"
            style={styles.loader}
          />
        ) : filteredActivities.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No activities found</Text>
            <Text style={styles.emptySubtext}>
              {filter === "all"
                ? "Create one to get started!"
                : "Try a different filter"}
            </Text>
          </View>
        ) : (
          filteredActivities.map((activity) => (
            <TouchableOpacity
              key={activity.id}
              style={styles.activityCard}
              onPress={() => router.push(`/activities/${activity.id}`)}
            >
              <View style={styles.cardTop}>
                <View style={styles.activityHeader}>
                  <Text style={styles.activityTitle} numberOfLines={1}>
                    {activity.title}
                  </Text>
                  <View style={styles.categoryContainer}>
                    <View
                      style={[
                        styles.categoryBadge,
                        {
                          backgroundColor: getCategoryColor(activity.category),
                        },
                      ]}
                    >
                      <Text style={styles.activityCategory}>
                        {activity.category}
                      </Text>
                    </View>
                    {activity.subcategory && (
                      <Text style={styles.subcategoryText}>
                        {activity.subcategory}
                      </Text>
                    )}
                  </View>
                </View>
                <Text style={styles.activityDescription} numberOfLines={2}>
                  {activity.description}
                </Text>
              </View>
              <View style={styles.cardBottom}>
                {activity.location?.address && (
                  <Text style={styles.activityLocation} numberOfLines={1}>
                    {activity.location.address}
                  </Text>
                )}
                <View style={styles.activityFooter}>
                  <Text style={styles.activityDate}>
                    {activity.date.toLocaleDateString()}
                  </Text>
                  <Text style={styles.activityParticipants}>
                    {activity.participants.length}
                    {activity.maxParticipants
                      ? `/${activity.maxParticipants}`
                      : ""}{" "}
                    joined
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
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
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  createButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  searchContainer: {
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  searchInput: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 16,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
  },
  filterButtonActive: {
    backgroundColor: "#007AFF",
  },
  filterText: {
    fontSize: 14,
    color: "#666",
  },
  filterTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loader: {
    marginTop: 32,
  },
  emptyState: {
    alignItems: "center",
    padding: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#666",
  },
  activityCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 0,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    overflow: "hidden",
  },
  cardTop: {
    padding: 16,
    paddingBottom: 12,
  },
  cardBottom: {
    padding: 16,
    paddingTop: 8,
    backgroundColor: "#f9f9f9",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  activityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 12,
  },
  categoryContainer: {
    alignItems: "flex-end",
    gap: 4,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  activityCategory: {
    fontSize: 11,
    color: "#fff",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  subcategoryText: {
    fontSize: 10,
    color: "#666",
    fontWeight: "500",
  },
  activityDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  activityFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  activityDate: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  activityParticipants: {
    fontSize: 13,
    color: "#007AFF",
    fontWeight: "600",
  },
  activityLocation: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
});

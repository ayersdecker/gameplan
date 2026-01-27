import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../../src/services/firebase";
import { useAuth } from "../../src/hooks/useAuth";
import { Activity } from "../../src/types";

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [suggestedActivity, setSuggestedActivity] = useState<Activity | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, [user]);

  const loadActivities = async () => {
    try {
      const q = query(
        collection(db, "activities"),
        orderBy("date", "asc"),
        limit(10),
      );
      const snapshot = await getDocs(q);
      const activitiesData = snapshot.docs
        .map((doc) => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            ...data,
            date: data.date?.toDate?.() || new Date(),
            createdAt: data.createdAt?.toDate?.() || new Date(),
            isPublic: data.isPublic ?? true,
          };
        })
        .filter((a) => a.isPublic !== false) as Activity[];
      setActivities(activitiesData);

      // Find a suggested activity
      if (user) {
        // Get categories user is already in
        const userCategories = activitiesData
          .filter((a) => a.participants.includes(user.id))
          .map((a) => a.category);

        // Find activities user hasn't joined
        const notJoined = activitiesData.filter(
          (a) => !a.participants.includes(user.id),
        );

        // Prefer activities of different categories
        const differentCategory = notJoined.filter(
          (a) => !userCategories.includes(a.category),
        );

        // Pick the first different category activity, or any activity not joined
        const suggestion =
          differentCategory.length > 0 ? differentCategory[0] : notJoined[0];

        setSuggestedActivity(suggestion || null);
      }
    } catch (error) {
      console.error("Error loading activities:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>
          Welcome back, {user?.displayName}!
        </Text>
        <Text style={styles.subtitle}>Ready to join an activity?</Text>
      </View>

      <View style={styles.content}>
        {suggestedActivity && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Suggested For You</Text>
            <TouchableOpacity
              style={styles.suggestedCard}
              onPress={() => router.push(`/activities/${suggestedActivity.id}`)}
            >
              <View style={styles.suggestedBadge}>
                <Text style={styles.suggestedBadgeText}>NEW</Text>
              </View>
              <View style={styles.activityHeader}>
                <Text style={styles.activityTitle}>
                  {suggestedActivity.title}
                </Text>
                <View style={styles.categoryContainer}>
                  <Text style={styles.activityCategory}>
                    {suggestedActivity.category}
                  </Text>
                  {suggestedActivity.subcategory && (
                    <Text style={styles.subcategoryText}>
                      {suggestedActivity.subcategory}
                    </Text>
                  )}
                </View>
              </View>
              <Text style={styles.activityDescription} numberOfLines={1}>
                {suggestedActivity.description}
              </Text>
              <View style={styles.activityFooter}>
                <Text style={styles.activityDate}>
                  📅 {suggestedActivity.date.toLocaleDateString()}
                </Text>
                <Text style={styles.activityParticipants}>
                  👥 {suggestedActivity.participants.length} joined
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upcoming Activities</Text>

          {loading ? (
            <ActivityIndicator
              size="large"
              color="#007AFF"
              style={styles.loader}
            />
          ) : activities.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No activities yet</Text>
              <Text style={styles.emptySubtext}>
                Be the first to create one!
              </Text>
              <TouchableOpacity
                style={styles.createButton}
                onPress={() => router.push("/activities/create")}
              >
                <Text style={styles.createButtonText}>Create Activity</Text>
              </TouchableOpacity>
            </View>
          ) : (
            activities.slice(0, 2).map((activity) => (
              <TouchableOpacity
                key={activity.id}
                style={styles.activityCard}
                onPress={() => router.push(`/activities/${activity.id}`)}
              >
                <View style={styles.activityHeader}>
                  <Text style={styles.activityTitle}>{activity.title}</Text>
                  <View style={styles.categoryContainer}>
                    <Text style={styles.activityCategory}>
                      {activity.category}
                    </Text>
                    {activity.subcategory && (
                      <Text style={styles.subcategoryText}>
                        {activity.subcategory}
                      </Text>
                    )}
                  </View>
                </View>
                <Text style={styles.activityDescription} numberOfLines={1}>
                  {activity.description}
                </Text>
                <View style={styles.activityFooter}>
                  <Text style={styles.activityDate}>
                    📅 {activity.date.toLocaleDateString()}
                  </Text>
                  <Text style={styles.activityParticipants}>
                    👥 {activity.participants.length} joined
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Stats</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{user?.badges.length || 0}</Text>
              <Text style={styles.statLabel}>Badges</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {user?.interests.length || 0}
              </Text>
              <Text style={styles.statLabel}>Interests</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#fff",
    padding: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  loader: {
    marginTop: 32,
  },
  emptyState: {
    alignItems: "center",
    padding: 32,
    backgroundColor: "#fff",
    borderRadius: 12,
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
    marginBottom: 16,
  },
  createButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  activityCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  suggestedCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    elevation: 3,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: "#007AFF",
    position: "relative",
  },
  suggestedBadge: {
    position: "absolute",
    top: -8,
    right: 16,
    backgroundColor: "#007AFF",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  suggestedBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  activityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  categoryContainer: {
    alignItems: "flex-end",
    gap: 2,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
  },
  activityCategory: {
    fontSize: 10,
    color: "#007AFF",
    fontWeight: "600",
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  subcategoryText: {
    fontSize: 9,
    color: "#666",
    fontWeight: "500",
  },
  activityDescription: {
    fontSize: 13,
    color: "#666",
    marginBottom: 6,
  },
  activityFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  activityDate: {
    fontSize: 12,
    color: "#999",
  },
  activityParticipants: {
    fontSize: 12,
    color: "#999",
  },
  statsContainer: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
  },
});

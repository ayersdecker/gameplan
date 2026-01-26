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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadActivities();
  }, []);

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
          Welcome back, {user?.displayName}! 👋
        </Text>
        <Text style={styles.subtitle}>Ready to join an activity?</Text>
      </View>

      <ScrollView style={styles.content}>
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
            activities.map((activity) => (
              <TouchableOpacity
                key={activity.id}
                style={styles.activityCard}
                onPress={() => router.push(`/activities/${activity.id}`)}
              >
                <View style={styles.activityHeader}>
                  <Text style={styles.activityTitle}>{activity.title}</Text>
                  <Text style={styles.activityCategory}>
                    {activity.category}
                  </Text>
                </View>
                <Text style={styles.activityDescription} numberOfLines={2}>
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
    backgroundColor: "#fff",
    padding: 24,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  activityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  activityTitle: {
    fontSize: 18,
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
  activityDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
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
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
  },
});

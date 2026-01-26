import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
  ScrollView,
  Platform,
} from "react-native";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  limit,
} from "firebase/firestore";
import { db } from "../../src/services/firebase";
import { useRouter } from "expo-router";
import { useLocation } from "../../src/hooks/useLocation";
import { Activity } from "../../src/types";

// Import enhanced map component - web only
let LeafletMapEnhancedWrapper: any = null;
function getLeafletMapEnhanced() {
  if (LeafletMapEnhancedWrapper) return LeafletMapEnhancedWrapper;
  if (Platform.OS !== "web") return null;
  if (typeof window === "undefined") return null;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  LeafletMapEnhancedWrapper =
    require("../../src/components/LeafletMapEnhanced").default;
  return LeafletMapEnhancedWrapper;
}

const RADIUS_KM = 50; // Show activities within 50km

function getCategoryColor(category: string): string {
  switch (category) {
    case "Outdoor":
      return "#FF6B6B";
    case "Sports":
      return "#FFD93D";
    case "Fitness":
      return "#6BCB77";
    case "Social":
      return "#4D96FF";
    case "Learning":
      return "#D946EF";
    case "Arts":
      return "#FF6B35";
    default:
      return "#9D84B7";
  }
}

function getCategoryEmoji(category: string): string {
  switch (category) {
    case "Outdoor":
      return "🏕️";
    case "Sports":
      return "⚽";
    case "Fitness":
      return "💪";
    case "Social":
      return "🎉";
    case "Learning":
      return "📚";
    case "Arts":
      return "🎨";
    default:
      return "🎯";
  }
}

function RadarPulse() {
  const scale = React.useRef(new Animated.Value(0.5)).current;
  const opacity = React.useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1.6,
          duration: 1800,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.18,
            duration: 900,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 900,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity, scale]);

  return (
    <View pointerEvents="none" style={styles.radarContainer}>
      <Animated.View
        style={[
          styles.radarPulse,
          {
            opacity,
            transform: [{ scale }],
          },
        ]}
      />
      <View style={styles.radarDot} />
    </View>
  );
}

export default function MapTab() {
  const router = useRouter();
  const {
    location: userLocation,
    getCurrentLocation,
    getDistance,
    loading: gettingLocation,
  } = useLocation();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [nearbyActivities, setNearbyActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(
    null,
  );

  useEffect(() => {
    // Get user's current location on mount
    const loadUserLocation = async () => {
      await getCurrentLocation();
    };
    loadUserLocation();
  }, []);

  useEffect(() => {
    // Real-time listener for all public activities
    const q = query(
      collection(db, "activities"),
      orderBy("date", "asc"),
      limit(10),
    );

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
              isPublic: data.isPublic ?? true,
            };
          })
          .filter((a) => a.isPublic !== false) as Activity[];
        setActivities(activitiesData);

        // Filter nearby activities if user location is available
        if (userLocation?.latitude && userLocation?.longitude) {
          const nearby = activitiesData.filter((activity) => {
            // Support both new nested location structure and legacy flat structure
            const lat = activity.location?.latitude ?? activity.latitude;
            const lng = activity.location?.longitude ?? activity.longitude;
            if (!lat || !lng) return false;
            const distance = getDistance(
              userLocation.latitude,
              userLocation.longitude,
              lat,
              lng,
            );
            return distance <= RADIUS_KM;
          });
          setNearbyActivities(nearby);
        }

        setLoading(false);
      },
      (error) => {
        console.error("Error loading activities:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [userLocation]);

  return Platform.select({
    web: () => renderWebMap(),
    default: () => renderMobile2DMap(),
  })();

  function renderWebMap() {
    // Expo Router performs SSR on web; Leaflet requires a browser.
    if (typeof window === "undefined") {
      return (
        <View style={styles.container}>
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      );
    }

    // Web-only leaflet map component
    if (loading && !nearbyActivities.length) {
      return (
        <View style={styles.container}>
          <ActivityIndicator
            size="large"
            color="#007AFF"
            style={{ marginTop: 20 }}
          />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      );
    }

    const LeafletMapEnhanced = getLeafletMapEnhanced();

    if (!LeafletMapEnhanced) {
      return (
        <View style={styles.container}>
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      );
    }

    return (
      <View style={[styles.container, { width: "100%", height: "100%" }]}>
        {!userLocation && !gettingLocation && (
          <View style={styles.noLocationBanner}>
            <Text style={styles.noLocationText}>
              📍 Enable location to see the map
            </Text>
            <TouchableOpacity
              style={styles.enableLocationButton}
              onPress={getCurrentLocation}
            >
              <Text style={styles.enableLocationButtonText}>Enable</Text>
            </TouchableOpacity>
          </View>
        )}

        {userLocation && (
          <LeafletMapEnhanced
            activities={activities}
            userLocation={userLocation}
            selectedActivityId={selectedActivity?.id}
            onActivitySelect={(id: string) => {
              const activity = activities.find((a) => a.id === id);
              if (activity) {
                setSelectedActivity(activity);
                router.push(`/activities/${id}`);
              }
            }}
          />
        )}
      </View>
    );
  }

  function renderMobile2DMap() {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Activity Map</Text>
            <Text style={styles.subtitle}>
              {nearbyActivities.length}{" "}
              {nearbyActivities.length === 1 ? "activity" : "activities"} nearby
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.refreshButton,
              gettingLocation && styles.refreshButtonLoading,
            ]}
            onPress={getCurrentLocation}
            disabled={gettingLocation}
          >
            <Text style={styles.refreshButtonText}>
              {gettingLocation ? "🔄" : "📍"}
            </Text>
          </TouchableOpacity>
        </View>

        {!userLocation && !gettingLocation && (
          <View style={styles.noLocationBanner}>
            <Text style={styles.noLocationText}>
              📍 Enable location to see nearby activities
            </Text>
            <TouchableOpacity
              style={styles.enableLocationButton}
              onPress={getCurrentLocation}
            >
              <Text style={styles.enableLocationButtonText}>
                Enable Location
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {userLocation && (
          <View style={styles.userLocationBanner}>
            <Text style={styles.userLocationText}>
              📌 Your location: ({userLocation.latitude.toFixed(4)},{" "}
              {userLocation.longitude.toFixed(4)})
            </Text>
            {userLocation.address && (
              <Text style={styles.userLocationAddress}>
                {userLocation.address}
              </Text>
            )}
          </View>
        )}

        <ScrollView style={styles.mapContainer}>
          <View style={styles.mapGrid}>
            {nearbyActivities.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  {userLocation
                    ? "🗺️ No nearby activities"
                    : "📍 Enable location to see nearby activities"}
                </Text>
                <Text style={styles.emptySubtext}>
                  {userLocation
                    ? `Within ${RADIUS_KM}km of your location`
                    : "Activities will appear once you enable location"}
                </Text>
              </View>
            ) : (
              nearbyActivities.map((activity) => {
                const isSelected = selectedActivity?.id === activity.id;
                const categoryColor =
                  activity.category === "Outdoor"
                    ? "#FF6B6B"
                    : activity.category === "Sports"
                      ? "#FFD93D"
                      : activity.category === "Fitness"
                        ? "#6BCB77"
                        : activity.category === "Social"
                          ? "#4D96FF"
                          : "#9D84B7";

                const distance = userLocation
                  ? (() => {
                      const lat =
                        activity.location?.latitude ?? activity.latitude;
                      const lng =
                        activity.location?.longitude ?? activity.longitude;
                      return lat && lng
                        ? getDistance(
                            userLocation.latitude,
                            userLocation.longitude,
                            lat,
                            lng,
                          )
                        : null;
                    })()
                  : null;

                return (
                  <TouchableOpacity
                    key={activity.id}
                    style={[
                      styles.activityMarker,
                      { backgroundColor: categoryColor },
                      isSelected && styles.selectedMarker,
                    ]}
                    onPress={() => setSelectedActivity(activity)}
                  >
                    <Text style={styles.markerEmoji}>
                      {activity.category === "Outdoor"
                        ? "🏞️"
                        : activity.category === "Sports"
                          ? "⚽"
                          : activity.category === "Fitness"
                            ? "💪"
                            : activity.category === "Social"
                              ? "👥"
                              : "🎯"}
                    </Text>
                    {distance !== null && (
                      <Text style={styles.markerDistance}>
                        {distance.toFixed(1)}km
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </ScrollView>

        {selectedActivity && (
          <View style={styles.infoPanel}>
            <Text style={styles.infoTitle}>{selectedActivity.title}</Text>
            <Text style={styles.infoCategory}>{selectedActivity.category}</Text>
            <Text style={styles.infoText}>
              📅 {selectedActivity.date.toLocaleDateString()}
            </Text>
            <Text style={styles.infoText}>
              ⏰ {selectedActivity.date.toLocaleTimeString()}
            </Text>
            {selectedActivity.location?.address && (
              <Text style={styles.infoText}>
                📍 {selectedActivity.location.address}
              </Text>
            )}
            {(() => {
              const lat =
                selectedActivity.location?.latitude ??
                selectedActivity.latitude;
              const lng =
                selectedActivity.location?.longitude ??
                selectedActivity.longitude;
              return lat !== undefined && lng !== undefined && userLocation ? (
                <Text style={styles.infoText}>
                  🗺️{" "}
                  {getDistance(
                    userLocation.latitude,
                    userLocation.longitude,
                    lat,
                    lng,
                  ).toFixed(1)}
                  km away
                </Text>
              ) : null;
            })()}
            <Text style={styles.infoText}>
              👥 {selectedActivity.participants.length} participant
              {selectedActivity.participants.length !== 1 ? "s" : ""}
            </Text>

            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => {
                router.push(`/activities/${selectedActivity.id}`);
                setSelectedActivity(null);
              }}
            >
              <Text style={styles.viewButtonText}>View Activity</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedActivity(null)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 2,
    borderBottomColor: "#007AFF",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#007AFF",
  },
  subtitle: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  refreshButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#007AFF",
    borderRadius: 50,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  refreshButtonLoading: {
    opacity: 0.7,
  },
  refreshButtonText: {
    fontSize: 18,
    color: "#fff",
  },
  map3dContainer: {
    flex: 1,
    position: "relative",
  },
  webHudRoot: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
  },
  radarContainer: {
    position: "absolute",
    top: 14,
    left: 14,
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  radarPulse: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#2F80FF",
    backgroundColor: "rgba(47, 128, 255, 0.10)",
  },
  radarDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#007AFF",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  modePill: {
    position: "absolute",
    top: 14,
    alignSelf: "center",
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderRadius: 999,
    padding: 4,
    borderWidth: 1,
    borderColor: "rgba(0, 122, 255, 0.25)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 10,
  },
  modePillButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  modePillButtonActive: {
    backgroundColor: "#007AFF",
  },
  modePillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0B1220",
    letterSpacing: 0.3,
  },
  modePillTextActive: {
    color: "#FFFFFF",
  },
  webRightControls: {
    position: "absolute",
    top: 14,
    right: 14,
    gap: 10,
  },
  webFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
  },
  webFabPrimary: {
    backgroundColor: "#007AFF",
    borderColor: "rgba(0, 122, 255, 0.45)",
  },
  webFabText: {
    fontSize: 18,
    color: "#0B1220",
  },
  nearbyRow: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 14,
  },
  nearbyScrollContent: {
    paddingHorizontal: 14,
    gap: 10,
  },
  nearbyChip: {
    width: 200,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 10,
  },
  nearbyChipEmoji: {
    fontSize: 18,
  },
  nearbyChipTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0B1220",
  },
  nearbyChipMeta: {
    fontSize: 11,
    color: "#667085",
    marginTop: 2,
  },
  webBottomSheet: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 14,
  },
  webBottomSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  webSheetTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0B1220",
  },
  webSheetSubtitle: {
    fontSize: 12,
    color: "#667085",
    marginTop: 2,
  },
  webSheetClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  webSheetCloseText: {
    fontSize: 16,
    color: "#0B1220",
    fontWeight: "700",
  },
  webSheetButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  webSheetButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  webSheetButtonPrimary: {
    backgroundColor: "#007AFF",
  },
  webSheetButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0B1220",
  },
  webSheetButtonTextPrimary: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  noLocationBanner: {
    backgroundColor: "#E3F2FD",
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "#007AFF",
  },
  noLocationText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
  },
  enableLocationButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  enableLocationButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  userLocationBanner: {
    backgroundColor: "#F5F5F5",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  userLocationText: {
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
  },
  userLocationAddress: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  mapContainer: {
    flex: 1,
  },
  mapGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 8,
    gap: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#007AFF",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#999",
  },
  activityMarker: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    elevation: 4,
  },
  selectedMarker: {
    borderWidth: 3,
    borderColor: "#007AFF",
  },
  markerEmoji: {
    fontSize: 32,
  },
  markerDistance: {
    color: "#fff",
    fontWeight: "bold",
    marginTop: 2,
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  infoPanel: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#007AFF",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007AFF",
    marginBottom: 8,
  },
  infoCategory: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
    backgroundColor: "#FF4040",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: "#666",
    marginBottom: 6,
  },
  viewButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  viewButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  closeButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#007AFF",
  },
  closeButtonText: {
    color: "#007AFF",
    fontWeight: "600",
    fontSize: 14,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "500",
  },
});

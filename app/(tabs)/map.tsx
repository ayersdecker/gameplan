import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../src/services/firebase';
import { useRouter } from 'expo-router';
import { useLocation } from '../../src/hooks/useLocation';
import { Activity } from '../../src/types';

// Import map component - web only
let LeafletMapWrapper: any = null;
if (Platform.OS === 'web') {
  LeafletMapWrapper = require('../../src/components/LeafletMap').LeafletMap;
}

const RADIUS_KM = 50; // Show activities within 50km

export default function MapTab() {
  const router = useRouter();
  const { location: userLocation, getCurrentLocation, getDistance, loading: gettingLocation } = useLocation();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [nearbyActivities, setNearbyActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  useEffect(() => {
    // Get user's current location on mount
    const loadUserLocation = async () => {
      await getCurrentLocation();
    };
    loadUserLocation();
  }, []);

  useEffect(() => {
    // Real-time listener for all public activities
    const q = query(collection(db, 'activities'), orderBy('date', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const activitiesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().date?.toDate() || new Date(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        })) as Activity[];
        setActivities(activitiesData);

        // Filter nearby activities if user location is available
        if (userLocation?.latitude && userLocation?.longitude) {
          const nearby = activitiesData.filter((activity) => {
            if (!activity.latitude || !activity.longitude) return false;
            const distance = getDistance(
              userLocation.latitude,
              userLocation.longitude,
              activity.latitude,
              activity.longitude
            );
            return distance <= RADIUS_KM;
          });
          setNearbyActivities(nearby);
        }

        setLoading(false);
      },
      (error) => {
        console.error('Error loading activities:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userLocation]);

  return Platform.select({
    web: () => renderWeb3DMap(),
    default: () => renderMobile2DMap(),
  })();

  function renderWeb3DMap() {
    // Web-only leaflet map component
    if (loading && !nearbyActivities.length) {
      return (
        <View style={styles.container}>
          <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      );
    }

    return (
      <View style={[styles.container, { width: '100%', height: '100%' }]}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Activity Map</Text>
            <Text style={styles.subtitle}>
              {nearbyActivities.length} {nearbyActivities.length === 1 ? 'activity' : 'activities'} nearby
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.refreshButton, gettingLocation && styles.refreshButtonLoading]}
            onPress={getCurrentLocation}
            disabled={gettingLocation}
          >
            <Text style={styles.refreshButtonText}>{gettingLocation ? '🔄' : '📍'}</Text>
          </TouchableOpacity>
        </View>

        {!userLocation && !gettingLocation && (
          <View style={styles.noLocationBanner}>
            <Text style={styles.noLocationText}>📍 Enable location to see the map</Text>
            <TouchableOpacity
              style={styles.enableLocationButton}
              onPress={getCurrentLocation}
            >
              <Text style={styles.enableLocationButtonText}>Enable</Text>
            </TouchableOpacity>
          </View>
        )}

        {userLocation && (
          <View style={[styles.map3dContainer, { width: '100%', flex: 1 }]}>
            {LeafletMapWrapper && (
              <LeafletMapWrapper
                activities={activities}
                nearbyActivities={nearbyActivities}
                userLocation={userLocation}
                selectedActivity={selectedActivity}
                onSelectActivity={setSelectedActivity}
                RADIUS_KM={RADIUS_KM}
              />
            )}
          </View>
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
              {nearbyActivities.length} {nearbyActivities.length === 1 ? 'activity' : 'activities'} nearby
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.refreshButton, gettingLocation && styles.refreshButtonLoading]}
            onPress={getCurrentLocation}
            disabled={gettingLocation}
          >
            <Text style={styles.refreshButtonText}>{gettingLocation ? '🔄' : '📍'}</Text>
          </TouchableOpacity>
        </View>

        {!userLocation && !gettingLocation && (
          <View style={styles.noLocationBanner}>
            <Text style={styles.noLocationText}>📍 Enable location to see nearby activities</Text>
            <TouchableOpacity
              style={styles.enableLocationButton}
              onPress={getCurrentLocation}
            >
              <Text style={styles.enableLocationButtonText}>Enable Location</Text>
            </TouchableOpacity>
          </View>
        )}

        {userLocation && (
          <View style={styles.userLocationBanner}>
            <Text style={styles.userLocationText}>
              📌 Your location: ({userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)})
            </Text>
            {userLocation.address && (
              <Text style={styles.userLocationAddress}>{userLocation.address}</Text>
            )}
          </View>
        )}

        <ScrollView style={styles.mapContainer}>
          <View style={styles.mapGrid}>
            {nearbyActivities.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  {userLocation ? '🗺️ No nearby activities' : '📍 Enable location to see nearby activities'}
                </Text>
                <Text style={styles.emptySubtext}>
                  {userLocation
                    ? `Within ${RADIUS_KM}km of your location`
                    : 'Activities will appear once you enable location'}
                </Text>
              </View>
            ) : (
              nearbyActivities.map((activity) => {
                const isSelected = selectedActivity?.id === activity.id;
                const categoryColor =
                  activity.category === 'Outdoor'
                    ? '#FF6B6B'
                    : activity.category === 'Sports'
                      ? '#FFD93D'
                      : activity.category === 'Fitness'
                        ? '#6BCB77'
                        : activity.category === 'Social'
                          ? '#4D96FF'
                          : '#9D84B7';

                const distance =
                  userLocation && activity.latitude && activity.longitude
                    ? getDistance(
                        userLocation.latitude,
                        userLocation.longitude,
                        activity.latitude,
                        activity.longitude
                      )
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
                      {activity.category === 'Outdoor'
                        ? '🏞️'
                        : activity.category === 'Sports'
                          ? '⚽'
                          : activity.category === 'Fitness'
                            ? '💪'
                            : activity.category === 'Social'
                              ? '👥'
                              : '🎯'}
                    </Text>
                    {distance !== null && (
                      <Text style={styles.markerDistance}>{distance.toFixed(1)}km</Text>
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
            {selectedActivity.location && (
              <Text style={styles.infoText}>📍 {selectedActivity.location}</Text>
            )}
            {selectedActivity.latitude !== undefined && selectedActivity.longitude !== undefined && userLocation && (
              <Text style={styles.infoText}>
                🗺️ {getDistance(
                  userLocation.latitude,
                  userLocation.longitude,
                  selectedActivity.latitude!,
                  selectedActivity.longitude!
                ).toFixed(1)}
                km away
              </Text>
            )}
            <Text style={styles.infoText}>
              👥 {selectedActivity.participants.length} participant
              {selectedActivity.participants.length !== 1 ? 's' : ''}
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
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  subtitle: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  refreshButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#007AFF',
    borderRadius: 50,
    shadowColor: '#007AFF',
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
    color: '#fff',
  },
  map3dContainer: {
    flex: 1,
    position: 'relative',
  },
  noLocationBanner: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  noLocationText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  enableLocationButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  enableLocationButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  userLocationBanner: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  userLocationText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  userLocationAddress: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  mapContainer: {
    flex: 1,
  },
  mapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  activityMarker: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    elevation: 4,
  },
  selectedMarker: {
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  markerEmoji: {
    fontSize: 32,
  },
  markerDistance: {
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  infoPanel: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 8,
  },
  infoCategory: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
    backgroundColor: '#FF4040',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  viewButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  viewButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  closeButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  closeButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 14,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
});

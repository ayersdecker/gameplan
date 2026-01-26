import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
} from "react-native";

interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

interface Activity {
  id: string;
  title: string;
  description?: string;
  category: string;
  location: Location;
  date?: string;
}

interface LeafletMapProps {
  activities: Activity[];
  userLocation: { latitude: number; longitude: number } | null;
  selectedActivityId?: string;
  onActivitySelect?: (activityId: string) => void;
  onLocationSelect?: (location: Location) => void;
}

// Category configuration
const CATEGORIES: Record<
  string,
  { icon: string; color: string; label: string }
> = {
  Sports: { icon: "⚽", color: "#FF6B35", label: "Sports" },
  Food: { icon: "🍕", color: "#F7931E", label: "Food & Dining" },
  Entertainment: { icon: "🎬", color: "#C71585", label: "Entertainment" },
  Outdoors: { icon: "🏞️", color: "#22B573", label: "Outdoors" },
  Social: { icon: "🎉", color: "#9B59B6", label: "Social" },
  Education: { icon: "📚", color: "#3498DB", label: "Education" },
  Shopping: { icon: "🛍️", color: "#E74C3C", label: "Shopping" },
  Arts: { icon: "🎨", color: "#F39C12", label: "Arts & Culture" },
  Fitness: { icon: "💪", color: "#27AE60", label: "Fitness" },
  Other: { icon: "📍", color: "#95A5A6", label: "Other" },
};

const getCategoryInfo = (category: string) => {
  return CATEGORIES[category] || CATEGORIES.Other;
};

// Calculate distance between two coordinates
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Enhanced marker HTML
const createMarkerHTML = (
  color: string,
  icon: string,
  isSelected: boolean,
  distance?: number,
) => {
  const scale = isSelected ? 1.4 : 1;
  const shadow = isSelected
    ? "0 0 20px rgba(0, 122, 255, 0.8), 0 4px 10px rgba(0, 0, 0, 0.3)"
    : "0 3px 8px rgba(0, 0, 0, 0.25)";

  return `
    <div style="position: relative; width: ${40 * scale}px; height: ${40 * scale}px;">
      ${
        isSelected
          ? `
        <div style="
          position: absolute;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle, rgba(0, 122, 255, 0.4), transparent);
          border-radius: 50%;
          animation: marker-pulse 1.5s ease-out infinite;
        "></div>
      `
          : ""
      }
      <div style="
        position: absolute;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, ${color} 0%, ${color}dd 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${20 * scale}px;
        box-shadow: ${shadow};
        border: ${isSelected ? "4px solid #007AFF" : "3px solid white"};
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        transform: ${isSelected ? "translateY(-4px)" : "translateY(0)"};
      ">
        ${icon}
      </div>
      ${
        distance !== undefined
          ? `
        <div style="
          position: absolute;
          bottom: -22px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.85);
          color: white;
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 700;
          white-space: nowrap;
          font-family: Inter, -apple-system, sans-serif;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        ">${distance.toFixed(1)}km</div>
      `
          : ""
      }
    </div>
    <style>
      @keyframes marker-pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.5); opacity: 0.3; }
      }
    </style>
  `;
};

const LeafletMapEnhanced: React.FC<LeafletMapProps> = ({
  activities,
  userLocation,
  selectedActivityId,
  onActivitySelect,
  onLocationSelect,
}) => {
  const mapRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const userRadiusRef = useRef<any>(null);
  const hasInitializedRef = useRef(false);
  const [L, setL] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [showFilters, setShowFilters] = useState(false);

  // Load Leaflet
  useEffect(() => {
    const loadLeaflet = async () => {
      try {
        const leaflet = await import("leaflet");
        setL(leaflet.default);
      } catch (error) {
        console.error("Failed to load Leaflet:", error);
      }
    };
    loadLeaflet();
  }, []);

  // Initialize map
  useEffect(() => {
    if (!L || !mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([37.7749, -122.4194], 12);

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        maxZoom: 19,
        minZoom: 2,
      },
    ).addTo(map);

    mapInstanceRef.current = map;

    // Add "locate me" button
    const locateButton = L.control({ position: "bottomright" });
    locateButton.onAdd = function () {
      const div = L.DomUtil.create("div", "leaflet-bar leaflet-control");
      div.style.marginBottom = "80px"; // Position above the bottom navigation
      div.innerHTML = `
        <a href="#" style="
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
          text-decoration: none;
          font-size: 20px;
          transition: all 0.2s;
        " onclick="
          event.preventDefault();
          window.dispatchEvent(new Event('locateUser'));
          this.style.background = '#007AFF';
          setTimeout(() => this.style.background = 'white', 200);
        ">📍</a>
      `;
      return div;
    };
    locateButton.addTo(map);

    // Listen for locate user event
    window.addEventListener("locateUser", () => {
      if (userLocation && mapInstanceRef.current) {
        mapInstanceRef.current.setView(
          [userLocation.latitude, userLocation.longitude],
          15,
          { animate: true, duration: 1 },
        );
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [L]);

  // Fix map size when component becomes visible
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const resizeMap = () => {
      if (mapInstanceRef.current) {
        setTimeout(() => {
          mapInstanceRef.current?.invalidateSize();
        }, 100);
      }
    };

    // Resize when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        resizeMap();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", resizeMap);

    // Initial resize
    resizeMap();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", resizeMap);
    };
  }, []);

  // Update user location marker and radius
  useEffect(() => {
    if (!L || !mapInstanceRef.current || !userLocation) return;

    // Remove existing markers
    if (userMarkerRef.current) {
      mapInstanceRef.current.removeLayer(userMarkerRef.current);
    }
    if (userRadiusRef.current) {
      mapInstanceRef.current.removeLayer(userRadiusRef.current);
    }

    // Add user marker
    const userMarker = L.marker(
      [userLocation.latitude, userLocation.longitude],
      {
        icon: L.divIcon({
          html: `
            <div style="position: relative; width: 48px; height: 48px;">
              <div style="
                position: absolute;
                width: 100%;
                height: 100%;
                background: rgba(0, 122, 255, 0.25);
                border-radius: 50%;
                animation: pulse 2s ease-out infinite;
              "></div>
              <div style="
                position: absolute;
                width: 80%;
                height: 80%;
                top: 10%;
                left: 10%;
                background: rgba(0, 122, 255, 0.4);
                border-radius: 50%;
                animation: pulse 2s ease-out infinite 0.5s;
              "></div>
              <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 18px;
                height: 18px;
                background: #007AFF;
                border-radius: 50%;
                border: 4px solid white;
                box-shadow: 0 3px 10px rgba(0, 122, 255, 0.5);
              "></div>
            </div>
            <style>
              @keyframes pulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.8); opacity: 0; }
              }
            </style>
          `,
          className: "user-location-marker",
          iconSize: [48, 48],
          iconAnchor: [24, 24],
        }),
        zIndexOffset: 10000,
      },
    );

    userMarker.bindPopup(`
      <div style="font-family: Inter, -apple-system, sans-serif; padding: 8px; text-align: center;">
        <div style="font-size: 24px; margin-bottom: 6px;">📍</div>
        <p style="margin: 0; font-size: 15px; font-weight: 700; color: #007AFF;">You are here</p>
      </div>
    `);

    userMarker.addTo(mapInstanceRef.current);
    userMarkerRef.current = userMarker;

    // Center on user location on first load
    if (!hasInitializedRef.current) {
      mapInstanceRef.current.setView(
        [userLocation.latitude, userLocation.longitude],
        13,
      );
      hasInitializedRef.current = true;
    }
  }, [L, userLocation]);

  // Filter activities
  const filteredActivities = activities.filter((activity) => {
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        activity.title.toLowerCase().includes(query) ||
        activity.description?.toLowerCase().includes(query) ||
        activity.category.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Filter by categories
    if (selectedCategories.size > 0) {
      if (!selectedCategories.has(activity.category)) return false;
    }

    return true;
  });

  // Update activity markers
  useEffect(() => {
    if (!L || !mapInstanceRef.current) return;

    // Remove old markers
    markersRef.current.forEach((marker) =>
      mapInstanceRef.current.removeLayer(marker),
    );
    markersRef.current = [];

    // Add new markers
    filteredActivities.forEach((activity) => {
      // Skip activities with invalid location data
      if (!activity.location?.latitude || !activity.location?.longitude) {
        console.warn(
          `Skipping activity "${activity.title}" - missing location data`,
        );
        return;
      }

      const { latitude, longitude } = activity.location;
      const category = getCategoryInfo(activity.category);

      const distance = userLocation
        ? calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            latitude,
            longitude,
          )
        : undefined;

      const isSelected = selectedActivityId === activity.id;
      const iconSize = isSelected ? [56, 56] : [40, 40];

      const marker = L.marker([latitude, longitude], {
        icon: L.divIcon({
          html: createMarkerHTML(
            category.color,
            category.icon,
            isSelected,
            distance,
          ),
          className: "custom-marker",
          iconSize: iconSize as [number, number],
          iconAnchor: [iconSize[0] / 2, iconSize[1] / 2],
        }),
        zIndexOffset: isSelected ? 1000 : 0,
      });

      // Enhanced popup
      marker.bindPopup(
        `
        <div style="font-family: Inter, -apple-system, sans-serif; padding: 10px; min-width: 240px;">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
            <span style="font-size: 28px;">${category.icon}</span>
            <h3 style="margin: 0; font-size: 17px; font-weight: 700; color: #000; flex: 1; line-height: 1.3;">
              ${activity.title}
            </h3>
          </div>
          <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 10px; flex-wrap: wrap;">
            <span style="font-size: 11px; font-weight: 700; color: white; background: ${category.color}; padding: 4px 10px; border-radius: 12px;">
              ${activity.category}
            </span>
            ${
              distance !== undefined
                ? `
              <span style="font-size: 11px; font-weight: 700; color: #666; background: #f0f0f0; padding: 4px 10px; border-radius: 12px;">
                📍 ${distance.toFixed(1)}km away
              </span>
            `
                : ""
            }
          </div>
          ${
            activity.description
              ? `<p style="margin: 0 0 12px 0; font-size: 14px; color: #333; line-height: 1.5;">${activity.description}</p>`
              : ""
          }
          <div style="padding-top: 10px; border-top: 1px solid #eee;">
            <p style="margin: 0 0 6px 0; font-size: 13px; color: #666; line-height: 1.4;">
              📍 ${activity.location.address || "Location"}
            </p>
            ${
              activity.date
                ? `
              <p style="margin: 0; font-size: 13px; color: #666;">
                🗓️ ${new Date(activity.date).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            `
                : ""
            }
          </div>
          <button 
            onclick="window.dispatchEvent(new CustomEvent('viewActivity', {detail: '${
              activity.id
            }'}))"
            style="
              margin-top: 14px;
              width: 100%;
              padding: 12px;
              background: linear-gradient(135deg, #007AFF 0%, #0051D5 100%);
              color: white;
              border: none;
              border-radius: 10px;
              font-size: 15px;
              font-weight: 700;
              cursor: pointer;
              font-family: Inter, -apple-system, sans-serif;
              box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
            "
            onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(0, 122, 255, 0.4)'"
            onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(0, 122, 255, 0.3)'"
          >
            View Details
          </button>
        </div>
      `,
        {
          maxWidth: 340,
          className: "custom-popup",
        },
      );

      marker.on("click", () => {
        onActivitySelect?.(activity.id);
      });

      marker.addTo(mapInstanceRef.current);
      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers
    const activitiesWithLocation = filteredActivities.filter(
      (a) => a.location?.latitude && a.location?.longitude,
    );

    if (activitiesWithLocation.length > 0 && userLocation) {
      const bounds = L.latLngBounds(
        activitiesWithLocation.map((a) => [
          a.location.latitude,
          a.location.longitude,
        ]),
      );
      bounds.extend([userLocation.latitude, userLocation.longitude]);
      mapInstanceRef.current.fitBounds(bounds, {
        padding: [50, 50],
        maxZoom: 15,
      });
    } else if (userLocation && !hasInitializedRef.current) {
      // If no activities with location, center on user
      mapInstanceRef.current.setView(
        [userLocation.latitude, userLocation.longitude],
        13,
      );
    }
  }, [
    L,
    filteredActivities,
    selectedActivityId,
    onActivitySelect,
    userLocation,
  ]);

  // Listen for activity view events from popups
  useEffect(() => {
    const handleViewActivity = (event: any) => {
      onActivitySelect?.(event.detail);
    };

    window.addEventListener("viewActivity", handleViewActivity);
    return () => window.removeEventListener("viewActivity", handleViewActivity);
  }, [onActivitySelect]);

  const toggleCategory = (category: string) => {
    const newCategories = new Set(selectedCategories);
    if (newCategories.has(category)) {
      newCategories.delete(category);
    } else {
      newCategories.add(category);
    }
    setSelectedCategories(newCategories);
  };

  return (
    <View style={styles.container}>
      {/* Search and filter bar */}
      <View style={styles.controlsContainer}>
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search activities..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles.clearButton}
            >
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text style={styles.filterIcon}>
            {selectedCategories.size > 0 ? "🎯" : "⚙️"}
          </Text>
          {selectedCategories.size > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>
                {selectedCategories.size}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Category filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <View style={styles.categoriesGrid}>
            {Object.entries(CATEGORIES).map(([key, category]) => {
              const isSelected = selectedCategories.has(key);
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.categoryChip,
                    isSelected && {
                      backgroundColor: category.color,
                      borderColor: category.color,
                    },
                  ]}
                  onPress={() => toggleCategory(key)}
                >
                  <Text style={styles.categoryIcon}>{category.icon}</Text>
                  <Text
                    style={[
                      styles.categoryLabel,
                      isSelected && styles.categoryLabelSelected,
                    ]}
                  >
                    {key}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {selectedCategories.size > 0 && (
            <TouchableOpacity
              style={styles.clearFiltersButton}
              onPress={() => setSelectedCategories(new Set())}
            >
              <Text style={styles.clearFiltersText}>Clear All Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Map */}
      <div ref={mapRef} style={{ flex: 1, width: "100%", height: "100%" }} />

      {/* Results count */}
      {(searchQuery || selectedCategories.size > 0) && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsText}>
            {filteredActivities.length} of {activities.length} activities
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  controlsContainer: {
    position: "absolute",
    top: 16,
    left: 16,
    right: 16,
    zIndex: 1000,
    flexDirection: "row",
    gap: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: "#000",
  },
  clearButton: {
    padding: 4,
  },
  clearIcon: {
    fontSize: 16,
    color: "#999",
  },
  filterButton: {
    backgroundColor: "white",
    borderRadius: 12,
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  filterIcon: {
    fontSize: 20,
  },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#FF3B30",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: "white",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  filtersContainer: {
    position: "absolute",
    top: 80,
    left: 16,
    right: 16,
    zIndex: 999,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    borderWidth: 2,
    borderColor: "#e0e0e0",
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#666",
  },
  categoryLabelSelected: {
    color: "white",
  },
  clearFiltersButton: {
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    alignItems: "center",
  },
  clearFiltersText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#666",
  },
  resultsContainer: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    zIndex: 1000,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  resultsText: {
    color: "white",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});

export default LeafletMapEnhanced;

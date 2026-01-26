import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import type * as Leaflet from "leaflet";

let leafletModule: typeof import("leaflet") | null = null;

function getLeaflet(): typeof import("leaflet") | null {
  if (leafletModule) return leafletModule;
  if (typeof window === "undefined") return null;

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const L: typeof import("leaflet") = require("leaflet");
  leafletModule = L;
  return leafletModule;
}

interface MapPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelect: (location: {
    latitude: number;
    longitude: number;
    address: string;
  }) => void;
  initialLocation?: { latitude: number; longitude: number };
}

export const MapPickerModal: React.FC<MapPickerModalProps> = ({
  visible,
  onClose,
  onLocationSelect,
  initialLocation,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<Leaflet.Map | null>(null);
  const markerRef = useRef<Leaflet.Marker | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(initialLocation || null);
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState("");

  useEffect(() => {
    const L = getLeaflet();
    if (!L) return;
    if (!visible || !mapContainerRef.current) return;

    // Initialize map
    if (!mapInstanceRef.current) {
      // Start with current location or default
      const startLat = initialLocation?.latitude || 40.7128;
      const startLng = initialLocation?.longitude || -74.006;

      mapInstanceRef.current = L.map(mapContainerRef.current).setView(
        [startLat, startLng],
        13,
      );

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        {
          maxZoom: 19,
          attribution: "© CartoDB, © OpenStreetMap contributors",
        },
      ).addTo(mapInstanceRef.current);

      // Handle map clicks
      mapInstanceRef.current.on("click", handleMapClick);

      // If no selected location yet, use initial location as starting point
      if (!selectedLocation && initialLocation) {
        setSelectedLocation(initialLocation);
        updateMarker(initialLocation.latitude, initialLocation.longitude);
        reverseGeocode(initialLocation.latitude, initialLocation.longitude);
      }
    } else if (selectedLocation) {
      // Update view if location changed
      mapInstanceRef.current.setView(
        [selectedLocation.latitude, selectedLocation.longitude],
        15,
      );
      updateMarker(selectedLocation.latitude, selectedLocation.longitude);
    }

    return () => {
      // Cleanup when modal closes
      if (!visible && mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [visible]);

  const handleMapClick = (e: any) => {
    const { lat, lng } = e.latlng;
    setSelectedLocation({ latitude: lat, longitude: lng });
    updateMarker(lat, lng);
    reverseGeocode(lat, lng);
  };

  const updateMarker = (lat: number, lng: number) => {
    const L = getLeaflet();
    if (!L) return;
    if (!mapInstanceRef.current) return;

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], {
        icon: L.icon({
          iconUrl:
            "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
          shadowUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        }),
      }).addTo(mapInstanceRef.current!);
    }
  };

  const reverseGeocode = async (latitude: number, longitude: number) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
        {
          headers: {
            "User-Agent": "GamePlan-App",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setAddress(
        data.address?.road ||
          data.address?.city ||
          data.display_name ||
          "Selected Location",
      );
    } catch (error) {
      console.warn("Reverse geocoding unavailable, using coordinates:", error);
      // Fallback to coordinate-based address when reverse geocoding fails
      setAddress(
        `Location (${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°)`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationSelect({
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        address: address || "Custom Location",
      });
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Select Location on Map</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Map Container */}
        <View style={styles.mapContainer}>
          <div
            ref={mapContainerRef}
            style={{
              width: "100%",
              height: "100%",
              position: "relative",
            }}
          />
        </View>

        {/* Selection Info */}
        {selectedLocation && (
          <View style={styles.infoPanel}>
            <Text style={styles.infoTitle}>Location Selected</Text>
            <Text style={styles.infoAddress}>
              {loading ? "🔄 Getting address..." : address}
            </Text>
            <Text style={styles.infoCoords}>
              {selectedLocation.latitude.toFixed(4)},{" "}
              {selectedLocation.longitude.toFixed(4)}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={onClose}
          >
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              styles.confirmButton,
              !selectedLocation && styles.buttonDisabled,
            ]}
            onPress={handleConfirm}
            disabled={!selectedLocation}
          >
            <Text style={[styles.buttonText, styles.confirmButtonText]}>
              Confirm Location
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    fontFamily: "Inter_700Bold",
  },
  closeButton: {
    padding: 8,
    minWidth: 40,
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 24,
    color: "#666",
  },
  mapContainer: {
    flex: 1,
  },
  infoPanel: {
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#007AFF",
    marginBottom: 6,
    fontFamily: "Inter_600SemiBold",
  },
  infoAddress: {
    fontSize: 13,
    color: "#333",
    marginBottom: 4,
    fontFamily: "Inter_400Regular",
  },
  infoCoords: {
    fontSize: 12,
    color: "#999",
    fontFamily: "Inter_400Regular",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
  },
  confirmButton: {
    backgroundColor: "#007AFF",
  },
  confirmButtonText: {
    color: "white",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontWeight: "600",
    fontSize: 14,
    color: "#333",
    fontFamily: "Inter_600SemiBold",
  },
});

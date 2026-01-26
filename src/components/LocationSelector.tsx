import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  Keyboard,
} from "react-native";

interface LocationSuggestion {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
}

interface LocationSelectorProps {
  onLocationSelect: (location: {
    latitude: number;
    longitude: number;
    address: string;
  }) => void;
  onMapOpen?: () => void;
  currentLocation?: { latitude: number; longitude: number } | null;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  onLocationSelect,
  onMapOpen,
  currentLocation,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const searchAddresses = async (query: string) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`,
      );
      const results = await response.json();

      const formatted: LocationSuggestion[] = results.map((item: any) => ({
        id: item.osm_id.toString(),
        name: item.name || item.display_name.split(",")[0],
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        address: item.display_name,
      }));

      setSuggestions(formatted);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Error searching addresses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(() => {
      searchAddresses(text);
    }, 500);
  };

  const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
    setSearchQuery(suggestion.address);
    setSuggestions([]);
    setShowSuggestions(false);
    Keyboard.dismiss();

    onLocationSelect({
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      address: suggestion.address,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Location</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Search address or place..."
          value={searchQuery}
          onChangeText={handleSearchChange}
          placeholderTextColor="#999"
        />
        {loading && <Text style={styles.loadingText}>🔄</Text>}
      </View>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => handleSelectSuggestion(item)}
              >
                <Text style={styles.suggestionName}>{item.name}</Text>
                <Text style={styles.suggestionAddress}>{item.address}</Text>
              </TouchableOpacity>
            )}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        {onMapOpen && (
          <TouchableOpacity
            style={[styles.button, styles.mapButton]}
            onPress={() => {
              setShowSuggestions(false);
              onMapOpen();
            }}
          >
            <Text style={styles.buttonText}>🗺️ Map Picker</Text>
          </TouchableOpacity>
        )}

        {currentLocation && (
          <TouchableOpacity
            style={[styles.button, styles.currentButton]}
            onPress={() => {
              onLocationSelect({
                latitude: currentLocation.latitude,
                longitude: currentLocation.longitude,
                address: "Current Location",
              });
              setSearchQuery("Current Location");
              setShowSuggestions(false);
            }}
          >
            <Text style={styles.buttonText}>📍 Current</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    fontFamily: "Inter_600SemiBold",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#f9f9f9",
    color: "#333",
    fontFamily: "Inter_400Regular",
  },
  loadingText: {
    fontSize: 16,
    marginLeft: 8,
  },
  suggestionsContainer: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    marginBottom: 8,
    maxHeight: 200,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#007AFF",
    marginBottom: 4,
    fontFamily: "Inter_600SemiBold",
  },
  suggestionAddress: {
    fontSize: 12,
    color: "#666",
    fontFamily: "Inter_400Regular",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  mapButton: {
    backgroundColor: "#007AFF",
  },
  currentButton: {
    backgroundColor: "#28A745",
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
});

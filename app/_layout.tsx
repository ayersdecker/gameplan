import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import {
  Text,
  TextInput,
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useFonts } from "expo-font";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";

import { AuthProvider } from "../src/hooks/useAuth";
import { isFirebaseConfigured } from "../src/services/firebase";
import MapTab from "./(tabs)/map";
import "../src/styles/leaflet";

const BASE_FONT = "Inter_400Regular";
let didSetDefaultFonts = false;

export default function RootLayout() {
  const [showMapPreview, setShowMapPreview] = useState(false);
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (!fontsLoaded || didSetDefaultFonts) return;
    didSetDefaultFonts = true;

    const TextAny = Text as any;
    const TextInputAny = TextInput as any;

    TextAny.defaultProps = {
      ...(TextAny.defaultProps ?? {}),
      style: [{ fontFamily: BASE_FONT }, (TextAny.defaultProps ?? {}).style],
    };

    TextInputAny.defaultProps = {
      ...(TextInputAny.defaultProps ?? {}),
      style: [
        { fontFamily: BASE_FONT },
        (TextInputAny.defaultProps ?? {}).style,
      ],
    };
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  if (!isFirebaseConfigured()) {
    if (showMapPreview && Platform.OS === "web") {
      return (
        <View style={{ flex: 1 }}>
          <TouchableOpacity
            style={styles.previewButton}
            onPress={() => setShowMapPreview(false)}
          >
            <Text style={styles.previewButtonText}>Back to Firebase setup</Text>
          </TouchableOpacity>
          <MapTab />
        </View>
      );
    }

    return (
      <View style={styles.configurationContainer}>
        <Text style={styles.configurationTitle}>
          Firebase configuration required
        </Text>
        <Text style={styles.configurationText}>
          GamePlan needs Firebase credentials for sign-in and activity data.
          The map tiles do not require a separate API key.
        </Text>
        <Text style={styles.configurationText}>
          For local development, copy .env.example to .env and replace the
          placeholders with your Firebase project settings. Then restart Expo
          with npx expo start --clear.
        </Text>
        <Text style={styles.configurationText}>
          For the published website, set the EXPO_PUBLIC_FIREBASE_* GitHub
          Actions secrets and rebuild and redeploy the site.
        </Text>
        {Platform.OS === "web" && (
          <TouchableOpacity
            style={styles.previewButton}
            onPress={() => setShowMapPreview(true)}
          >
            <Text style={styles.previewButtonText}>Preview OpenStreetMap</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerTitleStyle: { fontFamily: "Inter_700Bold" },
          headerBackTitleStyle: { fontFamily: BASE_FONT },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="activities" options={{ headerShown: false }} />
        <Stack.Screen name="friends" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  configurationContainer: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#FFFFFF",
  },
  configurationTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#704214",
    marginBottom: 16,
  },
  configurationText: {
    fontSize: 16,
    color: "#333333",
    marginBottom: 16,
  },
  previewButton: {
    backgroundColor: "#007AFF",
    padding: 14,
    alignItems: "center",
  },
  previewButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});

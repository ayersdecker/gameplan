import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { Text, TextInput } from "react-native";
import { useFonts } from "expo-font";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";

import { AuthProvider } from "../src/hooks/useAuth";

const BASE_FONT = "Inter_400Regular";
let didSetDefaultFonts = false;

export default function RootLayout() {
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
      </Stack>
    </AuthProvider>
  );
}

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  home: "home",
  activities: "list",
  map: "map",
  messages: "chatbubbles",
  profile: "person",
};

/**
 * Left sidebar navigation used instead of the bottom tab bar on desktop web,
 * where a persistent, always-visible nav is more usable than bottom tabs.
 */
export function DesktopSidebar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.sidebar, { paddingTop: insets.top + 20 }]}>
      <Text style={styles.brand}>GamePlan</Text>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;
        const isFocused = state.index === index;
        const iconName = ICONS[route.name] ?? "ellipse";

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={[styles.item, isFocused && styles.itemActive]}
          >
            <Ionicons
              name={iconName}
              size={18}
              color={isFocused ? "#007AFF" : "#4B5563"}
            />
            <Text style={[styles.itemText, isFocused && styles.itemTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 220,
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRightWidth: 1,
    borderRightColor: "#E5E7EB",
    paddingHorizontal: 12,
    ...(Platform.OS === "web" ? { position: "fixed" as any } : null),
  },
  brand: {
    fontSize: 18,
    fontWeight: "700",
    color: "#007AFF",
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 2,
  },
  itemActive: {
    backgroundColor: "#EAF3FF",
  },
  itemText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
  },
  itemTextActive: {
    color: "#007AFF",
  },
});

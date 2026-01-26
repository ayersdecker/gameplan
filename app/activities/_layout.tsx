import { Stack } from "expo-router";

export default function ActivitiesLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitleStyle: {
          fontFamily: "Inter_700Bold",
          fontWeight: "700",
          fontSize: 18,
        },
      }}
    >
      <Stack.Screen name="create" options={{ title: "Create Activity" }} />
      <Stack.Screen name="[id]" options={{ title: "Activity" }} />
    </Stack>
  );
}

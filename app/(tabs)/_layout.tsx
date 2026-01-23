import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <span style={{ fontSize: size }}>🏠</span>,
        }}
      />
      <Tabs.Screen
        name="activities"
        options={{
          title: 'Activities',
          tabBarIcon: ({ color, size }) => <span style={{ fontSize: size }}>🎯</span>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <span style={{ fontSize: size }}>👤</span>,
        }}
      />
    </Tabs>
  );
}

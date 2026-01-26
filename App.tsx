import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

export default function App() {
  return (
    <View style={styles.container}>
      <Text>Open up App.tsx to start working on your app!</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Inter_400Regular",
  },
});

// Global font style for web
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  // Load Inter from Google Fonts for web
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";
  document.head.appendChild(link);

  style.textContent = `
     * { font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif !important; }
     html, body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif !important; }
   `;
  document.head.appendChild(style);
}

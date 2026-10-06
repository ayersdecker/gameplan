import { Platform, useWindowDimensions } from "react-native";

export const DESKTOP_BREAKPOINT = 900;

/**
 * Returns layout info used to switch between the mobile-first layout and a
 * denser, desktop-friendly layout on wide web viewports.
 */
export function useResponsive() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= DESKTOP_BREAKPOINT;

  return { width, isDesktop };
}

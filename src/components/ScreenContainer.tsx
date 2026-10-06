import React from "react";
import { ScrollView, View, ViewProps, ViewStyle } from "react-native";
import { useResponsive } from "../hooks/useResponsive";

interface ScreenContainerProps extends ViewProps {
  scroll?: boolean;
  maxWidth?: number;
  contentContainerStyle?: ViewStyle;
}

/**
 * Centers and caps content width on desktop web so screens don't stretch
 * edge-to-edge, while leaving mobile layouts untouched.
 */
export function ScreenContainer({
  children,
  style,
  scroll = false,
  maxWidth = 880,
  contentContainerStyle,
  ...rest
}: ScreenContainerProps) {
  const { isDesktop } = useResponsive();

  const inner = (
    <View
      style={[isDesktop && { width: "100%", maxWidth, alignSelf: "center" }, style]}
      {...rest}
    >
      {children}
    </View>
  );

  if (!scroll) {
    return isDesktop ? (
      <View style={[{ flex: 1 }, contentContainerStyle]}>{inner}</View>
    ) : (
      inner
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={contentContainerStyle}
    >
      {inner}
    </ScrollView>
  );
}

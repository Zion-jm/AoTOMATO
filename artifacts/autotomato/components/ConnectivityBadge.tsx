import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface ConnectivityBadgeProps {
  isOnline: boolean;
}

export function ConnectivityBadge({ isOnline }: ConnectivityBadgeProps) {
  const colors = useColors();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isOnline) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.3, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isOnline, pulseAnim]);

  const dotColor = isOnline ? colors.optimal : colors.critical;

  return (
    <View style={[styles.badge, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
      <Animated.View style={[styles.dot, { backgroundColor: dotColor, opacity: pulseAnim }]} />
      <MaterialCommunityIcons
        name={isOnline ? "access-point" : "access-point-off"}
        size={14}
        color={dotColor}
      />
      <Text style={[styles.label, { color: dotColor }]}>
        {isOnline ? "LIVE" : "OFFLINE"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },
});

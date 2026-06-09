import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { SensorReading } from "@/contexts/GreenhouseContext";
import { useColors } from "@/hooks/useColors";

interface StatusBannerProps {
  sensors: SensorReading[];
  isOffline?: boolean;
}

function getBannerInfo(sensors: SensorReading[]) {
  const criticals = sensors.filter((s) => s.status === "critical");
  const warnings = sensors.filter((s) => s.status === "warning");

  if (criticals.length > 0) {
    const s = criticals[0];
    const sensorMessages: Record<string, string> = {
      temperature: `Temperature is critical at ${s.value.toFixed(1)}°C. Exhaust fan running at maximum.`,
      humidity: `Humidity at ${Math.round(s.value)}% — disease risk. Checking ventilation.`,
      light: `Light at ${Math.round(s.value).toLocaleString()} lux — outside safe range.`,
      soilMoisture: `Soil moisture at ${Math.round(s.value)}% — water pump activated.`,
      ph: `pH level at ${s.value.toFixed(2)} — nutrient lockout risk.`,
      ec: `EC at ${s.value.toFixed(2)} mS/cm — nutrient concentration critical.`,
    };
    return {
      type: "critical" as const,
      title: `Critical: ${s.label} alert`,
      message: sensorMessages[s.id] ?? `${s.label} is at a critical level.`,
      icon: "alert-circle" as const,
    };
  }

  if (warnings.length > 0) {
    const s = warnings[0];
    const sensorMessages: Record<string, string> = {
      temperature: `Temperature is ${s.value.toFixed(1)}°C — exhaust fan has been activated to cool down.`,
      humidity: `Humidity at ${Math.round(s.value)}% — slight adjustment needed.`,
      light: `Light at ${Math.round(s.value).toLocaleString()} lux — outside optimal range.`,
      soilMoisture: `Soil moisture at ${Math.round(s.value)}% — irrigation scheduled soon.`,
      ph: `pH at ${s.value.toFixed(2)} — slight correction recommended.`,
      ec: `EC at ${s.value.toFixed(2)} mS/cm — nutrient balance adjustment needed.`,
    };
    return {
      type: "warning" as const,
      title: `Warning: ${s.label} out of range`,
      message: sensorMessages[s.id] ?? `${s.label} is slightly outside optimal range.`,
      icon: "alert" as const,
    };
  }

  return {
    type: "optimal" as const,
    title: "Greenhouse is stable",
    message: "All sensors are within safe limits. Systems are running smoothly.",
    icon: "check-circle" as const,
  };
}

export function StatusBanner({ sensors, isOffline = false }: StatusBannerProps) {
  const colors = useColors();
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const info = getBannerInfo(sensors);

  const bgColor =
    isOffline
      ? colors.muted
      : info.type === "optimal"
      ? "#14532D"
      : info.type === "warning"
      ? "#713F12"
      : "#7F1D1D";

  const borderColor =
    isOffline
      ? colors.border
      : info.type === "optimal"
      ? colors.optimal
      : info.type === "warning"
      ? colors.warning
      : colors.critical;

  const iconColor =
    isOffline
      ? colors.mutedForeground
      : info.type === "optimal"
      ? colors.optimal
      : info.type === "warning"
      ? colors.warning
      : colors.critical;

  useEffect(() => {
    if (info.type === "critical") {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(shimmerAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      shimmerAnim.setValue(0);
    }
  }, [info.type, shimmerAnim]);

  const borderOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  return (
    <Animated.View
      style={[
        styles.banner,
        {
          backgroundColor: bgColor,
          borderColor,
          borderOpacity,
        },
      ]}
    >
      <View style={styles.iconWrapper}>
        <MaterialCommunityIcons
          name={isOffline ? "cloud-off-outline" : info.icon}
          size={28}
          color={iconColor}
        />
      </View>
      <View style={styles.textWrapper}>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {isOffline ? "Offline — Viewing Cached Data" : info.title}
        </Text>
        <Text style={[styles.message, { color: colors.secondaryForeground }]}>
          {isOffline
            ? "Connection lost. Last known sensor values shown below."
            : info.message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
    marginBottom: 16,
  },
  iconWrapper: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrapper: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  message: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
});

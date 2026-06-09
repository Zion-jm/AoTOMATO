import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { SensorReading } from "@/contexts/GreenhouseContext";
import { useColors } from "@/hooks/useColors";

interface SensorCardProps {
  sensor: SensorReading;
  grayed?: boolean;
}

function SensorIcon({ id }: { id: string }) {
  const colors = useColors();
  const icons: Record<string, string> = {
    temperature: "TEMP",
    humidity: "HUM",
    light: "LUX",
    soilMoisture: "SOIL",
    ph: "PH",
    ec: "EC",
  };
  return (
    <View style={[styles.iconBadge, { backgroundColor: colors.secondary }]}>
      <Text style={[styles.iconText, { color: colors.mutedForeground }]}>
        {icons[id] ?? "?"}
      </Text>
    </View>
  );
}

export function SensorCard({ sensor, grayed = false }: SensorCardProps) {
  const colors = useColors();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const statusColor =
    sensor.status === "optimal"
      ? colors.optimal
      : sensor.status === "warning"
      ? colors.warning
      : colors.critical;

  useEffect(() => {
    if (sensor.status === "critical") {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.4, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [sensor.status, pulseAnim]);

  const formatValue = () => {
    if (sensor.id === "light") return Math.round(sensor.value).toLocaleString();
    if (sensor.id === "ph") return sensor.value.toFixed(2);
    if (sensor.id === "ec") return sensor.value.toFixed(2);
    if (sensor.id === "temperature") return sensor.value.toFixed(1);
    return Math.round(sensor.value).toString();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: grayed ? colors.border : statusColor,
          opacity: grayed ? 0.6 : 1,
        },
      ]}
    >
      <View style={[styles.statusBar, { backgroundColor: grayed ? colors.border : statusColor }]} />
      <View style={styles.content}>
        <View style={styles.header}>
          <SensorIcon id={sensor.id} />
          <View style={styles.labelRow}>
            <Text
              style={[styles.label, { color: grayed ? colors.mutedForeground : colors.mutedForeground }]}
              numberOfLines={1}
            >
              {sensor.label.toUpperCase()}
            </Text>
            <Animated.View
              style={[
                styles.statusDot,
                { backgroundColor: grayed ? colors.border : statusColor, opacity: pulseAnim },
              ]}
            />
          </View>
        </View>

        <View style={styles.valueRow}>
          <Text
            style={[
              styles.value,
              { color: grayed ? colors.mutedForeground : colors.foreground },
            ]}
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            {formatValue()}
          </Text>
          {sensor.unit ? (
            <Text style={[styles.unit, { color: grayed ? colors.mutedForeground : colors.mutedForeground }]}>
              {sensor.unit}
            </Text>
          ) : null}
        </View>

        <Text
          style={[styles.descriptor, { color: grayed ? colors.mutedForeground : colors.secondaryForeground }]}
          numberOfLines={2}
        >
          {grayed ? "— Cached data" : sensor.descriptor.split("— ")[1] ?? sensor.descriptor}
        </Text>

        <Text style={[styles.timestamp, { color: colors.mutedForeground }]}>
          Updated {formatTime(sensor.timestamp)}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 2,
    overflow: "hidden",
    marginBottom: 12,
  },
  statusBar: {
    height: 4,
    width: "100%",
  },
  content: {
    padding: 14,
    gap: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  labelRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    flex: 1,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
    marginTop: 4,
  },
  value: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    lineHeight: 40,
  },
  unit: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    paddingBottom: 4,
  },
  descriptor: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
  timestamp: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
});

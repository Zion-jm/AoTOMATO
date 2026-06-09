import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ConfirmModal } from "@/components/ConfirmModal";
import { DeviceMode, DeviceState } from "@/contexts/GreenhouseContext";
import { useColors } from "@/hooks/useColors";

interface ActuatorControlProps {
  device: DeviceState;
  onModeChange: (id: string, mode: DeviceMode) => void;
}

const MODES: DeviceMode[] = ["AUTO", "FORCE_ON", "FORCE_OFF"];
const MODE_LABELS: Record<DeviceMode, string> = {
  AUTO: "AUTO",
  FORCE_ON: "ON",
  FORCE_OFF: "OFF",
};

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

const ICON_MAP: Record<string, IconName> = {
  fan: "fan",
  "fan-auto": "fan",
  "water-pump": "water-pump",
  "lightbulb-on": "lightbulb-on-outline",
};

export function ActuatorControl({ device, onModeChange }: ActuatorControlProps) {
  const colors = useColors();
  const [pendingMode, setPendingMode] = useState<DeviceMode | null>(null);

  const handleModePress = (mode: DeviceMode) => {
    if (mode === device.mode) return;
    if (mode === "AUTO") {
      Haptics.selectionAsync();
      onModeChange(device.id, mode);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPendingMode(mode);
    }
  };

  const handleConfirm = () => {
    if (pendingMode) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      onModeChange(device.id, pendingMode);
      setPendingMode(null);
    }
  };

  const getRunningIndicatorColor = () => {
    if (!device.isRunning) return colors.border;
    if (device.mode === "FORCE_ON") return colors.forceOn;
    if (device.mode === "FORCE_OFF") return colors.forceOff;
    return colors.autoColor;
  };

  const getRunningLabel = () => {
    if (device.mode === "FORCE_ON") return "FORCED ON";
    if (device.mode === "FORCE_OFF") return "FORCED OFF";
    return device.isRunning ? "RUNNING" : "STANDBY";
  };

  return (
    <>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.header}>
          <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
            <MaterialCommunityIcons
              name={ICON_MAP[device.iconName] ?? "power"}
              size={22}
              color={device.isRunning ? colors.primary : colors.mutedForeground}
            />
          </View>
          <View style={styles.nameCol}>
            <Text style={[styles.deviceName, { color: colors.foreground }]}>
              {device.name}
            </Text>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.runningDot,
                  { backgroundColor: getRunningIndicatorColor() },
                ]}
              />
              <Text style={[styles.runningLabel, { color: colors.mutedForeground }]}>
                {getRunningLabel()}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.segmentedControl, { backgroundColor: colors.secondary }]}>
          {MODES.map((mode) => {
            const isActive = device.mode === mode;
            const activeColor =
              mode === "FORCE_ON"
                ? colors.forceOn
                : mode === "FORCE_OFF"
                ? colors.forceOff
                : colors.autoColor;

            return (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.segment,
                  isActive && { backgroundColor: activeColor },
                ]}
                onPress={() => handleModePress(mode)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <Text
                  style={[
                    styles.segmentLabel,
                    {
                      color: isActive ? colors.background : colors.mutedForeground,
                      fontFamily: isActive ? "Inter_700Bold" : "Inter_500Medium",
                    },
                  ]}
                >
                  {MODE_LABELS[mode]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ConfirmModal
        visible={pendingMode !== null}
        deviceName={device.name}
        targetMode={pendingMode ?? "FORCE_ON"}
        onConfirm={handleConfirm}
        onCancel={() => setPendingMode(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  nameCol: {
    flex: 1,
    gap: 4,
  },
  deviceName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  runningDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  runningLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
  },
  segmentedControl: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 3,
  },
  segment: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentLabel: {
    fontSize: 13,
    letterSpacing: 0.5,
  },
});

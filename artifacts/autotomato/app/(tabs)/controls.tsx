import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActuatorControl } from "@/components/ActuatorControl";
import { DeviceMode, useGreenhouse } from "@/contexts/GreenhouseContext";
import { useColors } from "@/hooks/useColors";

export default function ControlsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { devices, automationRules, setDeviceMode } = useGreenhouse();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleModeChange = (id: string, mode: DeviceMode) => {
    setDeviceMode(id, mode);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 16, paddingBottom: bottomPad + 90 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>Device Controls</Text>
          <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
            <MaterialCommunityIcons
              name="shield-check-outline"
              size={14}
              color={colors.mutedForeground}
            />
            <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>
              {devices.filter((d) => d.isRunning).length} ACTIVE
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>ACTUATORS</Text>
        <View style={styles.deviceList}>
          {devices.map((device) => (
            <ActuatorControl
              key={device.id}
              device={device}
              onModeChange={handleModeChange}
            />
          ))}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          AUTOMATION RULES
        </Text>
        <View style={[styles.rulesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.rulesHeader}>
            <MaterialCommunityIcons
              name="robot-outline"
              size={18}
              color={colors.mutedForeground}
            />
            <Text style={[styles.rulesHeaderText, { color: colors.mutedForeground }]}>
              Read-only — managed by firmware
            </Text>
          </View>
          {automationRules.map((rule, index) => (
            <View key={rule.id}>
              {index > 0 && (
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              )}
              <View style={styles.ruleRow}>
                <View
                  style={[
                    styles.ruleDot,
                    {
                      backgroundColor: rule.isActive ? colors.optimal : colors.border,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.ruleText,
                    {
                      color: rule.isActive ? colors.foreground : colors.mutedForeground,
                    },
                  ]}
                >
                  {rule.description}
                </Text>
                <View
                  style={[
                    styles.ruleStatus,
                    {
                      backgroundColor: rule.isActive ? "#14532D" : colors.secondary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.ruleStatusText,
                      { color: rule.isActive ? colors.optimal : colors.mutedForeground },
                    ]}
                  >
                    {rule.isActive ? "ON" : "OFF"}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    gap: 0,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
    marginBottom: 12,
    marginTop: 8,
  },
  deviceList: {
    gap: 10,
    marginBottom: 12,
  },
  rulesCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  rulesHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    borderBottomWidth: 1,
  },
  rulesHeaderText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  divider: {
    height: 1,
    marginHorizontal: 14,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  ruleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  ruleText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 18,
  },
  ruleStatus: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 0,
  },
  ruleStatusText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
});

import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertItem, useGreenhouse } from "@/contexts/GreenhouseContext";
import { useColors } from "@/hooks/useColors";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

const SEVERITY_CONFIG: Record<
  AlertItem["severity"],
  { icon: IconName; bgColor: (colors: ReturnType<typeof useColors>) => string; labelColor: (colors: ReturnType<typeof useColors>) => string; label: string }
> = {
  critical: {
    icon: "alert-circle",
    bgColor: (c) => "#7F1D1D",
    labelColor: (c) => c.critical,
    label: "CRITICAL",
  },
  warning: {
    icon: "alert",
    bgColor: (c) => "#713F12",
    labelColor: (c) => c.warning,
    label: "WARNING",
  },
  info: {
    icon: "information",
    bgColor: (c) => c.secondary,
    labelColor: (c) => c.autoColor,
    label: "INFO",
  },
};

const SENSOR_ICONS: Record<string, IconName> = {
  temperature: "thermometer",
  humidity: "water-percent",
  light: "white-balance-sunny",
  soilMoisture: "water",
  ph: "test-tube",
  ec: "flash",
  lights: "lightbulb-on-outline",
  exhaust: "fan",
  pump: "water-pump",
  ventilation: "fan",
};

function AlertRow({ alert }: { alert: AlertItem }) {
  const colors = useColors();
  const cfg = SEVERITY_CONFIG[alert.severity];

  const formatRelative = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <View
      style={[
        styles.alertRow,
        {
          backgroundColor: cfg.bgColor(colors),
          borderColor: cfg.labelColor(colors),
        },
      ]}
    >
      <View style={[styles.alertIconWrap, { backgroundColor: "rgba(0,0,0,0.3)" }]}>
        <MaterialCommunityIcons
          name={alert.sensor ? (SENSOR_ICONS[alert.sensor] ?? cfg.icon) : cfg.icon}
          size={20}
          color={cfg.labelColor(colors)}
        />
      </View>

      <View style={styles.alertBody}>
        <Text style={[styles.alertMessage, { color: colors.foreground }]} numberOfLines={3}>
          {alert.message}
        </Text>
        <View style={styles.alertMeta}>
          <View
            style={[
              styles.severityBadge,
              { backgroundColor: "rgba(0,0,0,0.25)" },
            ]}
          >
            <Text style={[styles.severityText, { color: cfg.labelColor(colors) }]}>
              {cfg.label}
            </Text>
          </View>
          <Text style={[styles.alertTime, { color: colors.mutedForeground }]}>
            {formatRelative(new Date(alert.timestamp))}
          </Text>
          <Text style={[styles.alertAbsTime, { color: colors.mutedForeground }]}>
            · {new Date(alert.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function AlertsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { alerts, clearAlerts } = useGreenhouse();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={alerts}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: topPad + 16, paddingBottom: bottomPad + 90 },
        ]}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={[styles.screenTitle, { color: colors.foreground }]}>Alerts & Logs</Text>
              {alerts.length > 0 && (
                <TouchableOpacity
                  style={[styles.clearBtn, { borderColor: colors.border }]}
                  onPress={clearAlerts}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name="delete-sweep-outline"
                    size={16}
                    color={colors.mutedForeground}
                  />
                </TouchableOpacity>
              )}
            </View>

            {alerts.length > 0 && (
              <View style={styles.summaryRow}>
                {criticalCount > 0 && (
                  <View style={[styles.summaryChip, { backgroundColor: "#7F1D1D" }]}>
                    <MaterialCommunityIcons name="alert-circle" size={12} color={colors.critical} />
                    <Text style={[styles.summaryChipText, { color: colors.critical }]}>
                      {criticalCount} Critical
                    </Text>
                  </View>
                )}
                {warningCount > 0 && (
                  <View style={[styles.summaryChip, { backgroundColor: "#713F12" }]}>
                    <MaterialCommunityIcons name="alert" size={12} color={colors.warning} />
                    <Text style={[styles.summaryChipText, { color: colors.warning }]}>
                      {warningCount} Warning
                    </Text>
                  </View>
                )}
                <View style={[styles.summaryChip, { backgroundColor: colors.secondary }]}>
                  <MaterialCommunityIcons name="format-list-bulleted" size={12} color={colors.mutedForeground} />
                  <Text style={[styles.summaryChipText, { color: colors.mutedForeground }]}>
                    {alerts.length} Total
                  </Text>
                </View>
              </View>
            )}

            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              RECENT EVENTS
            </Text>
          </View>
        }
        renderItem={({ item }) => <AlertRow alert={item} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <MaterialCommunityIcons
              name="bell-off-outline"
              size={48}
              color={colors.mutedForeground}
            />
            <Text style={[styles.emptyTitle, { color: colors.mutedForeground }]}>
              No alerts recorded
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.mutedForeground }]}>
              Threshold breaches and system events appear here
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: 16 },
  header: { marginBottom: 8 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  screenTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  clearBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  summaryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  summaryChipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  alertRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
  },
  alertIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  alertBody: {
    flex: 1,
    gap: 8,
  },
  alertMessage: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  alertMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  severityBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  severityText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.6,
  },
  alertTime: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  alertAbsTime: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  empty: {
    alignItems: "center",
    paddingTop: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 40,
    lineHeight: 19,
  },
});

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
import { ConnectivityBadge } from "@/components/ConnectivityBadge";
import { SensorCard } from "@/components/SensorCard";
import { StatusBanner } from "@/components/StatusBanner";
import { useGreenhouse } from "@/contexts/GreenhouseContext";
import { useColors } from "@/hooks/useColors";

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { sensors, isOnline, isUsingCached } = useGreenhouse();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const leftCol = sensors.filter((_, i) => i % 2 === 0);
  const rightCol = sensors.filter((_, i) => i % 2 !== 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isUsingCached && (
        <View style={[styles.offlineBanner, { backgroundColor: colors.secondary }]}>
          <MaterialCommunityIcons name="cloud-off-outline" size={14} color={colors.warning} />
          <Text style={[styles.offlineBannerText, { color: colors.warning }]}>
            Viewing Cached Data — Offline Mode
          </Text>
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: topPad + 16,
            paddingBottom: bottomPad + 90,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.appTitle, { color: colors.foreground }]}>auTOMATO</Text>
            <Text style={[styles.appSubtitle, { color: colors.mutedForeground }]}>
              Greenhouse Monitor
            </Text>
          </View>
          <ConnectivityBadge isOnline={isOnline} />
        </View>

        <StatusBanner sensors={sensors} isOffline={isUsingCached} />

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          ENVIRONMENTAL SENSORS
        </Text>

        <View style={styles.grid}>
          <View style={styles.col}>
            {leftCol.map((sensor) => (
              <SensorCard key={sensor.id} sensor={sensor} grayed={isUsingCached} />
            ))}
          </View>
          <View style={styles.col}>
            {rightCol.map((sensor) => (
              <SensorCard key={sensor.id} sensor={sensor} grayed={isUsingCached} />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  offlineBannerText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  appTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
    marginBottom: 12,
    marginTop: 4,
  },
  grid: {
    flexDirection: "row",
    gap: 10,
  },
  col: {
    flex: 1,
    gap: 0,
  },
});

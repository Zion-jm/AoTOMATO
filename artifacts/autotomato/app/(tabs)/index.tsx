import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
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
import { AlertItem, DeviceState, useGreenhouse } from "@/contexts/GreenhouseContext";
import { useColors } from "@/hooks/useColors";

const DEVICE_ICONS: Record<string, string> = {
  exhaust: "fan",
  ventilation: "fan-auto",
  pump: "water-pump",
  lights: "lightbulb-on-outline",
};

function DevicePill({ device }: { device: DeviceState }) {
  const colors = useColors();
  const isRunning = device.isRunning;
  const dotColor = isRunning ? colors.optimal : colors.mutedForeground;

  return (
    <View style={[styles.pill, { backgroundColor: colors.card, borderColor: isRunning ? colors.optimal : colors.border }]}>
      <MaterialCommunityIcons
        name={DEVICE_ICONS[device.id] as any ?? "cog"}
        size={16}
        color={isRunning ? colors.optimal : colors.mutedForeground}
      />
      <View style={styles.pillTextCol}>
        <Text style={[styles.pillName, { color: colors.foreground }]} numberOfLines={1}>
          {device.name}
        </Text>
        <View style={styles.pillStatusRow}>
          <View style={[styles.pillDot, { backgroundColor: dotColor }]} />
          <Text style={[styles.pillStatus, { color: dotColor }]}>
            {device.mode !== "AUTO" ? device.mode.replace("_", " ") : isRunning ? "Running" : "Standby"}
          </Text>
        </View>
      </View>
    </View>
  );
}

function LatestAlertCard({ alert }: { alert: AlertItem }) {
  const colors = useColors();
  const isCritical = alert.severity === "critical";
  const isWarning = alert.severity === "warning";
  const accentColor = isCritical ? colors.critical : isWarning ? colors.warning : colors.optimal;

  const ALERT_ICONS: Record<string, string> = {
    temperature: "thermometer-alert",
    humidity: "water-alert",
    light: "lightbulb-alert",
    soilMoisture: "sprout",
    ph: "flask",
    ec: "lightning-bolt",
    lights: "lightbulb-on",
  };

  const iconName = alert.sensor ? (ALERT_ICONS[alert.sensor] ?? "bell-alert") : "bell-alert";

  const formatRelative = (date: Date) => {
    const diffMs = Date.now() - date.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <View style={[styles.alertCard, { backgroundColor: colors.card, borderColor: accentColor }]}>
      <View style={[styles.alertAccent, { backgroundColor: accentColor }]} />
      <View style={styles.alertInner}>
        <View style={[styles.alertIconWrap, { backgroundColor: accentColor + "22" }]}>
          <MaterialCommunityIcons name={iconName as any} size={18} color={accentColor} />
        </View>
        <View style={styles.alertBody}>
          <View style={styles.alertTopRow}>
            <Text style={[styles.alertSeverity, { color: accentColor }]}>
              {alert.severity.toUpperCase()}
            </Text>
            <Text style={[styles.alertTime, { color: colors.mutedForeground }]}>
              {formatRelative(alert.timestamp)}
            </Text>
          </View>
          <Text style={[styles.alertMsg, { color: colors.secondaryForeground }]} numberOfLines={2}>
            {alert.message}
          </Text>
        </View>
      </View>
    </View>
  );
}

function GrowLightCountdown() {
  const colors = useColors();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hour = now.getHours();
  const minute = now.getMinutes();
  const second = now.getSeconds();
  const isOn = hour >= 6 && hour < 22;

  let targetHour = isOn ? 22 : 6;
  let totalSecsUntil = (targetHour - hour - 1) * 3600 + (59 - minute) * 60 + (60 - second);
  if (totalSecsUntil < 0) totalSecsUntil += 24 * 3600;

  const hh = Math.floor(totalSecsUntil / 3600);
  const mm = Math.floor((totalSecsUntil % 3600) / 60);
  const ss = totalSecsUntil % 60;
  const countdown = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;

  const lightFraction = (() => {
    const totalOn = 16 * 3600;
    const elapsedSinceSix = isOn
      ? (hour - 6) * 3600 + minute * 60 + second
      : 0;
    return Math.min(elapsedSinceSix / totalOn, 1);
  })();

  return (
    <View style={[styles.lightCard, { backgroundColor: colors.card, borderColor: isOn ? "#f5c542" : colors.border }]}>
      <View style={[styles.lightAccent, { backgroundColor: isOn ? "#f5c542" : colors.border }]} />
      <View style={styles.lightInner}>
        <MaterialCommunityIcons
          name={isOn ? "weather-sunny" : "weather-night"}
          size={22}
          color={isOn ? "#f5c542" : colors.mutedForeground}
        />
        <View style={styles.lightBody}>
          <View style={styles.lightTopRow}>
            <Text style={[styles.lightLabel, { color: colors.foreground }]}>
              Grow Lights — {isOn ? "ON" : "OFF"}
            </Text>
            <Text style={[styles.lightCountdown, { color: isOn ? "#f5c542" : colors.mutedForeground }]}>
              {isOn ? "OFF in" : "ON in"} {countdown}
            </Text>
          </View>
          <View style={[styles.lightBar, { backgroundColor: colors.secondary }]}>
            <View style={[styles.lightBarFill, { width: `${lightFraction * 100}%`, backgroundColor: "#f5c542" }]} />
          </View>
          <Text style={[styles.lightSched, { color: colors.mutedForeground }]}>
            Daily cycle: 06:00 – 22:00 &nbsp;·&nbsp; {Math.round(lightFraction * 100)}% of day elapsed
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { sensors, devices, alerts, isOnline, isUsingCached } = useGreenhouse();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const leftCol = sensors.filter((_, i) => i % 2 === 0);
  const rightCol = sensors.filter((_, i) => i % 2 !== 0);

  const latestAlert = alerts.find((a) => a.severity === "critical" || a.severity === "warning") ?? null;

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

        {latestAlert && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
              LATEST ALERT
            </Text>
            <LatestAlertCard alert={latestAlert} />
          </>
        )}

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          ACTIVE DEVICES
        </Text>
        <View style={styles.deviceGrid}>
          {devices.map((d) => (
            <DevicePill key={d.id} device={d} />
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          GROW LIGHTS SCHEDULE
        </Text>
        <GrowLightCountdown />

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
    marginBottom: 10,
    marginTop: 20,
  },
  grid: {
    flexDirection: "row",
    gap: 10,
  },
  col: {
    flex: 1,
    gap: 0,
  },
  deviceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 10,
    paddingHorizontal: 12,
    width: "47%",
  },
  pillTextCol: {
    flex: 1,
    gap: 2,
  },
  pillName: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  pillStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pillStatus: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  alertCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    overflow: "hidden",
    marginBottom: 4,
  },
  alertAccent: {
    height: 3,
    width: "100%",
  },
  alertInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
  },
  alertIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  alertBody: {
    flex: 1,
    gap: 3,
  },
  alertTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  alertSeverity: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  alertTime: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  alertMsg: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
  lightCard: {
    borderRadius: 12,
    borderWidth: 1.5,
    overflow: "hidden",
    marginBottom: 4,
  },
  lightAccent: {
    height: 3,
    width: "100%",
  },
  lightInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 14,
  },
  lightBody: {
    flex: 1,
    gap: 6,
  },
  lightTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lightLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  lightCountdown: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    fontVariant: ["tabular-nums"],
  },
  lightBar: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  lightBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  lightSched: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});

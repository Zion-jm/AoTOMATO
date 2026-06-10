import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Svg, Polyline } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGreenhouse } from "@/contexts/GreenhouseContext";
import { useColors } from "@/hooks/useColors";
import { ConnectivityBadge } from "@/components/ConnectivityBadge";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

const SENSOR_META: Record<string, { icon: IconName; color: string; optMin: number; optMax: number }> = {
  temperature:  { icon: "thermometer",          color: "#FB923C", optMin: 18,   optMax: 26    },
  humidity:     { icon: "water-percent",         color: "#60A5FA", optMin: 60,   optMax: 80    },
  light:        { icon: "white-balance-sunny",   color: "#FACC15", optMin: 3000, optMax: 10000 },
  soilMoisture: { icon: "water",                 color: "#34D399", optMin: 60,   optMax: 80    },
  ph:           { icon: "test-tube",             color: "#A78BFA", optMin: 6.0,  optMax: 7.0   },
  ec:           { icon: "lightning-bolt",        color: "#F472B6", optMin: 1.5,  optMax: 3.0   },
};

const DEVICE_ICONS: Record<string, IconName> = {
  exhaust:     "fan",
  ventilation: "fan-auto",
  pump:        "water-pump",
  lights:      "lightbulb-on-outline",
};

function Sparkline({ values, color, width = 80, height = 32 }: {
  values: number[]; color: string; width?: number; height?: number;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pad = 2;
  const points = values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (width - pad * 2);
      const y = pad + (1 - (v - min) / range) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <Svg width={width} height={height}>
      <Polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function KpiCard({ label, value, sub, icon, iconColor }: {
  label: string; value: string | number; sub?: string; icon: IconName; iconColor: string;
}) {
  const colors = useColors();
  return (
    <View style={[kpi.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[kpi.iconWrap, { backgroundColor: iconColor + "22" }]}>
        <MaterialCommunityIcons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={[kpi.value, { color: colors.foreground }]}>{value}</Text>
      <Text style={[kpi.label, { color: colors.mutedForeground }]}>{label}</Text>
      {sub ? <Text style={[kpi.sub, { color: colors.mutedForeground }]}>{sub}</Text> : null}
    </View>
  );
}

function SensorCard({ sensorId, history, onPress }: { sensorId: string; history: number[]; onPress: () => void }) {
  const colors = useColors();
  const { sensors } = useGreenhouse();
  const sensor = sensors.find((s) => s.id === sensorId);
  const meta = SENSOR_META[sensorId];

  const stats = useMemo(() => {
    if (!history || history.length === 0) return { min: 0, max: 0, avg: 0, pctOptimal: 0, pctWarning: 0, pctCritical: 0 };
    const min = Math.min(...history);
    const max = Math.max(...history);
    const avg = history.reduce((a, b) => a + b, 0) / history.length;
    const total = history.length;
    const optimal = history.filter((v) => v >= meta.optMin && v <= meta.optMax).length;
    const pctOptimal = (optimal / total) * 100;
    const critical = history.filter((v) => v < meta.optMin * 0.7 || v > meta.optMax * 1.3).length;
    const pctCritical = (critical / total) * 100;
    const pctWarning = Math.max(0, 100 - pctOptimal - pctCritical);
    return { min, max, avg, pctOptimal, pctWarning, pctCritical };
  }, [history, meta]);

  if (!sensor) return null;

  const statusColor =
    sensor.status === "optimal" ? colors.optimal :
    sensor.status === "warning"  ? colors.warning  : colors.critical;

  const fmt = (v: number) => {
    if (sensorId === "temperature") return v.toFixed(1) + "°C";
    if (sensorId === "ph")          return v.toFixed(2);
    if (sensorId === "ec")          return v.toFixed(2);
    if (sensorId === "light")       return Math.round(v) + " lux";
    return Math.round(v) + "%";
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
    >
    <View style={[sc.wrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={sc.topRow}>
        <View style={sc.titleGroup}>
          <View style={[sc.iconWrap, { backgroundColor: meta.color + "22" }]}>
            <MaterialCommunityIcons name={meta.icon} size={16} color={meta.color} />
          </View>
          <View>
            <Text style={[sc.title, { color: colors.foreground }]}>{sensor.label}</Text>
            <View style={[sc.badge, { backgroundColor: statusColor + "22" }]}>
              <View style={[sc.dot, { backgroundColor: statusColor }]} />
              <Text style={[sc.badgeText, { color: statusColor }]}>
                {sensor.status.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
        <View style={sc.rightGroup}>
          <Text style={[sc.currentVal, { color: colors.foreground }]}>{fmt(sensor.value)}</Text>
          <Sparkline values={history} color={meta.color} width={72} height={28} />
        </View>
      </View>

      <View style={sc.statsRow}>
        {[
          { label: "MIN", val: fmt(stats.min), color: colors.secondaryForeground },
          { label: "AVG", val: fmt(stats.avg), color: colors.foreground },
          { label: "MAX", val: fmt(stats.max), color: colors.secondaryForeground },
          { label: "OPTIMAL", val: `${stats.pctOptimal.toFixed(0)}%`, color: colors.optimal },
        ].map(({ label, val, color }) => (
          <View key={label} style={sc.statItem}>
            <Text style={[sc.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
            <Text style={[sc.statValue, { color }]}>{val}</Text>
          </View>
        ))}
      </View>

      <View style={[sc.statusBar, { backgroundColor: colors.secondary }]}>
        {stats.pctOptimal > 0 && (
          <View style={[sc.seg, { width: `${stats.pctOptimal}%` as any, backgroundColor: colors.optimal }]} />
        )}
        {stats.pctWarning > 0 && (
          <View style={[sc.seg, { width: `${stats.pctWarning}%` as any, backgroundColor: colors.warning }]} />
        )}
        {stats.pctCritical > 0 && (
          <View style={[sc.seg, { width: `${stats.pctCritical}%` as any, backgroundColor: colors.critical }]} />
        )}
      </View>
      <View style={sc.legend}>
        {[
          { c: colors.optimal, t: `Optimal ${stats.pctOptimal.toFixed(0)}%` },
          { c: colors.warning, t: `Warning ${stats.pctWarning.toFixed(0)}%` },
          { c: colors.critical, t: `Critical ${stats.pctCritical.toFixed(0)}%` },
        ].map(({ c, t }) => (
          <View key={t} style={sc.legendItem}>
            <View style={[sc.legendDot, { backgroundColor: c }]} />
            <Text style={[sc.legendText, { color: colors.mutedForeground }]}>{t}</Text>
          </View>
        ))}
      </View>
    </View>
    </TouchableOpacity>
  );
}

function DeviceCard({ device }: { device: ReturnType<typeof useGreenhouse>["devices"][0] }) {
  const colors = useColors();
  const isRunning = device.isRunning;
  const dotColor = isRunning ? colors.optimal : colors.mutedForeground;
  return (
    <View style={[dc.wrap, { backgroundColor: colors.card, borderColor: isRunning ? colors.optimal + "66" : colors.border }]}>
      <View style={[dc.iconWrap, { backgroundColor: (isRunning ? colors.optimal : colors.mutedForeground) + "22" }]}>
        <MaterialCommunityIcons name={(DEVICE_ICONS[device.id] ?? "cog") as any} size={20} color={isRunning ? colors.optimal : colors.mutedForeground} />
      </View>
      <Text style={[dc.name, { color: colors.foreground }]} numberOfLines={1}>{device.name}</Text>
      <View style={dc.statusRow}>
        <View style={[dc.dot, { backgroundColor: dotColor }]} />
        <Text style={[dc.statusText, { color: dotColor }]}>
          {device.mode !== "AUTO" ? device.mode.replace("_", " ") : isRunning ? "Running" : "Standby"}
        </Text>
      </View>
      <View style={[dc.modeBadge, { backgroundColor: colors.secondary }]}>
        <Text style={[dc.modeText, { color: colors.autoColor }]}>{device.mode}</Text>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sensors, sensorHistory, devices, alerts, isOnline, isUsingCached } = useGreenhouse();

  const handleSensorPress = useCallback(
    (id: string) => router.push(`/sensor/${id}` as any),
    [router]
  );

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;
  const infoCount = alerts.filter((a) => a.severity === "info").length;
  const runningDevices = devices.filter((d) => d.isRunning).length;
  const optimalSensors = sensors.filter((s) => s.status === "optimal").length;
  const healthScore = Math.round((optimalSensors / sensors.length) * 100);

  const alertBySensor = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of alerts) {
      if (a.sensor) counts[a.sensor] = (counts[a.sensor] ?? 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [alerts]);

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {isUsingCached && (
        <View style={[s.offlineBanner, { backgroundColor: colors.secondary }]}>
          <MaterialCommunityIcons name="cloud-off-outline" size={14} color={colors.warning} />
          <Text style={[s.offlineBannerText, { color: colors.warning }]}>
            Viewing Cached Data — Offline Mode
          </Text>
        </View>
      )}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.content, { paddingTop: topPad + 16, paddingBottom: bottomPad + 90 }]}
      >
        <View style={s.headerRow}>
          <View>
            <Text style={[s.title, { color: colors.foreground }]}>auTOMATO</Text>
            <Text style={[s.subtitle, { color: colors.mutedForeground }]}>Greenhouse Monitor</Text>
          </View>
          <ConnectivityBadge isOnline={isOnline} />
        </View>

        <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>OVERVIEW</Text>
        <View style={s.kpiRow}>
          <KpiCard
            label="Health Score"
            value={`${healthScore}%`}
            sub={`${optimalSensors}/${sensors.length} optimal`}
            icon="leaf"
            iconColor={colors.optimal}
          />
          <KpiCard
            label="Active Alerts"
            value={alerts.length}
            sub={criticalCount > 0 ? `${criticalCount} critical` : "none critical"}
            icon="bell-alert"
            iconColor={criticalCount > 0 ? colors.critical : colors.warning}
          />
          <KpiCard
            label="Devices On"
            value={`${runningDevices}/${devices.length}`}
            sub="running now"
            icon="power"
            iconColor={colors.autoColor}
          />
        </View>

        <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>
          SENSOR TRENDS
        </Text>
        <Text style={[s.sectionHint, { color: colors.mutedForeground }]}>
          Last {sensorHistory.temperature?.length ?? 0} readings · updates every 2s
        </Text>
        {Object.keys(SENSOR_META).map((id) => (
          <SensorCard key={id} sensorId={id} history={sensorHistory[id] ?? []} onPress={() => handleSensorPress(id)} />
        ))}

        <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>DEVICE STATUS</Text>
        <View style={s.deviceGrid}>
          {devices.map((d) => <DeviceCard key={d.id} device={d} />)}
        </View>

        <Text style={[s.sectionLabel, { color: colors.mutedForeground }]}>ALERT SUMMARY</Text>
        <View style={[s.alertCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={s.severityRow}>
            {[
              { label: "Critical", count: criticalCount, color: colors.critical },
              { label: "Warning",  count: warningCount,  color: colors.warning  },
              { label: "Info",     count: infoCount,     color: colors.autoColor },
            ].map(({ label, count, color }) => (
              <View key={label} style={s.severityBlock}>
                <Text style={[s.severityCount, { color }]}>{count}</Text>
                <Text style={[s.severityLabel, { color: colors.mutedForeground }]}>{label}</Text>
              </View>
            ))}
          </View>

          {alertBySensor.length > 0 && (
            <>
              <View style={[s.divider, { backgroundColor: colors.border }]} />
              <Text style={[s.chartTitle, { color: colors.mutedForeground }]}>ALERTS BY SENSOR</Text>
              <View style={s.alertBars}>
                {alertBySensor.map(([sensorId, count]) => {
                  const maxCount = alertBySensor[0][1];
                  const meta = SENSOR_META[sensorId];
                  const name = sensorId === "soilMoisture" ? "Moisture"
                    : sensorId.charAt(0).toUpperCase() + sensorId.slice(1);
                  return (
                    <View key={sensorId} style={s.alertBarRow}>
                      <MaterialCommunityIcons
                        name={(meta?.icon ?? "alert") as any}
                        size={13}
                        color={meta?.color ?? colors.mutedForeground}
                        style={{ width: 16 }}
                      />
                      <Text style={[s.alertBarLabel, { color: colors.secondaryForeground }]}>{name}</Text>
                      <View style={[s.alertBarTrack, { backgroundColor: colors.secondary }]}>
                        <View style={[s.alertBarFill, { width: `${(count / maxCount) * 100}%` as any, backgroundColor: meta?.color ?? colors.primary }]} />
                      </View>
                      <Text style={[s.alertBarCount, { color: colors.mutedForeground }]}>{count}</Text>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  offlineBanner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 16 },
  offlineBannerText: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.3 },
  content: { paddingHorizontal: 16 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1.2, marginBottom: 10, marginTop: 20 },
  sectionHint: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: -8, marginBottom: 10 },
  kpiRow: { flexDirection: "row", gap: 8 },
  deviceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  alertCard: { borderRadius: 14, borderWidth: 1.5, padding: 16 },
  severityRow: { flexDirection: "row", justifyContent: "space-around", marginBottom: 4 },
  severityBlock: { alignItems: "center", gap: 4 },
  severityCount: { fontSize: 28, fontFamily: "Inter_700Bold" },
  severityLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  divider: { height: 1, marginVertical: 14 },
  chartTitle: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginBottom: 10 },
  alertBars: { gap: 8 },
  alertBarRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  alertBarLabel: { fontSize: 12, fontFamily: "Inter_500Medium", width: 60 },
  alertBarTrack: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  alertBarFill: { height: "100%", borderRadius: 3 },
  alertBarCount: { fontSize: 12, fontFamily: "Inter_600SemiBold", width: 20, textAlign: "right" },
});

const kpi = StyleSheet.create({
  card: { flex: 1, borderRadius: 12, borderWidth: 1.5, padding: 12, alignItems: "center", gap: 4 },
  iconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  value: { fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  label: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, textAlign: "center" },
  sub: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
});

const sc = StyleSheet.create({
  wrap: { borderRadius: 14, borderWidth: 1.5, padding: 14, marginBottom: 10 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  titleGroup: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  iconWrap: { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 4 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, alignSelf: "flex-start" },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  badgeText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.6 },
  rightGroup: { alignItems: "flex-end", gap: 6 },
  currentVal: { fontSize: 18, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  statItem: { alignItems: "center", gap: 2 },
  statLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },
  statValue: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  statusBar: { height: 5, borderRadius: 3, overflow: "hidden", flexDirection: "row", marginBottom: 6 },
  seg: { height: "100%" },
  legend: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendText: { fontSize: 10, fontFamily: "Inter_400Regular" },
});

const dc = StyleSheet.create({
  wrap: { width: "47%", borderRadius: 12, borderWidth: 1.5, padding: 12, gap: 6 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  name: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  modeBadge: { alignSelf: "flex-start", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, marginTop: 2 },
  modeText: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.4 },
});

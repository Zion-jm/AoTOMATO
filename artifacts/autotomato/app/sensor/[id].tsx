import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, {
  Defs,
  LinearGradient,
  Line,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGreenhouse } from "@/contexts/GreenhouseContext";
import { useColors } from "@/hooks/useColors";

interface ThresholdDef {
  optimal: [number, number];
  warning: [number, number];
  domainMin: number;
  domainMax: number;
  label: string;
  icon: string;
  description: string;
  tip: string;
}

const SENSOR_META: Record<string, ThresholdDef> = {
  temperature: {
    optimal: [18, 26],
    warning: [10, 32],
    domainMin: 5,
    domainMax: 45,
    label: "Temperature",
    icon: "thermometer",
    description: "Ambient air temperature inside the greenhouse canopy.",
    tip: "Tomatoes grow best between 18–26°C. Above 32°C, pollen viability drops sharply.",
  },
  humidity: {
    optimal: [60, 80],
    warning: [45, 90],
    domainMin: 0,
    domainMax: 100,
    label: "Air Humidity",
    icon: "water-percent",
    description: "Relative humidity of the greenhouse air.",
    tip: "High humidity above 85% encourages mould and blight. Below 45% plants may wilt.",
  },
  light: {
    optimal: [3000, 10000],
    warning: [500, 20000],
    domainMin: 0,
    domainMax: 30000,
    label: "Light Intensity",
    icon: "white-balance-sunny",
    description: "Photosynthetically active light reaching the canopy in lux.",
    tip: "3,000–10,000 lux supports active photosynthesis. Grow lights supplement natural light.",
  },
  soilMoisture: {
    optimal: [60, 80],
    warning: [35, 90],
    domainMin: 0,
    domainMax: 100,
    label: "Soil Moisture",
    icon: "sprout",
    description: "Volumetric water content of the growing substrate.",
    tip: "Below 35% roots begin to stress. Above 90% oxygen is excluded, risking root rot.",
  },
  ph: {
    optimal: [6.0, 7.0],
    warning: [5.5, 7.5],
    domainMin: 4.0,
    domainMax: 9.0,
    label: "pH Level",
    icon: "flask",
    description: "Acidity of the nutrient solution or soil water.",
    tip: "pH 6.0–7.0 keeps macro and micro-nutrients available. Drift locks out iron and calcium.",
  },
  ec: {
    optimal: [1.5, 3.0],
    warning: [0.8, 4.0],
    domainMin: 0,
    domainMax: 6.0,
    label: "Conductivity (EC)",
    icon: "lightning-bolt",
    description: "Electrical conductivity of the nutrient solution in mS/cm.",
    tip: "EC 1.5–3.0 mS/cm delivers balanced nutrition. Above 4.0 causes osmotic stress.",
  },
};

function formatVal(id: string, v: number) {
  if (id === "light") return Math.round(v).toLocaleString();
  if (id === "ph") return v.toFixed(2);
  if (id === "ec") return v.toFixed(2);
  if (id === "temperature") return v.toFixed(1);
  return Math.round(v).toString();
}

function DetailChart({
  data,
  sensorId,
  meta,
  statusColor,
}: {
  data: number[];
  sensorId: string;
  meta: ThresholdDef;
  statusColor: string;
}) {
  const colors = useColors();
  const W = 340;
  const H = 200;
  const padL = 42;
  const padR = 12;
  const padT = 12;
  const padB = 28;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const { domainMin, domainMax, optimal, warning } = meta;
  const range = domainMax - domainMin || 1;

  const toY = (v: number) => padT + chartH - ((v - domainMin) / range) * chartH;
  const toX = (i: number) => padL + (data.length < 2 ? 0 : (i / (data.length - 1)) * chartW);

  const zoneRects = [
    { top: domainMax, bot: warning[1], color: colors.critical + "30" },
    { top: warning[1], bot: optimal[1], color: colors.warning + "25" },
    { top: optimal[1], bot: optimal[0], color: colors.optimal + "22" },
    { top: optimal[0], bot: warning[0], color: colors.warning + "25" },
    { top: warning[0], bot: domainMin, color: colors.critical + "30" },
  ];

  const smooth = (pts: { x: number; y: number }[]): string => {
    if (pts.length < 2) return `M${pts[0]?.x ?? 0},${pts[0]?.y ?? H / 2}`;
    let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i - 1];
      const c = pts[i];
      const cx = (p.x + c.x) / 2;
      d += ` C${cx.toFixed(1)},${p.y.toFixed(1)} ${cx.toFixed(1)},${c.y.toFixed(1)} ${c.x.toFixed(1)},${c.y.toFixed(1)}`;
    }
    return d;
  };

  const points = data.map((v, i) => ({ x: toX(i), y: toY(v) }));
  const linePath = smooth(points);
  const last = points[points.length - 1];
  const first = points[0];
  const areaPath = last && first
    ? `${linePath} L${last.x.toFixed(1)},${(padT + chartH).toFixed(1)} L${first.x.toFixed(1)},${(padT + chartH).toFixed(1)} Z`
    : "";

  const yTicks = 5;
  const yLabels = Array.from({ length: yTicks + 1 }, (_, i) => {
    const v = domainMin + (i / yTicks) * range;
    return { v, y: toY(v) };
  });

  const xLabelCount = Math.min(4, data.length);
  const xLabels = xLabelCount > 1
    ? Array.from({ length: xLabelCount }, (_, i) => {
        const idx = Math.round((i / (xLabelCount - 1)) * (data.length - 1));
        const label = `−${((data.length - 1 - idx) * 6)}s`;
        return { x: toX(idx), label };
      })
    : [];

  return (
    <Svg width={W} height={H}>
      <Defs>
        <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={statusColor} stopOpacity={0.4} />
          <Stop offset="100%" stopColor={statusColor} stopOpacity={0} />
        </LinearGradient>
      </Defs>

      {zoneRects.map((z, i) => {
        const y1 = toY(z.top);
        const y2 = toY(z.bot);
        return (
          <Rect
            key={i}
            x={padL}
            y={Math.min(y1, y2)}
            width={chartW}
            height={Math.abs(y2 - y1)}
            fill={z.color}
          />
        );
      })}

      {yLabels.map(({ v, y }, i) => (
        <React.Fragment key={i}>
          <Line
            x1={padL}
            y1={y}
            x2={padL + chartW}
            y2={y}
            stroke={colors.border}
            strokeWidth={0.5}
            strokeDasharray="3,3"
          />
          <SvgText
            x={padL - 5}
            y={y + 4}
            fontSize={9}
            fill={colors.mutedForeground}
            textAnchor="end"
            fontFamily="monospace"
          >
            {sensorId === "light"
              ? Math.round(v / 1000) + "k"
              : sensorId === "ph" || sensorId === "ec"
              ? v.toFixed(1)
              : Math.round(v)}
          </SvgText>
        </React.Fragment>
      ))}

      {xLabels.map(({ x, label }, i) => (
        <SvgText
          key={i}
          x={x}
          y={H - 4}
          fontSize={8}
          fill={colors.mutedForeground}
          textAnchor="middle"
          fontFamily="monospace"
        >
          {label}
        </SvgText>
      ))}

      {areaPath ? <Path d={areaPath} fill="url(#areaGrad)" /> : null}
      {linePath ? (
        <Path
          d={linePath}
          stroke={statusColor}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}

      {last && (
        <>
          <Line
            x1={last.x}
            y1={padT}
            x2={last.x}
            y2={padT + chartH}
            stroke={statusColor}
            strokeWidth={1}
            strokeDasharray="3,3"
            opacity={0.6}
          />
        </>
      )}
    </Svg>
  );
}

function PulsingDot({ color }: { color: string }) {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.3, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  return <Animated.View style={[styles.pulsingDot, { backgroundColor: color, opacity: anim }]} />;
}

export default function SensorDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { sensors, sensorHistory, alerts, automationRules } = useGreenhouse();

  const sensor = sensors.find((s) => s.id === id);
  const history = sensorHistory[id ?? ""] ?? [];
  const meta = SENSOR_META[id ?? ""];

  if (!sensor || !meta) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground, padding: 24 }}>Sensor not found.</Text>
      </View>
    );
  }

  const statusColor =
    sensor.status === "optimal"
      ? colors.optimal
      : sensor.status === "warning"
      ? colors.warning
      : colors.critical;

  const statusLabel =
    sensor.status === "optimal" ? "Optimal" : sensor.status === "warning" ? "Warning" : "Critical";

  const relatedAlerts = alerts.filter((a) => a.sensor === id).slice(0, 5);
  const relatedRules = automationRules.filter((r) =>
    r.description.toLowerCase().includes(meta.label.split(" ")[0].toLowerCase()) ||
    (id === "soilMoisture" && r.description.toLowerCase().includes("moisture")) ||
    (id === "soilMoisture" && r.description.toLowerCase().includes("pump")) ||
    (id === "light" && r.description.toLowerCase().includes("light")) ||
    (id === "temperature" && r.description.toLowerCase().includes("exhaust")) ||
    (id === "humidity" && r.description.toLowerCase().includes("ventilation"))
  );

  const minVal = history.length ? Math.min(...history) : sensor.value;
  const maxVal = history.length ? Math.max(...history) : sensor.value;
  const avgVal = history.length ? history.reduce((s, v) => s + v, 0) / history.length : sensor.value;

  const formatRelative = (date: Date) => {
    const diff = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diff < 1) return "just now";
    if (diff < 60) return `${diff}m ago`;
    const hrs = Math.floor(diff / 60);
    return hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`;
  };

  const topPad = Platform.OS === "web" ? 20 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.6 : 1 }]}
          hitSlop={12}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerTitle}>
          <MaterialCommunityIcons name={meta.icon as any} size={18} color={statusColor} />
          <Text style={[styles.headerText, { color: colors.foreground }]}>{meta.label}</Text>
        </View>
        <PulsingDot color={statusColor} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: statusColor }]}>
          <View style={[styles.heroAccent, { backgroundColor: statusColor }]} />
          <View style={styles.heroInner}>
            <View style={styles.heroLeft}>
              <Text style={[styles.heroValue, { color: colors.foreground }]}>
                {formatVal(id, sensor.value)}
              </Text>
              <Text style={[styles.heroUnit, { color: colors.mutedForeground }]}>
                {sensor.unit || "pH"}
              </Text>
            </View>
            <View style={styles.heroRight}>
              <View style={[styles.statusBadge, { backgroundColor: statusColor + "22", borderColor: statusColor }]}>
                <View style={[styles.statusDotSmall, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
              </View>
              <Text style={[styles.heroDescriptor, { color: colors.secondaryForeground }]}>
                {sensor.descriptor.split("— ")[1] ?? sensor.descriptor}
              </Text>
              <Text style={[styles.heroTs, { color: colors.mutedForeground }]}>
                Last update: {sensor.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.statsRow]}>
          {[
            { label: "MIN", value: formatVal(id, minVal) },
            { label: "AVG", value: formatVal(id, avgVal) },
            { label: "MAX", value: formatVal(id, maxVal) },
          ].map(({ label, value }) => (
            <View key={label} style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
              <Text style={[styles.statValue, { color: colors.foreground }]}>
                {value}
                {sensor.unit ? <Text style={[styles.statUnit, { color: colors.mutedForeground }]}> {sensor.unit}</Text> : null}
              </Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>HISTORICAL READING</Text>
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <DetailChart
            data={history.length >= 2 ? history : [sensor.value, sensor.value]}
            sensorId={id}
            meta={meta}
            statusColor={statusColor}
          />
          <View style={styles.chartLegend}>
            {[
              { color: colors.optimal + "55", label: "Optimal zone" },
              { color: colors.warning + "44", label: "Warning zone" },
              { color: colors.critical + "44", label: "Critical zone" },
            ].map(({ color, label }) => (
              <View key={label} style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: color }]} />
                <Text style={[styles.legendLabel, { color: colors.mutedForeground }]}>{label}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>THRESHOLDS</Text>
        <View style={[styles.thresholdCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            {
              label: "Optimal",
              range: `${formatVal(id, meta.optimal[0])} – ${formatVal(id, meta.optimal[1])} ${sensor.unit}`,
              color: colors.optimal,
              icon: "check-circle",
            },
            {
              label: "Warning (low)",
              range: `${formatVal(id, meta.warning[0])} – ${formatVal(id, meta.optimal[0])} ${sensor.unit}`,
              color: colors.warning,
              icon: "alert",
            },
            {
              label: "Warning (high)",
              range: `${formatVal(id, meta.optimal[1])} – ${formatVal(id, meta.warning[1])} ${sensor.unit}`,
              color: colors.warning,
              icon: "alert",
            },
            {
              label: "Critical (low)",
              range: `Below ${formatVal(id, meta.warning[0])} ${sensor.unit}`,
              color: colors.critical,
              icon: "alert-circle",
            },
            {
              label: "Critical (high)",
              range: `Above ${formatVal(id, meta.warning[1])} ${sensor.unit}`,
              color: colors.critical,
              icon: "alert-circle",
            },
          ].map(({ label, range, color, icon }, i) => (
            <View
              key={i}
              style={[
                styles.thresholdRow,
                i < 4 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
            >
              <MaterialCommunityIcons name={icon as any} size={16} color={color} />
              <View style={styles.thresholdText}>
                <Text style={[styles.thresholdLabel, { color: colors.foreground }]}>{label}</Text>
                <Text style={[styles.thresholdRange, { color: colors.mutedForeground }]}>{range}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>ABOUT THIS SENSOR</Text>
        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.infoText, { color: colors.secondaryForeground }]}>{meta.description}</Text>
          <View style={[styles.tipRow, { backgroundColor: colors.secondary, borderRadius: 8 }]}>
            <MaterialCommunityIcons name="lightbulb-on-outline" size={16} color={colors.warning} />
            <Text style={[styles.tipText, { color: colors.secondaryForeground }]}>{meta.tip}</Text>
          </View>
        </View>

        {relatedRules.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>AUTOMATION RULES</Text>
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {relatedRules.map((rule, i) => (
                <View
                  key={rule.id}
                  style={[
                    styles.ruleRow,
                    i < relatedRules.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                  ]}
                >
                  <View
                    style={[
                      styles.ruleDot,
                      { backgroundColor: rule.isActive ? colors.optimal : colors.mutedForeground },
                    ]}
                  />
                  <Text style={[styles.ruleText, { color: colors.secondaryForeground }]}>
                    {rule.description}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {relatedAlerts.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>RECENT ALERTS</Text>
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {relatedAlerts.map((alert, i) => {
                const ac =
                  alert.severity === "critical"
                    ? colors.critical
                    : alert.severity === "warning"
                    ? colors.warning
                    : colors.optimal;
                return (
                  <View
                    key={alert.id}
                    style={[
                      styles.alertRow,
                      i < relatedAlerts.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={
                        alert.severity === "critical"
                          ? "alert-circle"
                          : alert.severity === "warning"
                          ? "alert"
                          : "information"
                      }
                      size={15}
                      color={ac}
                    />
                    <View style={styles.alertBody}>
                      <Text style={[styles.alertMsg, { color: colors.secondaryForeground }]}>
                        {alert.message}
                      </Text>
                      <Text style={[styles.alertTs, { color: colors.mutedForeground }]}>
                        {formatRelative(alert.timestamp)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerTitle: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  headerText: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  pulsingDot: { width: 10, height: 10, borderRadius: 5 },
  scroll: { padding: 16, gap: 0 },

  heroCard: { borderRadius: 16, borderWidth: 2, overflow: "hidden", marginBottom: 12 },
  heroAccent: { height: 4 },
  heroInner: { flexDirection: "row", padding: 16, gap: 16 },
  heroLeft: { alignItems: "flex-start", justifyContent: "center" },
  heroValue: { fontSize: 64, fontFamily: "Inter_700Bold", lineHeight: 70 },
  heroUnit: { fontSize: 16, fontFamily: "Inter_500Medium", marginTop: -4 },
  heroRight: { flex: 1, gap: 8, justifyContent: "center" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  statusDotSmall: { width: 6, height: 6, borderRadius: 3 },
  statusBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  heroDescriptor: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  heroTs: { fontSize: 10, fontFamily: "Inter_400Regular" },

  statsRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  statBox: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  statLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  statValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  statUnit: { fontSize: 11, fontFamily: "Inter_400Regular" },

  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
    marginBottom: 10,
    marginTop: 4,
  },

  chartCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 20,
    padding: 12,
    alignItems: "center",
  },
  chartLegend: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
    marginTop: 8,
    alignSelf: "flex-start",
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendSwatch: { width: 12, height: 12, borderRadius: 3 },
  legendLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },

  thresholdCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 20,
  },
  thresholdRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
  },
  thresholdText: { flex: 1 },
  thresholdLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  thresholdRange: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },

  infoCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 20,
    padding: 14,
    gap: 10,
  },
  infoText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  tipRow: { flexDirection: "row", gap: 10, padding: 10, alignItems: "flex-start" },
  tipText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },

  ruleRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  ruleDot: { width: 8, height: 8, borderRadius: 4 },
  ruleText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },

  alertRow: { flexDirection: "row", gap: 10, paddingVertical: 10, alignItems: "flex-start" },
  alertBody: { flex: 1, gap: 2 },
  alertMsg: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  alertTs: { fontSize: 10, fontFamily: "Inter_400Regular" },
});

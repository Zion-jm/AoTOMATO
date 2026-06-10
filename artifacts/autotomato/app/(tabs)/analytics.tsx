import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGreenhouse } from "@/contexts/GreenhouseContext";
import { useColors } from "@/hooks/useColors";

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>["name"];

const SENSOR_META: Record<string, { icon: IconName; color: string; unit: string }> = {
  temperature:  { icon: "thermometer",        color: "#FB923C", unit: "°C"    },
  humidity:     { icon: "water-percent",       color: "#60A5FA", unit: "%"     },
  light:        { icon: "white-balance-sunny", color: "#FACC15", unit: " lux"  },
  soilMoisture: { icon: "water",               color: "#34D399", unit: "%"     },
  ph:           { icon: "test-tube",           color: "#A78BFA", unit: ""      },
  ec:           { icon: "lightning-bolt",      color: "#F472B6", unit: " mS/cm"},
};

interface RiskDomain {
  id: string;
  name: string;
  icon: IconName;
  color: string;
  sensorId: string;
  sensorId2?: string;
  thresholdLow?: number;
  thresholdHigh?: number;
  thresholdLow2?: number;
  thresholdHigh2?: number;
  horizon: number;
  description: string;
}

const RISK_DOMAINS: RiskDomain[] = [
  {
    id: "thermal",
    name: "Thermal Runaway",
    icon: "thermometer-alert",
    color: "#FB923C",
    sensorId: "temperature",
    thresholdHigh: 28,
    horizon: 30,
    description: "Cherry tomato pollen viability drops above 29.4°C. Brief heat spikes during flowering can destroy yields.",
  },
  {
    id: "humidity",
    name: "Humidity Trap",
    icon: "water-alert",
    color: "#60A5FA",
    sensorId: "humidity",
    thresholdHigh: 75,
    horizon: 30,
    description: "Sustained humidity above 75% creates conditions favorable for leaf mold and gray mold development.",
  },
  {
    id: "dryout",
    name: "Dry-Out",
    icon: "sprout",
    color: "#34D399",
    sensorId: "soilMoisture",
    thresholdLow: 60,
    horizon: 60,
    description: "Root zone stress below 60% moisture risks blossom end rot and reduced nutrient uptake.",
  },
  {
    id: "lightcrash",
    name: "Light Crash",
    icon: "lightbulb-alert",
    color: "#FACC15",
    sensorId: "light",
    thresholdLow: 3000,
    horizon: 30,
    description: "Photosynthesis rate drops sharply below 3,000 lux, reducing daily carbohydrate production.",
  },
  {
    id: "nutrient",
    name: "Nutrient Drift",
    icon: "flask-outline",
    color: "#A78BFA",
    sensorId: "ph",
    sensorId2: "ec",
    thresholdLow: 5.5,
    thresholdHigh: 7.5,
    thresholdLow2: 0.8,
    thresholdHigh2: 4.0,
    horizon: 120,
    description: "pH or EC outside optimal bands locks out nutrients causing deficiency symptoms within 1–2 days.",
  },
  {
    id: "stall",
    name: "System Stall",
    icon: "wifi-alert",
    color: "#94A3B8",
    sensorId: "temperature",
    horizon: 15,
    description: "Connectivity degradation can create automation blackouts leaving the greenhouse uncontrolled.",
  },
];

interface RiskResult {
  current: number;
  current2?: number;
  predicted: number;
  predicted2?: number;
  slope: number;
  minsToBreach: number | null;
  confidence: number;
  level: "safe" | "watch" | "alert" | "critical";
  trendLabel: string;
}

function computeTrend(history: number[]): { slope: number; confidence: number } {
  if (history.length < 3) return { slope: 0, confidence: 0 };
  const recent = history.slice(-12);
  const n = recent.length;
  const slope = (recent[n - 1] - recent[0]) / (n - 1);
  const slopes: number[] = [];
  for (let i = 1; i < recent.length; i++) slopes.push(recent[i] - recent[i - 1]);
  const avgSlope = slopes.reduce((a, b) => a + b, 0) / slopes.length;
  const variance = slopes.reduce((a, b) => a + Math.pow(b - avgSlope, 2), 0) / slopes.length;
  const cv = Math.sqrt(variance) / (Math.abs(avgSlope) + 0.0001);
  const confidence = Math.max(30, Math.min(95, Math.round(100 - cv * 15)));
  return { slope, confidence };
}

function evaluateRisk(domain: RiskDomain, history: Record<string, number[]>): RiskResult {
  const h = history[domain.sensorId] ?? [];
  const h2 = domain.sensorId2 ? (history[domain.sensorId2] ?? []) : [];

  if (h.length < 3) {
    return { current: 0, slope: 0, predicted: 0, minsToBreach: null, confidence: 0, level: "safe", trendLabel: "—" };
  }

  const readingsPerMin = 30;
  const { slope, confidence } = computeTrend(h);
  const current = h[h.length - 1];
  const predicted = current + slope * domain.horizon * readingsPerMin;

  let current2: number | undefined;
  let predicted2: number | undefined;
  let slope2 = 0;
  if (h2.length >= 3) {
    const t2 = computeTrend(h2);
    slope2 = t2.slope;
    current2 = h2[h2.length - 1];
    predicted2 = current2 + t2.slope * domain.horizon * readingsPerMin;
  }

  if (domain.id === "stall") {
    return {
      current,
      slope,
      predicted,
      minsToBreach: null,
      confidence: 88,
      level: "safe",
      trendLabel: "Heartbeat normal",
    };
  }

  let minsToBreach: number | null = null;

  if (domain.thresholdHigh !== undefined && slope > 0 && current < domain.thresholdHigh) {
    const mins = ((domain.thresholdHigh - current) / slope) / readingsPerMin;
    if (mins > 0 && mins <= 120) minsToBreach = mins;
  }
  if (domain.thresholdLow !== undefined && slope < 0 && current > domain.thresholdLow) {
    const mins = ((current - domain.thresholdLow) / (-slope)) / readingsPerMin;
    if (mins > 0 && mins <= 120 && (minsToBreach === null || mins < minsToBreach)) minsToBreach = mins;
  }

  if (domain.sensorId2 && h2.length >= 3 && current2 !== undefined) {
    if (domain.thresholdHigh2 !== undefined && slope2 > 0 && current2 < domain.thresholdHigh2) {
      const mins = ((domain.thresholdHigh2 - current2) / slope2) / readingsPerMin;
      if (mins > 0 && mins <= 120 && (minsToBreach === null || mins < minsToBreach)) minsToBreach = mins;
    }
    if (domain.thresholdLow2 !== undefined && slope2 < 0 && current2 > domain.thresholdLow2) {
      const mins = ((current2 - domain.thresholdLow2) / (-slope2)) / readingsPerMin;
      if (mins > 0 && mins <= 120 && (minsToBreach === null || mins < minsToBreach)) minsToBreach = mins;
    }
  }

  const atRisk = domain.thresholdHigh !== undefined
    ? current >= domain.thresholdHigh * 0.95
    : domain.thresholdLow !== undefined
      ? current <= domain.thresholdLow * 1.05
      : false;

  let level: RiskResult["level"] = "safe";
  if (atRisk) {
    level = "critical";
  } else if (minsToBreach !== null && minsToBreach <= 15) {
    level = "critical";
  } else if (minsToBreach !== null && minsToBreach <= 30) {
    level = "alert";
  } else if (minsToBreach !== null && minsToBreach <= 60) {
    level = "watch";
  }

  const slopePerMin = slope * readingsPerMin;
  const absSlopePerMin = Math.abs(slopePerMin);
  const isRising = slope > 0;
  let trendLabel = "Stable";
  if (absSlopePerMin > 0.05) {
    trendLabel = isRising ? `+${slopePerMin.toFixed(2)}/min ↑` : `${slopePerMin.toFixed(2)}/min ↓`;
  }

  return { current, current2, predicted, predicted2, slope, minsToBreach, confidence, level, trendLabel };
}

function formatSensorVal(id: string, v: number): string {
  if (id === "temperature") return v.toFixed(1) + "°C";
  if (id === "ph")          return v.toFixed(2);
  if (id === "ec")          return v.toFixed(2) + " mS/cm";
  if (id === "light")       return Math.round(v) + " lux";
  return Math.round(v) + "%";
}

function SensorSummaryStrip() {
  const colors = useColors();
  const { sensors } = useGreenhouse();

  return (
    <View style={strip.row}>
      {sensors.map((s) => {
        const meta = SENSOR_META[s.id];
        const statusColor =
          s.status === "optimal" ? colors.optimal :
          s.status === "warning"  ? colors.warning  : colors.critical;
        return (
          <View key={s.id} style={[strip.chip, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialCommunityIcons name={meta?.icon ?? "alert"} size={14} color={meta?.color ?? colors.mutedForeground} />
            <Text style={[strip.val, { color: colors.foreground }]}>
              {formatSensorVal(s.id, s.value)}
            </Text>
            <View style={[strip.dot, { backgroundColor: statusColor }]} />
          </View>
        );
      })}
    </View>
  );
}

function RiskCard({ domain }: { domain: RiskDomain }) {
  const colors = useColors();
  const { sensorHistory } = useGreenhouse();
  const result = useMemo(() => evaluateRisk(domain, sensorHistory), [domain, sensorHistory]);

  const LEVEL_CONFIG = {
    safe:     { label: "SAFE",     bg: colors.optimal + "22",  border: colors.optimal + "55",  text: colors.optimal  },
    watch:    { label: "WATCH",    bg: "#FACC1522",             border: "#FACC1555",             text: "#FACC15"       },
    alert:    { label: "ALERT",    bg: colors.warning + "22",   border: colors.warning + "55",   text: colors.warning  },
    critical: { label: "CRITICAL", bg: colors.critical + "22",  border: colors.critical + "55",  text: colors.critical },
  };
  const cfg = LEVEL_CONFIG[result.level];

  const sensorId2 = domain.sensorId2;
  const primaryLabel = SENSOR_META[domain.sensorId]
    ? domain.sensorId.charAt(0).toUpperCase() + domain.sensorId.slice(1)
    : domain.sensorId;

  return (
    <View style={[rc.wrap, { backgroundColor: colors.card, borderColor: cfg.border }]}>
      <View style={rc.topRow}>
        <View style={rc.left}>
          <View style={[rc.iconWrap, { backgroundColor: domain.color + "22" }]}>
            <MaterialCommunityIcons name={domain.icon} size={18} color={domain.color} />
          </View>
          <View>
            <Text style={[rc.name, { color: colors.foreground }]}>{domain.name}</Text>
            <Text style={[rc.trend, { color: colors.mutedForeground }]}>{result.trendLabel}</Text>
          </View>
        </View>
        <View style={[rc.levelBadge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
          <Text style={[rc.levelText, { color: cfg.text }]}>{cfg.label}</Text>
        </View>
      </View>

      <View style={rc.metricsRow}>
        <View style={rc.metric}>
          <Text style={[rc.metricLabel, { color: colors.mutedForeground }]}>NOW</Text>
          <Text style={[rc.metricValue, { color: colors.foreground }]}>
            {domain.id === "stall" ? "Online" : formatSensorVal(domain.sensorId, result.current)}
          </Text>
        </View>
        <View style={rc.metric}>
          <Text style={[rc.metricLabel, { color: colors.mutedForeground }]}>
            IN {domain.horizon} MIN
          </Text>
          <Text style={[rc.metricValue, { color: result.level === "safe" ? colors.foreground : cfg.text }]}>
            {domain.id === "stall" ? "Stable" : formatSensorVal(domain.sensorId, result.predicted)}
          </Text>
        </View>
        <View style={rc.metric}>
          <Text style={[rc.metricLabel, { color: colors.mutedForeground }]}>BREACH IN</Text>
          <Text style={[rc.metricValue, { color: result.minsToBreach ? cfg.text : colors.optimal }]}>
            {result.minsToBreach
              ? `~${Math.round(result.minsToBreach)}m`
              : domain.id === "stall" ? "N/A" : "—"}
          </Text>
        </View>
        <View style={rc.metric}>
          <Text style={[rc.metricLabel, { color: colors.mutedForeground }]}>CONFIDENCE</Text>
          <Text style={[rc.metricValue, { color: colors.secondaryForeground }]}>
            {result.confidence}%
          </Text>
        </View>
      </View>

      {sensorId2 && result.current2 !== undefined && (
        <View style={[rc.secondaryRow, { borderTopColor: colors.border }]}>
          <MaterialCommunityIcons
            name={(SENSOR_META[sensorId2]?.icon ?? "alert") as any}
            size={12}
            color={SENSOR_META[sensorId2]?.color ?? colors.mutedForeground}
          />
          <Text style={[rc.secondaryText, { color: colors.mutedForeground }]}>
            {sensorId2.toUpperCase()}: {formatSensorVal(sensorId2, result.current2)}
            {result.predicted2 !== undefined
              ? ` → ${formatSensorVal(sensorId2, result.predicted2)} in ${domain.horizon}m`
              : ""}
          </Text>
        </View>
      )}

      <Text style={[rc.desc, { color: colors.mutedForeground }]}>{domain.description}</Text>
    </View>
  );
}

function buildConditionReport(
  sensors: ReturnType<typeof useGreenhouse>["sensors"],
  sensorHistory: Record<string, number[]>
): string {
  const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const warnings = sensors.filter((s) => s.status === "warning");
  const criticals = sensors.filter((s) => s.status === "critical");

  const riskResults = RISK_DOMAINS.map((d) => ({
    domain: d,
    result: evaluateRisk(d, sensorHistory),
  })).filter((r) => r.result.level !== "safe")
    .sort((a, b) => {
      const order = { critical: 0, alert: 1, watch: 2, safe: 3 };
      return order[a.result.level] - order[b.result.level];
    });

  const parts: string[] = [];

  // Opening
  if (criticals.length === 0 && warnings.length === 0) {
    parts.push(`As of ${now}, all six sensors are reading within optimal ranges — the greenhouse environment is fully healthy.`);
  } else if (criticals.length > 0) {
    const names = criticals.map((s) => s.label.toLowerCase()).join(" and ");
    parts.push(`As of ${now}, the greenhouse is under stress. ${criticals.length === 1 ? "One sensor — " + names + " — is" : names + " are"} at a critical level, requiring immediate attention.`);
  } else {
    const names = warnings.map((s) => s.label.toLowerCase()).join(", ");
    parts.push(`As of ${now}, the greenhouse is in a cautionary state. ${warnings.length === 1 ? names.charAt(0).toUpperCase() + names.slice(1) + " is" : warnings.length + " sensors (" + names + ") are"} outside optimal bounds.`);
  }

  // Sensor highlights
  const temp = sensors.find((s) => s.id === "temperature");
  const hum = sensors.find((s) => s.id === "humidity");
  const soil = sensors.find((s) => s.id === "soilMoisture");
  const ph = sensors.find((s) => s.id === "ph");

  if (temp) {
    if (temp.status === "optimal") {
      parts.push(`Temperature is steady at ${temp.value.toFixed(1)}°C, well within the 18–26°C ideal window for tomato growth.`);
    } else if (temp.status === "warning") {
      parts.push(`Temperature at ${temp.value.toFixed(1)}°C is above the optimal ceiling — pollen viability may be reduced if it continues to rise.`);
    } else {
      parts.push(`Temperature at ${temp.value.toFixed(1)}°C is at a critical level and poses an immediate risk to plant health.`);
    }
  }

  if (hum) {
    if (hum.status === "optimal") {
      parts.push(`Humidity is at ${Math.round(hum.value)}%, providing good conditions for transpiration without disease pressure.`);
    } else if (hum.value > 80) {
      parts.push(`Humidity has climbed to ${Math.round(hum.value)}% — sustained levels above 80% create conditions favourable for mould and blight.`);
    } else {
      parts.push(`Humidity is at ${Math.round(hum.value)}%, which is lower than ideal and may cause plant stress.`);
    }
  }

  if (soil) {
    if (soil.status === "optimal") {
      parts.push(`Soil moisture at ${Math.round(soil.value)}% is in a healthy range, keeping roots well-hydrated.`);
    } else if (soil.value < 60) {
      parts.push(`Soil moisture has dipped to ${Math.round(soil.value)}% — below 60% the root zone begins to experience water stress.`);
    } else {
      parts.push(`Soil moisture at ${Math.round(soil.value)}% is high; ensure drainage is adequate to avoid waterlogging.`);
    }
  }

  if (ph && ph.status !== "optimal") {
    parts.push(`pH is drifting to ${ph.value.toFixed(2)}, outside the 6.0–7.0 optimal window — nutrient availability may be compromised.`);
  }

  // GRiPS predictions
  if (riskResults.length === 0) {
    parts.push(`GRiPS risk modeling shows no imminent threshold breaches across all six monitored domains.`);
  } else {
    const top = riskResults[0];
    const levelWord = top.result.level === "critical" ? "critical" : top.result.level === "alert" ? "elevated" : "developing";
    if (top.result.minsToBreach !== null) {
      parts.push(`GRiPS has flagged ${levelWord} risk of ${top.domain.name} — at the current trend, a threshold breach is projected in approximately ${Math.round(top.result.minsToBreach)} minute${Math.round(top.result.minsToBreach) === 1 ? "" : "s"}.`);
    } else {
      parts.push(`GRiPS has flagged ${levelWord} risk of ${top.domain.name} based on current sensor readings.`);
    }
    if (riskResults.length > 1) {
      const others = riskResults.slice(1).map((r) => r.domain.name).join(", ");
      parts.push(`Additional risk domains under watch: ${others}.`);
    }
  }

  // Closing recommendation
  if (criticals.length > 0 || riskResults.some((r) => r.result.level === "critical")) {
    parts.push(`Immediate intervention is recommended — check automation settings and inspect the affected systems.`);
  } else if (warnings.length > 0 || riskResults.length > 0) {
    parts.push(`Continue monitoring closely. Automation rules should manage the current conditions, but manual review is advised within the next hour.`);
  } else {
    parts.push(`No action required. The greenhouse is running well within all safety margins.`);
  }

  return parts.join(" ");
}

function ConditionReportCard() {
  const colors = useColors();
  const { sensors, sensorHistory } = useGreenhouse();

  const report = useMemo(
    () => buildConditionReport(sensors, sensorHistory),
    [sensors, sensorHistory]
  );

  const hasRisks = sensors.some((s) => s.status !== "optimal");
  const hasCritical = sensors.some((s) => s.status === "critical");
  const accentColor = hasCritical ? colors.critical : hasRisks ? colors.warning : colors.optimal;

  return (
    <View style={[cr.card, { backgroundColor: colors.card, borderColor: accentColor + "66" }]}>
      <View style={cr.header}>
        <View style={[cr.iconWrap, { backgroundColor: accentColor + "22" }]}>
          <MaterialCommunityIcons
            name={hasCritical ? "alert-circle" : hasRisks ? "alert" : "check-circle"}
            size={18}
            color={accentColor}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[cr.title, { color: colors.foreground }]}>Condition Report</Text>
          <Text style={[cr.subtitle, { color: colors.mutedForeground }]}>
            Auto-generated · updates every 6s
          </Text>
        </View>
        <View style={[cr.statusPill, { backgroundColor: accentColor + "22", borderColor: accentColor + "55" }]}>
          <View style={[cr.pillDot, { backgroundColor: accentColor }]} />
          <Text style={[cr.pillText, { color: accentColor }]}>
            {hasCritical ? "CRITICAL" : hasRisks ? "WARNING" : "HEALTHY"}
          </Text>
        </View>
      </View>
      <View style={[cr.divider, { backgroundColor: colors.border }]} />
      <Text style={[cr.body, { color: colors.secondaryForeground }]}>{report}</Text>
    </View>
  );
}

function GRiPSSummaryCard() {
  const colors = useColors();
  const benefits = [
    { icon: "cpu-64-bit" as IconName,       text: "Zero new hardware — runs on existing sensors" },
    { icon: "clock-fast" as IconName,        text: "15–60 min early warning before threshold breach" },
    { icon: "shield-check" as IconName,      text: "Auto-prevention triggers devices before damage" },
    { icon: "calculator" as IconName,        text: "Fully explainable linear trend math" },
    { icon: "lightning-bolt" as IconName,    text: "Energy efficient: brief pre-cooling vs extended emergency" },
    { icon: "cloud-off-outline" as IconName, text: "Continues automation during internet outages" },
  ];

  return (
    <View style={[gs.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={gs.header}>
        <View style={[gs.iconWrap, { backgroundColor: colors.primary + "22" }]}>
          <MaterialCommunityIcons name="leaf-circle" size={22} color={colors.primary} />
        </View>
        <View>
          <Text style={[gs.title, { color: colors.foreground }]}>About GRiPS</Text>
          <Text style={[gs.subtitle, { color: colors.mutedForeground }]}>Greenhouse Risk Prediction System</Text>
        </View>
      </View>

      <Text style={[gs.body, { color: colors.secondaryForeground }]}>
        GRiPS transforms auTOMATO from a reactive monitor into a proactive guardian. Using simple
        linear trend math on live sensor data, it forecasts environmental problems 15 to 60 minutes
        before they occur — and acts automatically when farmers are absent, working, or sleeping.
      </Text>

      <View style={[gs.divider, { backgroundColor: colors.border }]} />

      <Text style={[gs.benefitsTitle, { color: colors.mutedForeground }]}>KEY BENEFITS</Text>
      {benefits.map(({ icon, text }) => (
        <View key={text} style={gs.benefitRow}>
          <MaterialCommunityIcons name={icon} size={14} color={colors.primary} />
          <Text style={[gs.benefitText, { color: colors.secondaryForeground }]}>{text}</Text>
        </View>
      ))}

      <View style={[gs.footer, { borderTopColor: colors.border }]}>
        <Text style={[gs.footerText, { color: colors.mutedForeground }]}>
          Polytechnic University of the Philippines, Lopez Campus · AuTOMATO Project
        </Text>
      </View>
    </View>
  );
}

export default function AnalyticsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { sensorHistory } = useGreenhouse();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const activeRisks = useMemo(() => {
    return RISK_DOMAINS.filter((d) => {
      const r = evaluateRisk(d, sensorHistory);
      return r.level !== "safe";
    }).length;
  }, [sensorHistory]);

  return (
    <View style={[st.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[st.content, { paddingTop: topPad + 16, paddingBottom: bottomPad + 90 }]}
      >
        <View style={st.headerRow}>
          <View>
            <Text style={[st.title, { color: colors.foreground }]}>GRiPS</Text>
            <Text style={[st.subtitle, { color: colors.mutedForeground }]}>Risk Prediction System</Text>
          </View>
          <View style={[st.activeBadge, {
            backgroundColor: activeRisks > 0 ? colors.warning + "22" : colors.optimal + "22",
            borderColor: activeRisks > 0 ? colors.warning + "55" : colors.optimal + "55",
          }]}>
            <MaterialCommunityIcons
              name={activeRisks > 0 ? "alert" : "shield-check"}
              size={14}
              color={activeRisks > 0 ? colors.warning : colors.optimal}
            />
            <Text style={[st.activeBadgeText, { color: activeRisks > 0 ? colors.warning : colors.optimal }]}>
              {activeRisks > 0 ? `${activeRisks} risk${activeRisks > 1 ? "s" : ""} detected` : "All clear"}
            </Text>
          </View>
        </View>

        <Text style={[st.sectionLabel, { color: colors.mutedForeground }]}>LIVE READINGS</Text>
        <SensorSummaryStrip />

        <Text style={[st.sectionLabel, { color: colors.mutedForeground }]}>CONDITION REPORT</Text>
        <ConditionReportCard />

        <Text style={[st.sectionLabel, { color: colors.mutedForeground }]}>RISK PREDICTIONS</Text>
        <Text style={[st.hint, { color: colors.mutedForeground }]}>
          Linear trend forecasts using last {Object.values(sensorHistory)[0]?.length ?? 0} readings
        </Text>

        {RISK_DOMAINS.map((domain) => (
          <RiskCard key={domain.id} domain={domain} />
        ))}

        <Text style={[st.sectionLabel, { color: colors.mutedForeground }]}>ABOUT</Text>
        <GRiPSSummaryCard />
      </ScrollView>
    </View>
  );
}

const cr = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1.5, padding: 14, marginBottom: 4 },
  header: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  iconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  subtitle: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  pillDot: { width: 5, height: 5, borderRadius: 3 },
  pillText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  divider: { height: 1, marginBottom: 10 },
  body: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 21 },
});

const st = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  activeBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5 },
  activeBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  sectionLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1.2, marginBottom: 10, marginTop: 20 },
  hint: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: -8, marginBottom: 10 },
});

const strip = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  val: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
});

const rc = StyleSheet.create({
  wrap: { borderRadius: 14, borderWidth: 1.5, padding: 14, marginBottom: 10 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  left: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  trend: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  levelText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  metricsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  metric: { alignItems: "center", gap: 3 },
  metricLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8 },
  metricValue: { fontSize: 13, fontFamily: "Inter_700Bold" },
  secondaryRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingTop: 8, marginBottom: 8, borderTopWidth: 1 },
  secondaryText: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1 },
  desc: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
});

const gs = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1.5, padding: 16 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 16, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  body: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20, marginBottom: 12 },
  divider: { height: 1, marginBottom: 12 },
  benefitsTitle: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginBottom: 8 },
  benefitRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 8 },
  benefitText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 17 },
  footer: { borderTopWidth: 1, paddingTop: 12, marginTop: 4 },
  footerText: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
});

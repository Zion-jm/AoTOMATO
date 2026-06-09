import { Router } from "express";

const router = Router();

type SensorStatus = "optimal" | "warning" | "critical";

const BASE_SENSORS = {
  temperature: { base: 29.2, drift: 0.4, unit: "°C", label: "Temperature" },
  humidity: { base: 71, drift: 2, unit: "%", label: "Air Humidity" },
  light: { base: 5400, drift: 200, unit: "lux", label: "Light Intensity" },
  soilMoisture: { base: 63, drift: 1.5, unit: "%", label: "Soil Moisture" },
  ph: { base: 6.4, drift: 0.05, unit: "", label: "pH Level" },
  ec: { base: 2.1, drift: 0.05, unit: "mS/cm", label: "Conductivity (EC)" },
};

const SENSOR_IDS = Object.keys(BASE_SENSORS) as (keyof typeof BASE_SENSORS)[];

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function getStatus(id: string, value: number): SensorStatus {
  switch (id) {
    case "temperature":
      if (value >= 18 && value <= 26) return "optimal";
      if (value >= 10 && value <= 32) return "warning";
      return "critical";
    case "humidity":
      if (value >= 60 && value <= 80) return "optimal";
      if (value >= 45 && value <= 90) return "warning";
      return "critical";
    case "light":
      if (value >= 3000 && value <= 10000) return "optimal";
      if (value >= 500 && value <= 20000) return "warning";
      return "critical";
    case "soilMoisture":
      if (value >= 60 && value <= 80) return "optimal";
      if (value >= 35 && value <= 90) return "warning";
      return "critical";
    case "ph":
      if (value >= 6.0 && value <= 7.0) return "optimal";
      if (value >= 5.5 && value <= 7.5) return "warning";
      return "critical";
    case "ec":
      if (value >= 1.5 && value <= 3.0) return "optimal";
      if (value >= 0.8 && value <= 4.0) return "warning";
      return "critical";
    default:
      return "optimal";
  }
}

function getDescriptor(id: string, value: number): string {
  switch (id) {
    case "temperature": {
      if (value < 10) return `Dangerously cold for plants`;
      if (value < 18) return `Too cool for optimal growth`;
      if (value <= 26) return `Ideal growing temperature`;
      if (value <= 32) return `Too hot for optimal growth`;
      return `Dangerously high, risk of wilting`;
    }
    case "humidity": {
      if (value < 45) return `Air too dry, risk of stress`;
      if (value < 60) return `Humidity slightly low`;
      if (value <= 80) return `Perfectly humid for growth`;
      if (value <= 90) return `Humidity high, monitor for mould`;
      return `Too humid, disease risk`;
    }
    case "light": {
      if (value < 500) return `Critically low light`;
      if (value < 3000) return `Below ideal light level`;
      if (value <= 10000) return `Excellent light for photosynthesis`;
      if (value <= 20000) return `High but manageable light`;
      return `Excessive, risk of leaf burn`;
    }
    case "soilMoisture": {
      if (value < 35) return `Critically dry, water immediately`;
      if (value < 60) return `Soil getting dry`;
      if (value <= 80) return `Soil is perfectly hydrated`;
      if (value <= 90) return `Soil quite wet`;
      return `Waterlogged, risk of root rot`;
    }
    case "ph": {
      if (value < 5.5) return `Too acidic for nutrient uptake`;
      if (value < 6.0) return `Slightly acidic, monitor closely`;
      if (value <= 7.0) return `Optimal pH for tomatoes`;
      if (value <= 7.5) return `Slightly alkaline`;
      return `Too alkaline, nutrients locked out`;
    }
    case "ec": {
      if (value < 0.8) return `Nutrient solution very weak`;
      if (value < 1.5) return `Nutrients slightly low`;
      if (value <= 3.0) return `Nutrient concentration ideal`;
      if (value <= 4.0) return `Concentration high, dilute soon`;
      return `Toxic concentration level`;
    }
    default:
      return `${value}`;
  }
}

function generateHistoricalValue(id: string, seed: number, hour: number): number {
  const cfg = BASE_SENSORS[id as keyof typeof BASE_SENSORS];
  if (!cfg) return 0;
  const rng = seededRandom(seed);
  let val = cfg.base + (rng - 0.5) * 2 * cfg.drift * 4;

  // Add diurnal patterns
  if (id === "temperature") {
    val += Math.sin((hour - 6) * Math.PI / 12) * 2.5;
  }
  if (id === "light") {
    const isDay = hour >= 6 && hour < 22;
    val = isDay ? clamp(val + Math.sin((hour - 6) * Math.PI / 16) * 1500, 500, 25000) : clamp(seededRandom(seed * 7) * 200, 0, 300);
  }
  if (id === "humidity") {
    val += Math.sin((hour - 14) * Math.PI / 12) * 5;
  }
  if (id === "soilMoisture") {
    // Drop slowly, spike after irrigation (every ~6h)
    const cyclePos = hour % 6;
    val -= cyclePos * 0.8;
    if (cyclePos === 0) val += 12;
  }

  const limits: Record<string, [number, number]> = {
    temperature: [5, 45],
    humidity: [10, 100],
    light: [0, 30000],
    soilMoisture: [0, 100],
    ph: [4.0, 9.0],
    ec: [0, 6.0],
  };
  const [lo, hi] = limits[id] ?? [0, 1000];
  return clamp(val, lo, hi);
}

// GET /analytics/sensors/current
router.get("/sensors/current", (_req, res) => {
  const now = new Date();
  const readings = SENSOR_IDS.map((id) => {
    const cfg = BASE_SENSORS[id];
    const seed = now.getMinutes() * 60 + now.getSeconds() + id.charCodeAt(0);
    const rng = seededRandom(seed);
    const val = clamp(cfg.base + (rng - 0.5) * 2 * cfg.drift * 2, 0, 99999);
    return {
      id,
      label: cfg.label,
      value: parseFloat(val.toFixed(id === "ph" || id === "ec" ? 2 : 1)),
      unit: cfg.unit,
      status: getStatus(id, val),
      descriptor: getDescriptor(id, val),
    };
  });
  res.json(readings);
});

// GET /analytics/sensors/summary
router.get("/sensors/summary", (_req, res) => {
  const summaries = SENSOR_IDS.map((id) => {
    const cfg = BASE_SENSORS[id];
    const samples: number[] = [];
    const now = new Date();
    for (let i = 0; i < 168; i++) {
      const h = (now.getHours() - i + 168) % 24;
      const seed = i * 37 + id.charCodeAt(0) * 13;
      samples.push(generateHistoricalValue(id, seed, h));
    }
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    const min = Math.min(...samples);
    const max = Math.max(...samples);
    const optimal = samples.filter((v) => getStatus(id, v) === "optimal").length;
    const warning = samples.filter((v) => getStatus(id, v) === "warning").length;
    const critical = samples.filter((v) => getStatus(id, v) === "critical").length;
    const total = samples.length;
    const nowVal = generateHistoricalValue(id, Date.now() % 1000, new Date().getHours());
    return {
      id,
      label: cfg.label,
      unit: cfg.unit,
      min: parseFloat(min.toFixed(id === "ph" || id === "ec" ? 2 : 1)),
      max: parseFloat(max.toFixed(id === "ph" || id === "ec" ? 2 : 1)),
      avg: parseFloat(avg.toFixed(id === "ph" || id === "ec" ? 2 : 1)),
      pctOptimal: parseFloat(((optimal / total) * 100).toFixed(1)),
      pctWarning: parseFloat(((warning / total) * 100).toFixed(1)),
      pctCritical: parseFloat(((critical / total) * 100).toFixed(1)),
      currentStatus: getStatus(id, nowVal),
    };
  });
  res.json(summaries);
});

// GET /analytics/sensors/:sensorId/history/:range
router.get("/sensors/:sensorId/history/:range", (req, res) => {
  const { sensorId, range } = req.params;
  const cfg = BASE_SENSORS[sensorId as keyof typeof BASE_SENSORS];
  if (!cfg) {
    res.status(404).json({ error: "Unknown sensor" });
    return;
  }

  const now = new Date();
  let points: { timestamp: string; value: number; status: SensorStatus }[] = [];

  if (range === "24h") {
    // One point every 30 minutes for 24h = 48 points
    for (let i = 47; i >= 0; i--) {
      const ts = new Date(now.getTime() - i * 30 * 60 * 1000);
      const seed = i * 41 + sensorId.charCodeAt(0) * 17;
      const val = generateHistoricalValue(sensorId, seed, ts.getHours());
      points.push({
        timestamp: ts.toISOString(),
        value: parseFloat(val.toFixed(sensorId === "ph" || sensorId === "ec" ? 2 : 1)),
        status: getStatus(sensorId, val),
      });
    }
  } else if (range === "7d") {
    // One point every 2 hours for 7 days = 84 points
    for (let i = 83; i >= 0; i--) {
      const ts = new Date(now.getTime() - i * 2 * 60 * 60 * 1000);
      const seed = i * 53 + sensorId.charCodeAt(0) * 19;
      const val = generateHistoricalValue(sensorId, seed, ts.getHours());
      points.push({
        timestamp: ts.toISOString(),
        value: parseFloat(val.toFixed(sensorId === "ph" || sensorId === "ec" ? 2 : 1)),
        status: getStatus(sensorId, val),
      });
    }
  } else {
    // 30d — one point every 6 hours = 120 points
    for (let i = 119; i >= 0; i--) {
      const ts = new Date(now.getTime() - i * 6 * 60 * 60 * 1000);
      const seed = i * 61 + sensorId.charCodeAt(0) * 23;
      const val = generateHistoricalValue(sensorId, seed, ts.getHours());
      points.push({
        timestamp: ts.toISOString(),
        value: parseFloat(val.toFixed(sensorId === "ph" || sensorId === "ec" ? 2 : 1)),
        status: getStatus(sensorId, val),
      });
    }
  }

  res.json({
    sensorId,
    label: cfg.label,
    unit: cfg.unit,
    range,
    data: points,
  });
});

// GET /analytics/devices
router.get("/devices", (_req, res) => {
  const hour = new Date().getHours();
  const devices = [
    {
      id: "exhaust",
      name: "Exhaust Fan",
      isRunning: true,
      mode: "AUTO",
      todayRuntimeHours: parseFloat((hour * 0.6 + 2.1).toFixed(1)),
      weekRuntimeHours: parseFloat((hour * 0.6 * 7 + 14.3).toFixed(1)),
      activationCount: 3 + Math.floor(hour / 8),
    },
    {
      id: "ventilation",
      name: "Ventilation Fans",
      isRunning: false,
      mode: "AUTO",
      todayRuntimeHours: parseFloat((hour * 0.2 + 0.5).toFixed(1)),
      weekRuntimeHours: parseFloat((hour * 0.2 * 7 + 3.5).toFixed(1)),
      activationCount: 1 + Math.floor(hour / 12),
    },
    {
      id: "pump",
      name: "Water Pump",
      isRunning: false,
      mode: "AUTO",
      todayRuntimeHours: parseFloat((Math.floor(hour / 6) * 0.083).toFixed(2)),
      weekRuntimeHours: parseFloat((Math.floor(hour / 6) * 0.083 * 7).toFixed(2)),
      activationCount: Math.floor(hour / 6),
    },
    {
      id: "lights",
      name: "Grow Lights",
      isRunning: hour >= 6 && hour < 22,
      mode: "AUTO",
      todayRuntimeHours: parseFloat((Math.min(Math.max(hour - 6, 0), 16)).toFixed(1)),
      weekRuntimeHours: parseFloat(((Math.min(Math.max(hour - 6, 0), 16)) * 7).toFixed(1)),
      activationCount: 1,
    },
  ];
  res.json(devices);
});

// GET /analytics/alerts/recent
router.get("/alerts/recent", (_req, res) => {
  const now = Date.now();
  const alerts = [
    { id: "a1", message: "Temperature exceeded 28°C — Exhaust fan automatically activated", severity: "warning", timestamp: new Date(now - 8 * 60 * 1000).toISOString(), sensor: "temperature" },
    { id: "a2", message: "Grow lights turned on — Scheduled daily cycle started at 06:00", severity: "info", timestamp: new Date(now - 2 * 60 * 60 * 1000).toISOString(), sensor: "lights" },
    { id: "a3", message: "Soil moisture recovered to 63% after irrigation cycle", severity: "info", timestamp: new Date(now - 3.5 * 60 * 60 * 1000).toISOString(), sensor: "soilMoisture" },
    { id: "a4", message: "EC level was 3.2 mS/cm — Diluted nutrient solution", severity: "warning", timestamp: new Date(now - 6 * 60 * 60 * 1000).toISOString(), sensor: "ec" },
    { id: "a5", message: "pH dropped to 5.8 — Check nutrient solution acidity", severity: "warning", timestamp: new Date(now - 10 * 60 * 60 * 1000).toISOString(), sensor: "ph" },
    { id: "a6", message: "System startup — All sensors online", severity: "info", timestamp: new Date(now - 14 * 60 * 60 * 1000).toISOString(), sensor: null },
    { id: "a7", message: "Light intensity below 3000 lux during daylight hours", severity: "warning", timestamp: new Date(now - 18 * 60 * 60 * 1000).toISOString(), sensor: "light" },
    { id: "a8", message: "Humidity peaked at 87% — Monitor for mould risk", severity: "warning", timestamp: new Date(now - 22 * 60 * 60 * 1000).toISOString(), sensor: "humidity" },
    { id: "a9", message: "Temperature critical at 33°C — Immediate action required", severity: "critical", timestamp: new Date(now - 26 * 60 * 60 * 1000).toISOString(), sensor: "temperature" },
    { id: "a10", message: "Water pump completed irrigation cycle", severity: "info", timestamp: new Date(now - 30 * 60 * 60 * 1000).toISOString(), sensor: "soilMoisture" },
  ];
  res.json(alerts);
});

// GET /analytics/alerts/summary
router.get("/alerts/summary", (_req, res) => {
  res.json({
    totalToday: 4,
    totalWeek: 23,
    criticalCount: 1,
    warningCount: 12,
    infoCount: 10,
    bySensor: [
      { sensor: "temperature", label: "Temperature", info: 2, warning: 4, critical: 1, total: 7 },
      { sensor: "humidity", label: "Air Humidity", info: 1, warning: 3, critical: 0, total: 4 },
      { sensor: "soilMoisture", label: "Soil Moisture", info: 3, warning: 2, critical: 0, total: 5 },
      { sensor: "ec", label: "EC", info: 1, warning: 2, critical: 0, total: 3 },
      { sensor: "ph", label: "pH Level", info: 1, warning: 1, critical: 0, total: 2 },
      { sensor: "light", label: "Light Intensity", info: 2, warning: 0, critical: 0, total: 2 },
    ],
  });
});

export default router;

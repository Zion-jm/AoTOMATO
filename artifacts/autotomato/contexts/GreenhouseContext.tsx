import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export type SensorStatus = "optimal" | "warning" | "critical";
export type DeviceMode = "AUTO" | "FORCE_ON" | "FORCE_OFF";

export interface SensorReading {
  id: string;
  label: string;
  value: number;
  unit: string;
  status: SensorStatus;
  descriptor: string;
  timestamp: Date;
}

export interface DeviceState {
  id: string;
  name: string;
  iconName: string;
  mode: DeviceMode;
  isRunning: boolean;
}

export interface AlertItem {
  id: string;
  message: string;
  severity: "info" | "warning" | "critical";
  timestamp: Date;
  sensor?: string;
}

export interface AutomationRule {
  id: string;
  description: string;
  isActive: boolean;
}

interface GreenhouseContextType {
  sensors: SensorReading[];
  sensorHistory: Record<string, number[]>;
  devices: DeviceState[];
  isOnline: boolean;
  isUsingCached: boolean;
  alerts: AlertItem[];
  automationRules: AutomationRule[];
  setDeviceMode: (deviceId: string, mode: DeviceMode) => void;
  clearAlerts: () => void;
}

const GreenhouseContext = createContext<GreenhouseContextType | null>(null);

const DEVICES_KEY = "@autotomato/devices";
const ALERTS_KEY = "@autotomato/alerts";

const BASE_SENSORS = {
  temperature: { base: 29.2, drift: 0.4 },
  humidity: { base: 71, drift: 2 },
  light: { base: 5400, drift: 200 },
  soilMoisture: { base: 63, drift: 1.5 },
  ph: { base: 6.4, drift: 0.05 },
  ec: { base: 2.1, drift: 0.05 },
};

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function drift(base: number, amount: number) {
  return base + (Math.random() - 0.5) * 2 * amount;
}

function getSensorStatus(id: string, value: number): SensorStatus {
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

function getSensorDescriptor(id: string, value: number): string {
  switch (id) {
    case "temperature": {
      const v = value;
      if (v < 10) return `${v.toFixed(1)}°C — Dangerously cold for plants`;
      if (v < 18) return `${v.toFixed(1)}°C — Too cool for optimal growth`;
      if (v <= 26) return `${v.toFixed(1)}°C — Ideal growing temperature`;
      if (v <= 32) return `${v.toFixed(1)}°C — Too hot for optimal growth`;
      return `${v.toFixed(1)}°C — Dangerously high, risk of wilting`;
    }
    case "humidity": {
      const v = value;
      if (v < 45) return `${Math.round(v)}% — Air too dry, risk of stress`;
      if (v < 60) return `${Math.round(v)}% — Humidity slightly low`;
      if (v <= 80) return `${Math.round(v)}% — Perfectly humid for growth`;
      if (v <= 90) return `${Math.round(v)}% — Humidity high, monitor for mould`;
      return `${Math.round(v)}% — Too humid, disease risk`;
    }
    case "light": {
      const v = value;
      if (v < 500) return `${Math.round(v)} lux — Critically low light`;
      if (v < 3000) return `${Math.round(v)} lux — Below ideal light level`;
      if (v <= 10000) return `${Math.round(v)} lux — Excellent light for photosynthesis`;
      if (v <= 20000) return `${Math.round(v)} lux — High but manageable light`;
      return `${Math.round(v)} lux — Excessive, risk of leaf burn`;
    }
    case "soilMoisture": {
      const v = value;
      if (v < 35) return `${Math.round(v)}% — Critically dry, water immediately`;
      if (v < 60) return `${Math.round(v)}% — Soil getting dry`;
      if (v <= 80) return `${Math.round(v)}% — Soil is perfectly hydrated`;
      if (v <= 90) return `${Math.round(v)}% — Soil quite wet`;
      return `${Math.round(v)}% — Waterlogged, risk of root rot`;
    }
    case "ph": {
      const v = value;
      if (v < 5.5) return `${v.toFixed(2)} — Too acidic for nutrient uptake`;
      if (v < 6.0) return `${v.toFixed(2)} — Slightly acidic, monitor closely`;
      if (v <= 7.0) return `${v.toFixed(2)} — Optimal pH for tomatoes`;
      if (v <= 7.5) return `${v.toFixed(2)} — Slightly alkaline`;
      return `${v.toFixed(2)} — Too alkaline, nutrients locked out`;
    }
    case "ec": {
      const v = value;
      if (v < 0.8) return `${v.toFixed(2)} mS/cm — Nutrient solution very weak`;
      if (v < 1.5) return `${v.toFixed(2)} mS/cm — Nutrients slightly low`;
      if (v <= 3.0) return `${v.toFixed(2)} mS/cm — Nutrient concentration ideal`;
      if (v <= 4.0) return `${v.toFixed(2)} mS/cm — Concentration high, dilute soon`;
      return `${v.toFixed(2)} mS/cm — Toxic concentration level`;
    }
    default:
      return `${value}`;
  }
}

function buildSensors(): SensorReading[] {
  const now = new Date();
  const temp = clamp(drift(BASE_SENSORS.temperature.base, BASE_SENSORS.temperature.drift), 5, 45);
  const hum = clamp(drift(BASE_SENSORS.humidity.base, BASE_SENSORS.humidity.drift), 10, 100);
  const light = clamp(drift(BASE_SENSORS.light.base, BASE_SENSORS.light.drift), 0, 30000);
  const soil = clamp(drift(BASE_SENSORS.soilMoisture.base, BASE_SENSORS.soilMoisture.drift), 0, 100);
  const ph = clamp(drift(BASE_SENSORS.ph.base, BASE_SENSORS.ph.drift), 4.0, 9.0);
  const ec = clamp(drift(BASE_SENSORS.ec.base, BASE_SENSORS.ec.drift), 0, 6.0);

  return [
    {
      id: "temperature",
      label: "Temperature",
      value: temp,
      unit: "°C",
      status: getSensorStatus("temperature", temp),
      descriptor: getSensorDescriptor("temperature", temp),
      timestamp: now,
    },
    {
      id: "humidity",
      label: "Air Humidity",
      value: hum,
      unit: "%",
      status: getSensorStatus("humidity", hum),
      descriptor: getSensorDescriptor("humidity", hum),
      timestamp: now,
    },
    {
      id: "light",
      label: "Light Intensity",
      value: light,
      unit: "lux",
      status: getSensorStatus("light", light),
      descriptor: getSensorDescriptor("light", light),
      timestamp: now,
    },
    {
      id: "soilMoisture",
      label: "Soil Moisture",
      value: soil,
      unit: "%",
      status: getSensorStatus("soilMoisture", soil),
      descriptor: getSensorDescriptor("soilMoisture", soil),
      timestamp: now,
    },
    {
      id: "ph",
      label: "pH Level",
      value: ph,
      unit: "",
      status: getSensorStatus("ph", ph),
      descriptor: getSensorDescriptor("ph", ph),
      timestamp: now,
    },
    {
      id: "ec",
      label: "Conductivity (EC)",
      value: ec,
      unit: "mS/cm",
      status: getSensorStatus("ec", ec),
      descriptor: getSensorDescriptor("ec", ec),
      timestamp: now,
    },
  ];
}

const DEFAULT_DEVICES: DeviceState[] = [
  { id: "exhaust", name: "Exhaust Fan", iconName: "fan", mode: "AUTO", isRunning: true },
  { id: "ventilation", name: "Ventilation Fans", iconName: "fan-auto", mode: "AUTO", isRunning: false },
  { id: "pump", name: "Water Pump", iconName: "water-pump", mode: "AUTO", isRunning: false },
  { id: "lights", name: "Grow Lights", iconName: "lightbulb-on", mode: "AUTO", isRunning: true },
];

const AUTOMATION_RULES: AutomationRule[] = [
  { id: "r1", description: "Exhaust fan activates when temperature > 28°C", isActive: true },
  { id: "r2", description: "Water pump runs for 5 min when soil moisture < 45%", isActive: true },
  { id: "r3", description: "Grow lights on from 06:00–22:00 daily", isActive: true },
  { id: "r4", description: "Alert sent if pH drops below 5.5 or rises above 7.5", isActive: true },
  { id: "r5", description: "Ventilation fans on if humidity > 85%", isActive: false },
];

const DEFAULT_ALERTS: AlertItem[] = [
  {
    id: "a1",
    message: "Temperature exceeded 28°C — Exhaust fan automatically activated",
    severity: "warning",
    timestamp: new Date(Date.now() - 8 * 60 * 1000),
    sensor: "temperature",
  },
  {
    id: "a2",
    message: "Grow lights turned on — Scheduled daily cycle started at 06:00",
    severity: "info",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    sensor: "lights",
  },
  {
    id: "a3",
    message: "Soil moisture recovered to 63% after irrigation cycle",
    severity: "info",
    timestamp: new Date(Date.now() - 3.5 * 60 * 60 * 1000),
    sensor: "soilMoisture",
  },
  {
    id: "a4",
    message: "EC level was 3.2 mS/cm — Diluted nutrient solution",
    severity: "warning",
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
    sensor: "ec",
  },
  {
    id: "a5",
    message: "System startup — All sensors online",
    severity: "info",
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
  },
];

function deriveDeviceRunning(device: DeviceState, sensors: SensorReading[]): boolean {
  if (device.mode === "FORCE_ON") return true;
  if (device.mode === "FORCE_OFF") return false;
  const temp = sensors.find((s) => s.id === "temperature")?.value ?? 25;
  const hum = sensors.find((s) => s.id === "humidity")?.value ?? 70;
  const soil = sensors.find((s) => s.id === "soilMoisture")?.value ?? 65;
  if (device.id === "exhaust") return temp > 27;
  if (device.id === "ventilation") return hum > 82;
  if (device.id === "pump") return soil < 50;
  if (device.id === "lights") {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 22;
  }
  return false;
}

const HISTORY_MAX = 30;

function buildInitialHistory(): Record<string, number[]> {
  const history: Record<string, number[]> = {
    temperature: [],
    humidity: [],
    light: [],
    soilMoisture: [],
    ph: [],
    ec: [],
  };
  for (let i = 0; i < 15; i++) {
    const s = buildSensors();
    for (const r of s) {
      history[r.id].push(r.value);
    }
  }
  return history;
}

export function GreenhouseProvider({ children }: { children: React.ReactNode }) {
  const [sensors, setSensors] = useState<SensorReading[]>(buildSensors);
  const [sensorHistory, setSensorHistory] = useState<Record<string, number[]>>(buildInitialHistory);
  const [devices, setDevices] = useState<DeviceState[]>(DEFAULT_DEVICES);
  const [isOnline, setIsOnline] = useState(true);
  const [isUsingCached, setIsUsingCached] = useState(false);
  const [alerts, setAlerts] = useState<AlertItem[]>(DEFAULT_ALERTS);
  const prevSensorRef = useRef<SensorReading[]>(sensors);

  useEffect(() => {
    (async () => {
      try {
        const storedDevices = await AsyncStorage.getItem(DEVICES_KEY);
        if (storedDevices) {
          setDevices(JSON.parse(storedDevices));
        }
        const storedAlerts = await AsyncStorage.getItem(ALERTS_KEY);
        if (storedAlerts) {
          const parsed: AlertItem[] = JSON.parse(storedAlerts).map(
            (a: AlertItem & { timestamp: string }) => ({ ...a, timestamp: new Date(a.timestamp) })
          );
          if (parsed.length > 0) setAlerts(parsed);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const newSensors = buildSensors();
      setSensors(newSensors);
      prevSensorRef.current = newSensors;

      setSensorHistory((prev) => {
        const next: Record<string, number[]> = {};
        for (const s of newSensors) {
          const existing = prev[s.id] ?? [];
          next[s.id] = [...existing, s.value].slice(-HISTORY_MAX);
        }
        return next;
      });

      setDevices((prev) =>
        prev.map((d) => ({ ...d, isRunning: deriveDeviceRunning(d, newSensors) }))
      );

      const criticals = newSensors.filter((s) => s.status === "critical");
      if (criticals.length > 0) {
        const newAlerts: AlertItem[] = criticals.map((s) => ({
          id: `auto_${s.id}_${Date.now()}`,
          message: `${s.label} is at critical level — ${s.descriptor}`,
          severity: "critical" as const,
          timestamp: new Date(),
          sensor: s.id,
        }));
        setAlerts((prev) => {
          const combined = [...newAlerts, ...prev].slice(0, 50);
          AsyncStorage.setItem(ALERTS_KEY, JSON.stringify(combined)).catch(() => {});
          return combined;
        });
      }
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const connectivityInterval = setInterval(async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const res = await fetch("/api/healthz", { signal: controller.signal });
        clearTimeout(timeoutId);
        const online = res.ok;
        setIsOnline(online);
        setIsUsingCached(!online);
      } catch {
        setIsOnline(false);
        setIsUsingCached(true);
      }
    }, 30000);

    return () => clearInterval(connectivityInterval);
  }, []);

  const setDeviceMode = useCallback((deviceId: string, mode: DeviceMode) => {
    setDevices((prev) => {
      const next = prev.map((d) => {
        if (d.id !== deviceId) return d;
        const isRunning = deriveDeviceRunning({ ...d, mode }, prevSensorRef.current);
        return { ...d, mode, isRunning };
      });
      AsyncStorage.setItem(DEVICES_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });

    const device = devices.find((d) => d.id === deviceId);
    if (device) {
      const newAlert: AlertItem = {
        id: `manual_${deviceId}_${Date.now()}`,
        message: `${device.name} manually set to ${mode === "AUTO" ? "AUTO" : mode === "FORCE_ON" ? "FORCE ON" : "FORCE OFF"}`,
        severity: "info",
        timestamp: new Date(),
      };
      setAlerts((prev) => {
        const next = [newAlert, ...prev].slice(0, 50);
        AsyncStorage.setItem(ALERTS_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    }
  }, [devices]);

  const clearAlerts = useCallback(() => {
    setAlerts([]);
    AsyncStorage.removeItem(ALERTS_KEY).catch(() => {});
  }, []);

  return (
    <GreenhouseContext.Provider
      value={{
        sensors,
        sensorHistory,
        devices,
        isOnline,
        isUsingCached,
        alerts,
        automationRules: AUTOMATION_RULES,
        setDeviceMode,
        clearAlerts,
      }}
    >
      {children}
    </GreenhouseContext.Provider>
  );
}

export function useGreenhouse(): GreenhouseContextType {
  const ctx = useContext(GreenhouseContext);
  if (!ctx) throw new Error("useGreenhouse must be used inside GreenhouseProvider");
  return ctx;
}

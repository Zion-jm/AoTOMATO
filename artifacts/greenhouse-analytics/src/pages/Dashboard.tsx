import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetSensorsCurrent,
  useGetSensorsSummary,
  useGetSensorHistory,
  useGetDevicesAnalytics,
  useGetAlertsRecent,
  useGetAlertsSummary,
} from "@workspace/api-client-react";
import { CSVLink } from "react-csv";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from "recharts";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RefreshCw, ChevronDown, Check, Sun, Moon, Printer, Download, Leaf,
  AlertTriangle, Info, CheckCircle2, Activity, Clock, Zap
} from "lucide-react";

// --- CONSTANTS ---
const CHART_COLORS = {
  blue: "#0079F2",
  purple: "#795EFF",
  green: "#009118",
  red: "#A60808",
  amber: "#d97706",
  pink: "#ec4899",
};

const STATUS_COLORS = {
  optimal: "#16a34a",
  warning: "#d97706",
  critical: "#dc2626",
  info: "#3b82f6"
};

const DATA_SOURCES = ["App DB", "IoT Core"];

const INTERVAL_OPTIONS = [
  { label: "Every 5 min", ms: 5 * 60 * 1000 },
  { label: "Every 15 min", ms: 15 * 60 * 1000 },
  { label: "Every 1 hour", ms: 60 * 60 * 1000 },
  { label: "Every 24 hours", ms: 24 * 60 * 60 * 1000 },
];

const SENSOR_IDS = ["temperature", "humidity", "light", "soilMoisture", "ph", "ec"];

// --- UTILS ---
function parseLocalDate(dateStr: string): Date {
  const d = new Date(dateStr);
  return d;
}

function formatDate(dateStr: string, fmt = "MMM d, HH:mm"): string {
  try {
    return format(parseLocalDate(dateStr), fmt);
  } catch {
    return dateStr;
  }
}

// --- SUB-COMPONENTS ---
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white/95 dark:bg-zinc-900/95 p-3 rounded-md shadow-lg border border-zinc-200 dark:border-zinc-800 text-[13px] text-zinc-900 dark:text-zinc-100">
      <div className="font-medium mb-1">{label}</div>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 mt-1">
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-zinc-600 dark:text-zinc-400">{entry.name}</span>
          <span className="ml-auto font-semibold">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

function CustomLegend({ payload }: any) {
  if (!payload || payload.length === 0) return null;
  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-[13px] mt-2">
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-zinc-600 dark:text-zinc-400">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

function SensorChartCard({ sensorId, label, unit, range, isDark }: { sensorId: string; label: string; unit: string; range: string; isDark: boolean }) {
  const { data, isLoading, isFetching } = useGetSensorHistory(sensorId, range);
  const loading = isLoading || isFetching;
  
  const gridColor = isDark ? "rgba(255,255,255,0.08)" : "#e5e5e5";
  const tickColor = isDark ? "#98999C" : "#71717a";

  const historyData = data?.data || [];

  return (
    <Card>
      <CardHeader className="px-4 pt-4 pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">{label} History</CardTitle>
        {!loading && historyData.length > 0 && (
          <CSVLink
            data={historyData}
            filename={`${sensorId}-history-${range}.csv`}
            className="print:hidden flex items-center justify-center w-[26px] h-[26px] rounded-[6px] transition-colors hover:opacity-80"
            style={{ backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#F0F1F2", color: isDark ? "#c8c9cc" : "#4b5563" }}
            aria-label="Export chart data as CSV"
          >
            <Download className="w-3.5 h-3.5" />
          </CSVLink>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="w-full h-[300px]" />
        ) : historyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300} debounce={0}>
            <AreaChart data={historyData}>
              <defs>
                <linearGradient id={`color-${sensorId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART_COLORS.green} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={CHART_COLORS.green} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={(val) => formatDate(val, range === "24h" ? "HH:mm" : "MMM d")} 
                tick={{ fontSize: 12, fill: tickColor }} 
                stroke={tickColor} 
              />
              <YAxis 
                tickFormatter={(val) => `${val}${unit}`} 
                tick={{ fontSize: 12, fill: tickColor }} 
                stroke={tickColor} 
                domain={['auto', 'auto']}
              />
              <Tooltip 
                labelFormatter={(label) => formatDate(label as string, "MMM d, yyyy HH:mm")}
                content={<CustomTooltip />} 
                isAnimationActive={false} 
                cursor={{ fill: 'rgba(0,0,0,0.05)', stroke: 'none' }} 
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                name={label} 
                stroke={CHART_COLORS.green} 
                fill={`url(#color-${sensorId})`} 
                strokeWidth={2} 
                isAnimationActive={false} 
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-[300px] flex items-center justify-center text-muted-foreground text-sm">
            No data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// --- MAIN COMPONENT ---
export default function Dashboard() {
  const queryClient = useQueryClient();

  // State
  const [isDark, setIsDark] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedIntervalMs, setSelectedIntervalMs] = useState(5 * 60 * 1000);
  const [chartRange, setChartRange] = useState("24h");
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Queries
  const sensorsCurrent = useGetSensorsCurrent();
  const sensorsSummary = useGetSensorsSummary();
  const devices = useGetDevicesAnalytics();
  const alertsRecent = useGetAlertsRecent();
  const alertsSummary = useGetAlertsSummary();

  const loading = 
    sensorsCurrent.isLoading || sensorsCurrent.isFetching ||
    sensorsSummary.isLoading || sensorsSummary.isFetching ||
    devices.isLoading || devices.isFetching ||
    alertsRecent.isLoading || alertsRecent.isFetching ||
    alertsSummary.isLoading || alertsSummary.isFetching;

  // Effects
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (loading) {
      setIsSpinning(true);
    } else {
      const t = setTimeout(() => setIsSpinning(false), 600);
      return () => clearTimeout(t);
    }
  }, [loading]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      handleRefresh();
    }, selectedIntervalMs);
    return () => clearInterval(interval);
  }, [autoRefresh, selectedIntervalMs]);

  // Handlers
  const handleRefresh = () => {
    queryClient.invalidateQueries();
  };

  // Derived Data
  const lastRefreshed = sensorsCurrent.dataUpdatedAt
    ? (() => {
        const d = new Date(sensorsCurrent.dataUpdatedAt);
        const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();
        const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        return `${time} on ${date}`;
      })()
    : null;

  const currentReadings = sensorsCurrent.data || [];
  const summaries = sensorsSummary.data || [];
  const devs = devices.data || [];
  const recAlerts = alertsRecent.data || [];
  const aSummary = alertsSummary.data;

  // KPI Calculations
  const optimalCount = currentReadings.filter(r => r.status === 'optimal').length;
  const healthScore = currentReadings.length > 0 ? Math.round((optimalCount / currentReadings.length) * 100) : 0;
  
  const activeAlertsCount = aSummary ? aSummary.criticalCount + aSummary.warningCount : 0;
  const runningDevices = devs.filter(d => d.isRunning).length;
  const totalAlertsWeek = aSummary?.totalWeek || 0;

  // Chart data preps
  const gridColor = isDark ? "rgba(255,255,255,0.08)" : "#e5e5e5";
  const tickColor = isDark ? "#98999C" : "#71717a";

  const deviceChartData = devs.map(d => ({
    name: d.name,
    today: d.todayRuntimeHours,
    week: d.weekRuntimeHours
  }));

  const alertDonutData = [
    { name: "Critical", value: aSummary?.criticalCount || 0 },
    { name: "Warning", value: aSummary?.warningCount || 0 },
    { name: "Info", value: aSummary?.infoCount || 0 }
  ].filter(d => d.value > 0);

  const alertDonutColors = [STATUS_COLORS.critical, STATUS_COLORS.warning, STATUS_COLORS.info];

  const alertBarData = aSummary?.bySensor?.map(s => ({
    sensor: s.label,
    critical: s.critical,
    warning: s.warning,
    info: s.info
  })) || [];

  return (
    <div className="min-h-screen bg-background px-5 py-4 pt-[32px] pb-[32px] pl-[24px] pr-[24px]">
      <div className="max-w-[1400px] mx-auto">

        {/* ── Header ── */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="pt-2">
            <div className="flex items-center gap-2">
              <Leaf className="w-8 h-8 text-primary" />
              <h1 className="font-bold text-[32px]">auTOMATO Analytics</h1>
            </div>
            <p className="text-muted-foreground mt-1.5 text-[14px]">Real-time greenhouse monitoring and insights</p>
            {DATA_SOURCES.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-[12px] text-muted-foreground shrink-0">Data Sources:</span>
                {DATA_SOURCES.map((source) => (
                  <span
                    key={source}
                    className="text-[12px] font-bold rounded px-2 py-0.5 truncate print:!bg-[rgb(229,231,235)] print:!text-[rgb(75,85,99)]"
                    title={source}
                    style={{
                      maxWidth: "20ch",
                      backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgb(229, 231, 235)",
                      color: isDark ? "#c8c9cc" : "rgb(75, 85, 99)",
                    }}
                  >
                    {source}
                  </span>
                ))}
              </div>
            )}
            {lastRefreshed && <p className="text-[12px] text-muted-foreground mt-3">Last refresh: {lastRefreshed}</p>}
          </div>
          
          <div className="flex items-center gap-3 pt-2 print:hidden">
            <button
              onClick={() => window.print()}
              className="flex items-center justify-center w-[26px] h-[26px] rounded-[6px] transition-colors"
              style={{ backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#F0F1F2", color: isDark ? "#c8c9cc" : "#4b5563" }}
              title="Export to PDF"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsDark((d) => !d)}
              className="flex items-center justify-center w-[26px] h-[26px] rounded-[6px] transition-colors"
              style={{ backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#F0F1F2", color: isDark ? "#c8c9cc" : "#4b5563" }}
              title="Toggle Dark Mode"
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            <div className="relative" ref={dropdownRef}>
              <div
                className="flex items-center rounded-[6px] overflow-hidden h-[26px] text-[12px]"
                style={{ backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#F0F1F2", color: isDark ? "#c8c9cc" : "#4b5563" }}
              >
                <button onClick={handleRefresh} disabled={loading} className="flex items-center gap-1 px-2 h-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-50">
                  <RefreshCw className={`w-3.5 h-3.5 ${isSpinning ? "animate-spin" : ""}`} />
                  Refresh
                </button>
                <div className="w-px h-4 shrink-0" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)" }} />
                <button onClick={() => setDropdownOpen((o) => !o)} className="flex items-center justify-center px-1.5 h-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {dropdownOpen && (
                <div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md shadow-lg z-50 py-1 text-sm overflow-hidden">
                  <div className="px-3 py-2 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800">
                    <span className="font-medium">Auto-refresh</span>
                    <button 
                      className={`w-8 h-4 rounded-full transition-colors relative ${autoRefresh ? 'bg-primary' : 'bg-zinc-300 dark:bg-zinc-700'}`}
                      onClick={() => setAutoRefresh(!autoRefresh)}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${autoRefresh ? 'translate-x-4' : ''}`} />
                    </button>
                  </div>
                  <div className="py-1">
                    {INTERVAL_OPTIONS.map((opt) => (
                      <button
                        key={opt.label}
                        disabled={!autoRefresh}
                        className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800 ${!autoRefresh ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => {
                          setSelectedIntervalMs(opt.ms);
                          setDropdownOpen(false);
                        }}
                      >
                        {opt.label}
                        {selectedIntervalMs === opt.ms && <Check className="w-4 h-4 text-primary" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── KPI Row ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              {loading && !currentReadings.length ? (
                <>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-32" />
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5"><Activity className="w-4 h-4" /> Health Score</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: healthScore >= 80 ? STATUS_COLORS.optimal : healthScore >= 50 ? STATUS_COLORS.warning : STATUS_COLORS.critical }}>
                    {healthScore}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">sensors in optimal range</p>
                </>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              {loading && !aSummary ? (
                <>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-32" />
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Active Alerts</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: activeAlertsCount > 0 ? STATUS_COLORS.critical : CHART_COLORS.blue }}>
                    {activeAlertsCount}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">critical & warning</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              {loading && !devs.length ? (
                <>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-32" />
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5"><Zap className="w-4 h-4" /> Active Devices</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: CHART_COLORS.blue }}>
                    {runningDevices} <span className="text-sm font-normal text-muted-foreground">/ {devs.length}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">currently running</p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              {loading && !aSummary ? (
                <>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-32" />
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground flex items-center gap-1.5"><Clock className="w-4 h-4" /> Total Alerts</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: CHART_COLORS.blue }}>
                    {totalAlertsWeek}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">this week</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Section 1: Sensor Overview ── */}
        <h2 className="text-xl font-bold mb-4 mt-8">Sensor Overview (7d)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {summaries.map(summary => {
            const current = currentReadings.find(r => r.id === summary.id);
            const statusColor = current?.status === 'optimal' ? STATUS_COLORS.optimal : current?.status === 'warning' ? STATUS_COLORS.warning : STATUS_COLORS.critical;
            
            return (
              <Card key={summary.id}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-semibold text-base">{summary.label}</span>
                    {current && (
                      <Badge style={{ backgroundColor: statusColor, color: '#fff' }} className="font-medium shadow-none border-none">
                        {current.value} {summary.unit}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex justify-between text-sm text-muted-foreground mb-4">
                    <div><span className="text-xs block text-zinc-400">Min</span> {summary.min}{summary.unit}</div>
                    <div className="text-center"><span className="text-xs block text-zinc-400">Avg</span> {summary.avg.toFixed(1)}{summary.unit}</div>
                    <div className="text-right"><span className="text-xs block text-zinc-400">Max</span> {summary.max}{summary.unit}</div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Status Distribution</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden flex bg-zinc-100 dark:bg-zinc-800">
                      <div style={{ width: `${summary.pctOptimal}%`, backgroundColor: STATUS_COLORS.optimal }} title={`Optimal: ${summary.pctOptimal}%`} />
                      <div style={{ width: `${summary.pctWarning}%`, backgroundColor: STATUS_COLORS.warning }} title={`Warning: ${summary.pctWarning}%`} />
                      <div style={{ width: `${summary.pctCritical}%`, backgroundColor: STATUS_COLORS.critical }} title={`Critical: ${summary.pctCritical}%`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* ── Section 2: Time Series ── */}
        <div className="flex items-center justify-between mb-4 mt-8">
          <h2 className="text-xl font-bold">Historical Trends</h2>
          <Tabs value={chartRange} onValueChange={setChartRange} className="w-[200px]">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="24h">24h</TabsTrigger>
              <TabsTrigger value="7d">7d</TabsTrigger>
              <TabsTrigger value="30d">30d</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
          {SENSOR_IDS.map(sensorId => {
            const summary = summaries.find(s => s.id === sensorId);
            return (
              <SensorChartCard 
                key={sensorId} 
                sensorId={sensorId} 
                label={summary?.label || sensorId} 
                unit={summary?.unit || ""} 
                range={chartRange} 
                isDark={isDark} 
              />
            );
          })}
        </div>

        {/* ── Section 3: Device Analytics ── */}
        <h2 className="text-xl font-bold mb-4 mt-8">Device Analytics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-4">
          {devs.map(device => (
            <Card key={device.id}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold">{device.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">{device.mode}</span>
                    <span className={`w-2.5 h-2.5 rounded-full ${device.isRunning ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm mt-4">
                  <div>
                    <span className="block text-xs text-muted-foreground">Today</span>
                    <span className="font-medium">{device.todayRuntimeHours.toFixed(1)}h</span>
                  </div>
                  <div>
                    <span className="block text-xs text-muted-foreground">This Week</span>
                    <span className="font-medium">{device.weekRuntimeHours.toFixed(1)}h</span>
                  </div>
                  <div className="col-span-2 mt-2">
                    <span className="block text-xs text-muted-foreground">Activations</span>
                    <span className="font-medium">{device.activationCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mb-8">
          <CardHeader className="px-4 pt-4 pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Runtime Comparison (Hours)</CardTitle>
            {!loading && deviceChartData.length > 0 && (
              <CSVLink
                data={deviceChartData}
                filename="device-runtimes.csv"
                className="print:hidden flex items-center justify-center w-[26px] h-[26px] rounded-[6px] transition-colors hover:opacity-80"
                style={{ backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#F0F1F2", color: isDark ? "#c8c9cc" : "#4b5563" }}
                aria-label="Export chart data as CSV"
              >
                <Download className="w-3.5 h-3.5" />
              </CSVLink>
            )}
          </CardHeader>
          <CardContent>
            {loading ? <Skeleton className="w-full h-[300px]" /> : (
              <ResponsiveContainer width="100%" height={300} debounce={0}>
                <BarChart data={deviceChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: tickColor }} stroke={tickColor} />
                  <YAxis tick={{ fontSize: 12, fill: tickColor }} stroke={tickColor} />
                  <Tooltip content={<CustomTooltip />} isAnimationActive={false} cursor={false} />
                  <Legend content={<CustomLegend />} />
                  <Bar dataKey="today" name="Today" fill={CHART_COLORS.blue} fillOpacity={0.8} radius={[2, 2, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="week" name="This Week" fill={CHART_COLORS.purple} fillOpacity={0.8} radius={[2, 2, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* ── Section 4: Alerts ── */}
        <h2 className="text-xl font-bold mb-4 mt-8">Alerts & Notifications</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          
          <Card className="lg:col-span-1">
            <CardHeader className="px-4 pt-4 pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Severity Breakdown</CardTitle>
              {!loading && alertDonutData.length > 0 && (
                <CSVLink
                  data={alertDonutData}
                  filename="alerts-severity.csv"
                  className="print:hidden flex items-center justify-center w-[26px] h-[26px] rounded-[6px] transition-colors hover:opacity-80"
                  style={{ backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#F0F1F2", color: isDark ? "#c8c9cc" : "#4b5563" }}
                >
                  <Download className="w-3.5 h-3.5" />
                </CSVLink>
              )}
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="w-full h-[250px]" /> : alertDonutData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250} debounce={0}>
                  <PieChart>
                    <Pie data={alertDonutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} cornerRadius={2} paddingAngle={2} isAnimationActive={false} stroke="none">
                      {alertDonutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={alertDonutColors[index % alertDonutColors.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} isAnimationActive={false} />
                    <Legend content={<CustomLegend />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-[250px] flex flex-col items-center justify-center text-muted-foreground text-sm">
                  <CheckCircle2 className="w-8 h-8 text-green-500 mb-2 opacity-50" />
                  No active alerts
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="px-4 pt-4 pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Alerts by Sensor</CardTitle>
              {!loading && alertBarData.length > 0 && (
                <CSVLink
                  data={alertBarData}
                  filename="alerts-by-sensor.csv"
                  className="print:hidden flex items-center justify-center w-[26px] h-[26px] rounded-[6px] transition-colors hover:opacity-80"
                  style={{ backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "#F0F1F2", color: isDark ? "#c8c9cc" : "#4b5563" }}
                >
                  <Download className="w-3.5 h-3.5" />
                </CSVLink>
              )}
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="w-full h-[250px]" /> : alertBarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250} debounce={0}>
                  <BarChart data={alertBarData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="sensor" tick={{ fontSize: 12, fill: tickColor }} stroke={tickColor} />
                    <YAxis tick={{ fontSize: 12, fill: tickColor }} stroke={tickColor} />
                    <Tooltip content={<CustomTooltip />} isAnimationActive={false} cursor={false} />
                    <Legend content={<CustomLegend />} />
                    <Bar dataKey="critical" stackId="a" name="Critical" fill={STATUS_COLORS.critical} isAnimationActive={false} />
                    <Bar dataKey="warning" stackId="a" name="Warning" fill={STATUS_COLORS.warning} isAnimationActive={false} />
                    <Bar dataKey="info" stackId="a" name="Info" fill={STATUS_COLORS.info} isAnimationActive={false} radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                  No alerts history
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-4">
          <CardHeader className="px-4 pt-4 pb-2 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3 pt-2">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : recAlerts.length > 0 ? (
              <div className="space-y-0 border rounded-md overflow-hidden mt-2 divide-y divide-border">
                {recAlerts.slice(0, 10).map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-3 bg-white dark:bg-card hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-full bg-opacity-10 
                        ${alert.severity === 'critical' ? 'bg-red-500 text-red-600 dark:text-red-400' : 
                          alert.severity === 'warning' ? 'bg-amber-500 text-amber-600 dark:text-amber-400' : 
                          'bg-blue-500 text-blue-600 dark:text-blue-400'}`}
                      >
                        {alert.severity === 'critical' ? <AlertTriangle className="w-4 h-4" /> : 
                         alert.severity === 'warning' ? <AlertTriangle className="w-4 h-4" /> : 
                         <Info className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{alert.message}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{alert.sensor ? `Sensor: ${alert.sensor}` : 'System'}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(alert.timestamp, "MMM d, HH:mm")}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No recent alerts
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

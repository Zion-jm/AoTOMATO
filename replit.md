# auTOMATO

A smart greenhouse monitoring mobile app that displays live sensor readings, controls actuators, streams the camera feed, and surfaces alerts — all from your phone.

## Run & Operate

- `pnpm --filter @workspace/autotomato run dev` — start the Expo dev server (scan QR with Expo Go)
- `pnpm --filter @workspace/api-server run dev` — start the API server (port 8080, health check at `/api/healthz`)
- `pnpm --filter @workspace/autotomato run typecheck` — typecheck the mobile app
- `pnpm run typecheck` — full typecheck across all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo SDK ~54, React Native 0.81.5, Expo Router v6 (file-based routing)
- API: Express 5 (port 8080)
- State: React Context (`GreenhouseContext`) + AsyncStorage for persistence
- Fonts: Inter via `@expo-google-fonts/inter`
- Icons: `@expo/vector-icons` (MaterialCommunityIcons)
- Camera: `expo-camera@^17.0.10`

## Where things live

```
artifacts/autotomato/
  app/
    _layout.tsx              — root layout, wraps with GreenhouseProvider
    (tabs)/
      _layout.tsx            — 4-tab bottom nav (Dashboard, Controls, Camera, Alerts)
      index.tsx              — Dashboard tab
      controls.tsx           — Device controls tab
      camera.tsx             — Camera feed + snapshot gallery tab
      alerts.tsx             — Alerts & logs tab
  components/
    StatusBanner.tsx         — animated top banner (optimal / warning / critical / offline)
    SensorCard.tsx           — individual sensor reading card
    ActuatorControl.tsx      — 3-way AUTO / FORCE ON / FORCE OFF toggle
    ConfirmModal.tsx         — confirmation modal for force-override actions
    ConnectivityBadge.tsx    — LIVE / OFFLINE badge in header
  contexts/
    GreenhouseContext.tsx    — source of truth: sensors, devices, alerts, connectivity
  constants/
    colors.ts                — design tokens (dark greenhouse theme, both light+dark keys)
  hooks/
    useColors.ts             — returns active palette based on device color scheme
```

## Architecture decisions

- **Simulated sensor data** — `GreenhouseContext` generates realistic sensor readings every 6 seconds via `setInterval`. Swap the `buildSensors` / tick logic for real API/WebSocket calls to connect live hardware.
- **Offline/cached mode** — connectivity is detected by polling `GET /api/healthz` every 30 s. When offline, sensors gray out and the status banner switches to an "offline" state showing cached values from AsyncStorage.
- **AsyncStorage persistence** — device modes (AUTO/FORCE_ON/FORCE_OFF) and the alert log are persisted across app restarts via `@react-native-async-storage/async-storage`.
- **`useColors` accesses themes directly** — both `light` and `dark` keys are defined in `constants/colors.ts`, so `useColors.ts` reads `colors.dark` / `colors.light` directly without any type cast. Do not remove either key.
- **`borderOpacity` is not a valid RN style** — use `opacity` on the animated `View` instead; `borderOpacity` causes a runtime crash on native.

## Product

- **Dashboard** — at-a-glance status banner (optimal / warning / critical / offline) + 6 live sensor cards: Temperature, Air Humidity, Light Intensity, Soil Moisture, pH Level, EC Conductivity. Cards update every 6 s with color-coded borders.
- **Controls** — 4 actuators (Exhaust Fan, Ventilation Fans, Water Pump, Grow Lights) each with a 3-way toggle. Forcing ON or OFF shows a confirmation modal to prevent accidental changes.
- **Camera** — live camera feed with a pulsing LIVE badge; tap Snapshot to capture and save to an in-app gallery.
- **Alerts & Logs** — chronological feed of threshold breaches and system events, color-coded by severity (info / warning / critical) with a clear-all action.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- **`expo-camera` must be in `artifacts/autotomato/package.json` `dependencies`**, not just the pnpm root. Run `pnpm --filter @workspace/autotomato install` after any package changes to ensure Metro can resolve it from `node_modules`.
- **Do not use `borderOpacity` as a style prop** in any `View` or `Animated.View` — it is not part of React Native's `ViewStyle` and causes a runtime crash on device.
- **`useColors.ts` expects both `light` and `dark` keys** in `constants/colors.ts`. Removing either key will break the hook at runtime.
- Web preview shows `useNativeDriver` and `shadow*` deprecation warnings — these are harmless web-only warnings and do not affect native builds.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `expo` skill for Expo/React Native conventions used in this project

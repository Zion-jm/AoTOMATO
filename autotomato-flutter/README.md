# auTOMATO — Flutter Version

Greenhouse monitoring app with GRiPS risk prediction system.
Built for the AuTOMATO Project, Polytechnic University of the Philippines, Lopez Campus.

---

## Setup (run these commands on your computer)

### Prerequisites
- Flutter SDK: https://flutter.dev/docs/get-started/install
- Android Studio (for Android emulator or APK builds)
- A connected Android phone OR an emulator running

### Steps

```bash
# 1. Create a new Flutter project (generates Android/iOS boilerplate)
flutter create autotomato --org com.autotomato

# 2. Enter the project folder
cd autotomato

# 3. Copy the lib/ folder and pubspec.yaml from this folder INTO the new project
#    (Replace the default ones)
#    On Windows:
xcopy /E /Y path\to\autotomato-flutter\lib lib\
copy path\to\autotomato-flutter\pubspec.yaml pubspec.yaml

#    On Mac/Linux:
cp -r path/to/autotomato-flutter/lib/* lib/
cp path/to/autotomato-flutter/pubspec.yaml pubspec.yaml

# 4. Install dependencies
flutter pub get

# 5. Run on connected device / emulator
flutter run

# 6. Build a release APK
flutter build apk --release
#    APK will be at: build/app/outputs/flutter-apk/app-release.apk
```

---

## Features

- **Dashboard** — live KPI cards, sensor sparkline cards, device status grid
- **Controls** — device on/off toggles, automation rules
- **Camera** — placeholder for camera feed integration
- **Alerts** — dismissible alert list with severity badges
- **Analytics (GRiPS)** — risk prediction, condition report paragraph, sensor strip

## Packages Used

| Package | Purpose |
|---|---|
| `provider` | State management (sensor simulation) |
| `fl_chart` | Sparkline charts on sensor cards |
| `google_fonts` | Inter font family |
| `shared_preferences` | Local storage |
| `intl` | Date/time formatting |

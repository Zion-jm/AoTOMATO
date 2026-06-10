import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import 'providers/greenhouse_provider.dart';
import 'screens/dashboard_screen.dart';
import 'screens/controls_screen.dart';
import 'screens/camera_screen.dart';
import 'screens/alerts_screen.dart';
import 'screens/analytics_screen.dart';
import 'theme/app_colors.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
  ));
  runApp(
    ChangeNotifierProvider(
      create: (_) => GreenhouseProvider(),
      child: const AutomataApp(),
    ),
  );
}

class AutomataApp extends StatelessWidget {
  const AutomataApp({super.key});

  @override
  Widget build(BuildContext context) {
    final base = ThemeData.dark();
    return MaterialApp(
      title: 'auTOMATO',
      debugShowCheckedModeBanner: false,
      theme: base.copyWith(
        useMaterial3: true,
        scaffoldBackgroundColor: AppColors.background,
        colorScheme: const ColorScheme.dark(
          primary: AppColors.primary,
          surface: AppColors.card,
          background: AppColors.background,
          onBackground: AppColors.foreground,
          onSurface: AppColors.foreground,
        ),
        textTheme: GoogleFonts.interTextTheme(base.textTheme).apply(
          bodyColor: AppColors.foreground,
          displayColor: AppColors.foreground,
        ),
        navigationBarTheme: NavigationBarThemeData(
          backgroundColor: AppColors.card,
          indicatorColor: AppColors.primary.withOpacity(0.2),
          labelTextStyle: MaterialStateProperty.all(
            GoogleFonts.inter(fontSize: 11, color: AppColors.mutedForeground),
          ),
          iconTheme: MaterialStateProperty.resolveWith((states) {
            if (states.contains(MaterialState.selected)) {
              return const IconThemeData(color: AppColors.primary);
            }
            return const IconThemeData(color: AppColors.mutedForeground);
          }),
        ),
        dividerColor: AppColors.border,
        cardColor: AppColors.card,
      ),
      home: const MainScaffold(),
    );
  }
}

class MainScaffold extends StatefulWidget {
  const MainScaffold({super.key});

  @override
  State<MainScaffold> createState() => _MainScaffoldState();
}

class _MainScaffoldState extends State<MainScaffold> {
  int _selectedIndex = 0;

  static const List<Widget> _screens = [
    DashboardScreen(),
    ControlsScreen(),
    CameraScreen(),
    AlertsScreen(),
    AnalyticsScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: IndexedStack(
        index: _selectedIndex,
        children: _screens,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _selectedIndex,
        onDestinationSelected: (i) => setState(() => _selectedIndex = i),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          NavigationDestination(
            icon: Icon(Icons.tune_outlined),
            selectedIcon: Icon(Icons.tune),
            label: 'Controls',
          ),
          NavigationDestination(
            icon: Icon(Icons.camera_alt_outlined),
            selectedIcon: Icon(Icons.camera_alt),
            label: 'Camera',
          ),
          NavigationDestination(
            icon: Icon(Icons.notifications_outlined),
            selectedIcon: Icon(Icons.notifications),
            label: 'Alerts',
          ),
          NavigationDestination(
            icon: Icon(Icons.analytics_outlined),
            selectedIcon: Icon(Icons.analytics),
            label: 'Analytics',
          ),
        ],
      ),
    );
  }
}

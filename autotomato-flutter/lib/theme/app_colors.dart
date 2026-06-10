import 'package:flutter/material.dart';

class AppColors {
  static const Color background = Color(0xFF0D1F11);
  static const Color card = Color(0xFF162018);
  static const Color primary = Color(0xFF4ADE80);
  static const Color optimal = Color(0xFF22C55E);
  static const Color warning = Color(0xFFFACC15);
  static const Color critical = Color(0xFFF87171);
  static const Color border = Color(0xFF2D4D31);
  static const Color mutedForeground = Color(0xFF6B8F6E);
  static const Color foreground = Color(0xFFF0FDF4);
  static const Color secondaryForeground = Color(0xFFBBF7D0);

  static Color statusColor(String status) {
    switch (status) {
      case 'optimal':
        return optimal;
      case 'warning':
        return warning;
      case 'critical':
        return critical;
      default:
        return mutedForeground;
    }
  }

  static Color sensorColor(String sensorId) {
    switch (sensorId) {
      case 'temperature':
        return const Color(0xFFFB923C);
      case 'humidity':
        return const Color(0xFF60A5FA);
      case 'light':
        return const Color(0xFFFACC15);
      case 'soilMoisture':
        return const Color(0xFF34D399);
      case 'ph':
        return const Color(0xFFA78BFA);
      case 'ec':
        return const Color(0xFFF472B6);
      default:
        return mutedForeground;
    }
  }
}

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../models/models.dart';
import '../theme/app_colors.dart';
import '../screens/sensor_detail_screen.dart';
import 'sparkline_chart.dart';

String formatSensorValue(String id, double value) {
  switch (id) {
    case 'temperature':
      return '${value.toStringAsFixed(1)}°C';
    case 'ph':
      return value.toStringAsFixed(2);
    case 'ec':
      return '${value.toStringAsFixed(2)} mS/cm';
    case 'light':
      return '${value.round()} lux';
    default:
      return '${value.round()}%';
  }
}

String sensorDisplayLabel(String id, String fallback) {
  switch (id) {
    case 'ec':
      return 'Nutrient Level';
    case 'light':
      return 'Light Level';
    case 'soilMoisture':
      return 'Soil Water';
    default:
      return fallback;
  }
}

IconData sensorIcon(String id) {
  switch (id) {
    case 'temperature':
      return Icons.thermostat;
    case 'humidity':
      return Icons.water_drop_outlined;
    case 'light':
      return Icons.wb_sunny_outlined;
    case 'soilMoisture':
      return Icons.opacity;
    case 'ph':
      return Icons.science_outlined;
    case 'ec':
      return Icons.bolt;
    default:
      return Icons.sensors;
  }
}

class SensorCard extends StatelessWidget {
  final Sensor sensor;
  final List<double> history;

  const SensorCard({
    super.key,
    required this.sensor,
    required this.history,
  });

  @override
  Widget build(BuildContext context) {
    final color = AppColors.sensorColor(sensor.id);
    final statusColor = AppColors.statusColor(sensor.statusLabel.toLowerCase());
    final displayLabel = sensorDisplayLabel(sensor.id, sensor.label);

    final stats = history.isEmpty
        ? (min: sensor.value, max: sensor.value, avg: sensor.value)
        : (
            min: history.reduce((a, b) => a < b ? a : b),
            max: history.reduce((a, b) => a > b ? a : b),
            avg: history.reduce((a, b) => a + b) / history.length,
          );

    final optimalPct = history.isEmpty
        ? 0
        : (history
                    .where((v) => v >= sensor.optimalMin && v <= sensor.optimalMax)
                    .length /
                history.length *
                100)
            .round();

    return GestureDetector(
      onTap: () => Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => SensorDetailScreen(sensor: sensor, history: history),
        ),
      ),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: statusColor == AppColors.optimal
                ? AppColors.border
                : statusColor.withOpacity(0.4),
          ),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: color.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(sensorIcon(sensor.id), size: 22, color: color),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          displayLabel,
                          style: GoogleFonts.inter(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: AppColors.foreground,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: statusColor.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            sensor.statusLabel,
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              fontWeight: FontWeight.w700,
                              color: statusColor,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        formatSensorValue(sensor.id, sensor.value),
                        style: GoogleFonts.inter(
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                          color: AppColors.foreground,
                        ),
                      ),
                      SparklineChart(
                        data: history.isEmpty ? [sensor.value] : history,
                        color: color,
                        height: 34,
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _statCol('MIN', formatSensorValue(sensor.id, stats.min)),
                  _statCol('AVG', formatSensorValue(sensor.id, stats.avg)),
                  _statCol('MAX', formatSensorValue(sensor.id, stats.max)),
                  _statCol('OPTIMAL', '$optimalPct%', color: AppColors.optimal),
                ],
              ),
              const SizedBox(height: 10),
              Stack(
                children: [
                  Container(
                    height: 4,
                    decoration: BoxDecoration(
                      color: AppColors.border,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  FractionallySizedBox(
                    widthFactor: (optimalPct / 100).clamp(0.0, 1.0),
                    child: Container(
                      height: 4,
                      decoration: BoxDecoration(
                        color: statusColor,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.08),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: color.withOpacity(0.2)),
                ),
                child: Row(
                  children: [
                    Icon(Icons.touch_app_outlined, size: 14, color: color),
                    const SizedBox(width: 6),
                    Text(
                      'Tap to see full history & details',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: color,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const Spacer(),
                    Icon(Icons.chevron_right, size: 16, color: color),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _statCol(String label, String value, {Color? color}) {
    return Column(
      children: [
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 10,
            fontWeight: FontWeight.w600,
            color: AppColors.mutedForeground,
            letterSpacing: 0.8,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: GoogleFonts.inter(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: color ?? AppColors.foreground,
          ),
        ),
      ],
    );
  }
}

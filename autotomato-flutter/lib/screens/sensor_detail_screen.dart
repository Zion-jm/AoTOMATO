import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../models/models.dart';
import '../theme/app_colors.dart';
import '../widgets/sensor_card.dart' show formatSensorValue, sensorIcon;

class SensorDetailScreen extends StatelessWidget {
  final Sensor sensor;
  final List<double> history;

  const SensorDetailScreen({
    super.key,
    required this.sensor,
    required this.history,
  });

  @override
  Widget build(BuildContext context) {
    final color = AppColors.sensorColor(sensor.id);
    final statusColor = AppColors.statusColor(sensor.statusLabel.toLowerCase());

    final min = history.isEmpty ? sensor.value : history.reduce((a, b) => a < b ? a : b);
    final max = history.isEmpty ? sensor.value : history.reduce((a, b) => a > b ? a : b);
    final avg = history.isEmpty
        ? sensor.value
        : history.reduce((a, b) => a + b) / history.length;

    final optimalCount = history.where((v) => v >= sensor.optimalMin && v <= sensor.optimalMax).length;
    final optimalPct = history.isEmpty ? 0 : (optimalCount / history.length * 100).round();

    final spots = history
        .asMap()
        .entries
        .map((e) => FlSpot(e.key.toDouble(), e.value))
        .toList();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.card,
        foregroundColor: AppColors.foreground,
        elevation: 0,
        title: Text(
          sensor.label,
          style: GoogleFonts.inter(
            fontSize: 17,
            fontWeight: FontWeight.w600,
            color: AppColors.foreground,
          ),
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, size: 18),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: statusColor.withOpacity(0.4)),
            ),
            child: Column(
              children: [
                Row(
                  children: [
                    Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: color.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Icon(sensorIcon(sensor.id), size: 26, color: color),
                    ),
                    const SizedBox(width: 14),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          formatSensorValue(sensor.id, sensor.value),
                          style: GoogleFonts.inter(
                            fontSize: 32,
                            fontWeight: FontWeight.w700,
                            color: AppColors.foreground,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: statusColor.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(7),
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
                  ],
                ),
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _statCol('MINIMUM', formatSensorValue(sensor.id, min)),
                    _statCol('AVERAGE', formatSensorValue(sensor.id, avg)),
                    _statCol('MAXIMUM', formatSensorValue(sensor.id, max)),
                    _statCol('OPTIMAL %', '$optimalPct%', color: AppColors.optimal),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'History',
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.foreground,
                  ),
                ),
                Text(
                  'Last ${history.length} readings',
                  style: GoogleFonts.inter(fontSize: 11, color: AppColors.mutedForeground),
                ),
                const SizedBox(height: 16),
                if (spots.length >= 2)
                  SizedBox(
                    height: 160,
                    child: LineChart(
                      LineChartData(
                        gridData: FlGridData(
                          show: true,
                          horizontalInterval: (max - min) / 4,
                          getDrawingHorizontalLine: (_) => FlLine(
                            color: AppColors.border,
                            strokeWidth: 1,
                          ),
                          drawVerticalLine: false,
                        ),
                        titlesData: FlTitlesData(
                          show: true,
                          leftTitles: AxisTitles(
                            sideTitles: SideTitles(
                              showTitles: true,
                              reservedSize: 44,
                              getTitlesWidget: (v, _) => Text(
                                formatSensorValue(sensor.id, v),
                                style: GoogleFonts.inter(
                                    fontSize: 9, color: AppColors.mutedForeground),
                              ),
                            ),
                          ),
                          bottomTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                          rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                          topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                        ),
                        borderData: FlBorderData(show: false),
                        lineTouchData: LineTouchData(
                          touchTooltipData: LineTouchTooltipData(
                            getTooltipColor: (_) => AppColors.card,
                            getTooltipItems: (items) => items.map((item) => LineTooltipItem(
                              formatSensorValue(sensor.id, item.y),
                              GoogleFonts.inter(color: color, fontSize: 12, fontWeight: FontWeight.w600),
                            )).toList(),
                          ),
                        ),
                        lineBarsData: [
                          LineChartBarData(
                            spots: spots,
                            isCurved: true,
                            color: color,
                            barWidth: 2.5,
                            dotData: const FlDotData(show: false),
                            belowBarData: BarAreaData(
                              show: true,
                              color: color.withOpacity(0.08),
                            ),
                          ),
                          LineChartBarData(
                            spots: spots.map((s) => FlSpot(s.x, sensor.optimalMin)).toList(),
                            isCurved: false,
                            color: AppColors.optimal.withOpacity(0.4),
                            barWidth: 1,
                            dotData: const FlDotData(show: false),
                            dashArray: [4, 4],
                          ),
                          LineChartBarData(
                            spots: spots.map((s) => FlSpot(s.x, sensor.optimalMax)).toList(),
                            isCurved: false,
                            color: AppColors.optimal.withOpacity(0.4),
                            barWidth: 1,
                            dotData: const FlDotData(show: false),
                            dashArray: [4, 4],
                          ),
                        ],
                      ),
                      duration: const Duration(milliseconds: 250),
                    ),
                  )
                else
                  Center(
                    child: Text(
                      'Not enough data',
                      style: GoogleFonts.inter(color: AppColors.mutedForeground),
                    ),
                  ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    _legendDot(color, 'Sensor reading'),
                    const SizedBox(width: 14),
                    _legendDot(AppColors.optimal.withOpacity(0.6), 'Optimal range'),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.card,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Optimal Range',
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.foreground,
                  ),
                ),
                const SizedBox(height: 12),
                _rangeRow('Optimal minimum', formatSensorValue(sensor.id, sensor.optimalMin), AppColors.optimal),
                _rangeRow('Optimal maximum', formatSensorValue(sensor.id, sensor.optimalMax), AppColors.optimal),
                _rangeRow('Current value', formatSensorValue(sensor.id, sensor.value), statusColor),
                _rangeRow('Status', sensor.statusLabel, statusColor),
              ],
            ),
          ),
          const SizedBox(height: 80),
        ],
      ),
    );
  }

  Widget _statCol(String label, String value, {Color? color}) {
    return Column(
      children: [
        Text(label,
            style: GoogleFonts.inter(
                fontSize: 9,
                fontWeight: FontWeight.w600,
                color: AppColors.mutedForeground,
                letterSpacing: 0.8)),
        const SizedBox(height: 3),
        Text(value,
            style: GoogleFonts.inter(
                fontSize: 13, fontWeight: FontWeight.w700, color: color ?? AppColors.foreground)),
      ],
    );
  }

  Widget _legendDot(Color color, String label) {
    return Row(
      children: [
        Container(
          width: 12,
          height: 3,
          decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(2)),
        ),
        const SizedBox(width: 6),
        Text(label,
            style: GoogleFonts.inter(fontSize: 10, color: AppColors.mutedForeground)),
      ],
    );
  }

  Widget _rangeRow(String label, String value, Color valueColor) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label,
              style: GoogleFonts.inter(fontSize: 13, color: AppColors.mutedForeground)),
          Text(value,
              style: GoogleFonts.inter(
                  fontSize: 13, fontWeight: FontWeight.w600, color: valueColor)),
        ],
      ),
    );
  }
}

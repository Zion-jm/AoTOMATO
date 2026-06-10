import 'dart:math';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../models/models.dart';
import '../theme/app_colors.dart';
import '../widgets/sensor_card.dart' show formatSensorValue;

class RiskDomain {
  final String id;
  final String name;
  final IconData icon;
  final Color color;
  final String sensorId;
  final String? sensorId2;
  final double? thresholdLow;
  final double? thresholdHigh;
  final double? thresholdLow2;
  final double? thresholdHigh2;
  final int horizon;
  final String description;

  const RiskDomain({
    required this.id,
    required this.name,
    required this.icon,
    required this.color,
    required this.sensorId,
    this.sensorId2,
    this.thresholdLow,
    this.thresholdHigh,
    this.thresholdLow2,
    this.thresholdHigh2,
    required this.horizon,
    required this.description,
  });
}

const List<RiskDomain> riskDomains = [
  RiskDomain(
    id: 'thermal',
    name: 'Thermal Runaway',
    icon: Icons.thermostat,
    color: Color(0xFFFB923C),
    sensorId: 'temperature',
    thresholdHigh: 28,
    horizon: 30,
    description:
        'Cherry tomato pollen viability drops above 29.4°C. Brief heat spikes during flowering can destroy yields.',
  ),
  RiskDomain(
    id: 'humidity',
    name: 'Humidity Trap',
    icon: Icons.water_drop,
    color: Color(0xFF60A5FA),
    sensorId: 'humidity',
    thresholdHigh: 75,
    horizon: 30,
    description:
        'Sustained humidity above 75% creates conditions favorable for leaf mold and gray mold development.',
  ),
  RiskDomain(
    id: 'dryout',
    name: 'Dry-Out',
    icon: Icons.grass,
    color: Color(0xFF34D399),
    sensorId: 'soilMoisture',
    thresholdLow: 60,
    horizon: 60,
    description:
        'Root zone stress below 60% moisture risks blossom end rot and reduced nutrient uptake.',
  ),
  RiskDomain(
    id: 'lightcrash',
    name: 'Light Crash',
    icon: Icons.wb_sunny,
    color: Color(0xFFFACC15),
    sensorId: 'light',
    thresholdLow: 3000,
    horizon: 30,
    description:
        'Photosynthesis rate drops sharply below 3,000 lux, reducing daily carbohydrate production.',
  ),
  RiskDomain(
    id: 'nutrient',
    name: 'Nutrient Drift',
    icon: Icons.science,
    color: Color(0xFFA78BFA),
    sensorId: 'ph',
    sensorId2: 'ec',
    thresholdLow: 5.5,
    thresholdHigh: 7.5,
    thresholdLow2: 0.8,
    thresholdHigh2: 4.0,
    horizon: 120,
    description:
        'pH or EC outside optimal bands locks out nutrients causing deficiency symptoms within 1–2 days.',
  ),
  RiskDomain(
    id: 'stall',
    name: 'System Stall',
    icon: Icons.wifi_tethering,
    color: Color(0xFF94A3B8),
    sensorId: 'temperature',
    horizon: 15,
    description:
        'Connectivity degradation can create automation blackouts leaving the greenhouse uncontrolled.',
  ),
];

({double slope, double confidence}) computeTrend(List<double> history) {
  if (history.length < 3) return (slope: 0, confidence: 0);
  final recent = history.length > 12 ? history.sublist(history.length - 12) : history;
  final n = recent.length;
  final slope = (recent[n - 1] - recent[0]) / (n - 1);
  final slopes = <double>[];
  for (int i = 1; i < recent.length; i++) {
    slopes.add(recent[i] - recent[i - 1]);
  }
  final avgSlope = slopes.reduce((a, b) => a + b) / slopes.length;
  final variance =
      slopes.map((s) => pow(s - avgSlope, 2).toDouble()).reduce((a, b) => a + b) / slopes.length;
  final cv = sqrt(variance) / (avgSlope.abs() + 0.0001);
  final confidence = max(30, min(95, (100 - cv * 15).round())).toDouble();
  return (slope: slope, confidence: confidence);
}

RiskResult evaluateRisk(RiskDomain domain, Map<String, List<double>> history) {
  final h = history[domain.sensorId] ?? [];
  final h2 = domain.sensorId2 != null ? (history[domain.sensorId2!] ?? []) : <double>[];

  if (h.length < 3) {
    return const RiskResult(
        current: 0, predicted: 0, slope: 0, confidence: 0, level: 'safe', trendLabel: '—');
  }

  const readingsPerMin = 30.0;
  final trend = computeTrend(h);
  final slope = trend.slope;
  final confidence = trend.confidence;
  final current = h.last;
  final predicted = current + slope * domain.horizon * readingsPerMin;

  double? current2;
  double? predicted2;
  double slope2 = 0;
  if (h2.length >= 3) {
    final t2 = computeTrend(h2);
    slope2 = t2.slope;
    current2 = h2.last;
    predicted2 = current2 + t2.slope * domain.horizon * readingsPerMin;
  }

  if (domain.id == 'stall') {
    return RiskResult(
      current: current,
      predicted: predicted,
      slope: slope,
      confidence: 88,
      level: 'safe',
      trendLabel: 'Heartbeat normal',
    );
  }

  double? minsToBreach;

  if (domain.thresholdHigh != null && slope > 0 && current < domain.thresholdHigh!) {
    final mins = ((domain.thresholdHigh! - current) / slope) / readingsPerMin;
    if (mins > 0 && mins <= 120) minsToBreach = mins;
  }
  if (domain.thresholdLow != null && slope < 0 && current > domain.thresholdLow!) {
    final mins = ((current - domain.thresholdLow!) / (-slope)) / readingsPerMin;
    if (mins > 0 && mins <= 120 && (minsToBreach == null || mins < minsToBreach)) {
      minsToBreach = mins;
    }
  }

  if (domain.sensorId2 != null && h2.length >= 3 && current2 != null) {
    if (domain.thresholdHigh2 != null && slope2 > 0 && current2 < domain.thresholdHigh2!) {
      final mins = ((domain.thresholdHigh2! - current2) / slope2) / readingsPerMin;
      if (mins > 0 && mins <= 120 && (minsToBreach == null || mins < minsToBreach)) {
        minsToBreach = mins;
      }
    }
    if (domain.thresholdLow2 != null && slope2 < 0 && current2 > domain.thresholdLow2!) {
      final mins = ((current2 - domain.thresholdLow2!) / (-slope2)) / readingsPerMin;
      if (mins > 0 && mins <= 120 && (minsToBreach == null || mins < minsToBreach)) {
        minsToBreach = mins;
      }
    }
  }

  final atRisk = domain.thresholdHigh != null
      ? current >= domain.thresholdHigh! * 0.95
      : domain.thresholdLow != null
          ? current <= domain.thresholdLow! * 1.05
          : false;

  String level = 'safe';
  if (atRisk) {
    level = 'critical';
  } else if (minsToBreach != null && minsToBreach <= 15) {
    level = 'critical';
  } else if (minsToBreach != null && minsToBreach <= 30) {
    level = 'alert';
  } else if (minsToBreach != null && minsToBreach <= 60) {
    level = 'watch';
  }

  final slopePerMin = slope * readingsPerMin;
  final absSlopePerMin = slopePerMin.abs();
  String trendLabel = 'Stable';
  if (absSlopePerMin > 0.05) {
    trendLabel = slope > 0
        ? '+${slopePerMin.toStringAsFixed(2)}/min ↑'
        : '${slopePerMin.toStringAsFixed(2)}/min ↓';
  }

  return RiskResult(
    current: current,
    current2: current2,
    predicted: predicted,
    predicted2: predicted2,
    slope: slope,
    minsToBreach: minsToBreach,
    confidence: confidence,
    level: level,
    trendLabel: trendLabel,
  );
}

class RiskCard extends StatelessWidget {
  final RiskDomain domain;
  final Map<String, List<double>> history;

  const RiskCard({super.key, required this.domain, required this.history});

  @override
  Widget build(BuildContext context) {
    final result = evaluateRisk(domain, history);

    final levelConfig = _levelConfig(result.level);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: levelConfig.border),
      ),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: domain.color.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(domain.icon, size: 18, color: domain.color),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      domain.name,
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppColors.foreground,
                      ),
                    ),
                    Text(
                      result.trendLabel,
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        color: AppColors.mutedForeground,
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: levelConfig.bg,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: levelConfig.border),
                ),
                child: Text(
                  levelConfig.label,
                  style: GoogleFonts.inter(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: levelConfig.text,
                    letterSpacing: 0.8,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _metric(
                'NOW',
                domain.id == 'stall'
                    ? 'Online'
                    : formatSensorValue(domain.sensorId, result.current),
                AppColors.foreground,
              ),
              _metric(
                'IN ${domain.horizon} MIN',
                domain.id == 'stall'
                    ? 'Stable'
                    : formatSensorValue(domain.sensorId, result.predicted),
                result.level == 'safe' ? AppColors.foreground : levelConfig.text,
              ),
              _metric(
                'BREACH IN',
                result.minsToBreach != null
                    ? '~${result.minsToBreach!.round()}m'
                    : domain.id == 'stall'
                        ? 'N/A'
                        : '—',
                result.minsToBreach != null ? levelConfig.text : AppColors.optimal,
              ),
              _metric(
                'CONFIDENCE',
                '${result.confidence.round()}%',
                AppColors.secondaryForeground,
              ),
            ],
          ),
          if (domain.sensorId2 != null && result.current2 != null) ...[
            const SizedBox(height: 8),
            Divider(color: AppColors.border, height: 1),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.bolt, size: 12, color: Color(0xFFF472B6)),
                const SizedBox(width: 6),
                Text(
                  '${domain.sensorId2!.toUpperCase()}: '
                  '${formatSensorValue(domain.sensorId2!, result.current2!)} → '
                  '${result.predicted2 != null ? formatSensorValue(domain.sensorId2!, result.predicted2!) : "—"}'
                  ' in ${domain.horizon}m',
                  style: GoogleFonts.inter(fontSize: 11, color: AppColors.mutedForeground),
                ),
              ],
            ),
          ],
          const SizedBox(height: 10),
          Text(
            domain.description,
            style: GoogleFonts.inter(
              fontSize: 11,
              color: AppColors.mutedForeground,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _metric(String label, String value, Color valueColor) {
    return Column(
      children: [
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 9,
            fontWeight: FontWeight.w600,
            color: AppColors.mutedForeground,
            letterSpacing: 0.8,
          ),
        ),
        const SizedBox(height: 3),
        Text(
          value,
          style: GoogleFonts.inter(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: valueColor,
          ),
        ),
      ],
    );
  }

  ({Color bg, Color border, Color text, String label}) _levelConfig(String level) {
    switch (level) {
      case 'critical':
        return (
          bg: AppColors.critical.withOpacity(0.13),
          border: AppColors.critical.withOpacity(0.4),
          text: AppColors.critical,
          label: 'CRITICAL'
        );
      case 'alert':
        return (
          bg: AppColors.warning.withOpacity(0.13),
          border: AppColors.warning.withOpacity(0.4),
          text: AppColors.warning,
          label: 'ALERT'
        );
      case 'watch':
        return (
          bg: const Color(0xFFFACC15).withOpacity(0.13),
          border: const Color(0xFFFACC15).withOpacity(0.4),
          text: const Color(0xFFFACC15),
          label: 'WATCH'
        );
      default:
        return (
          bg: AppColors.optimal.withOpacity(0.13),
          border: AppColors.optimal.withOpacity(0.4),
          text: AppColors.optimal,
          label: 'SAFE'
        );
    }
  }
}

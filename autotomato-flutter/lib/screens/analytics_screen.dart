import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../models/models.dart';
import '../providers/greenhouse_provider.dart';
import '../theme/app_colors.dart';
import '../widgets/help_tooltip.dart';
import '../widgets/risk_card.dart';
import '../widgets/sensor_card.dart' show formatSensorValue, sensorDisplayLabel;

String buildConditionReport(List<Sensor> sensors, Map<String, List<double>> history) {
  final now = TimeOfDay.now();
  final hour = now.hourOfPeriod == 0 ? 12 : now.hourOfPeriod;
  final period = now.period == DayPeriod.am ? 'AM' : 'PM';
  final timeStr = '$hour:${now.minute.toString().padLeft(2, '0')} $period';

  final warnings = sensors.where((s) => s.status == SensorStatus.warning).toList();
  final criticals = sensors.where((s) => s.status == SensorStatus.critical).toList();

  final activeRisks = riskDomains
      .map((d) => evaluateRisk(d, history))
      .where((r) => r.level != 'safe')
      .toList();

  activeRisks.sort((a, b) {
    const order = {'critical': 0, 'alert': 1, 'watch': 2, 'safe': 3};
    return (order[a.level] ?? 3).compareTo(order[b.level] ?? 3);
  });

  final parts = <String>[];

  if (criticals.isEmpty && warnings.isEmpty) {
    parts.add(
        'As of $timeStr, all six sensors are reading within optimal ranges — the greenhouse environment is fully healthy.');
  } else if (criticals.isNotEmpty) {
    final names = criticals.map((s) => s.label.toLowerCase()).join(' and ');
    parts.add(
        'As of $timeStr, the greenhouse is under stress. ${criticals.length == 1 ? 'One sensor — $names — is' : '$names are'} at a critical level, requiring immediate attention.');
  } else {
    final names = warnings.map((s) => s.label.toLowerCase()).join(', ');
    parts.add(
        'As of $timeStr, the greenhouse is in a cautionary state. ${warnings.length == 1 ? '${names[0].toUpperCase()}${names.substring(1)} is' : '${warnings.length} sensors ($names) are'} outside optimal bounds.');
  }

  final temp =
      sensors.firstWhere((s) => s.id == 'temperature', orElse: () => sensors.first);
  final hum = sensors.firstWhere((s) => s.id == 'humidity', orElse: () => sensors.first);
  final soil =
      sensors.firstWhere((s) => s.id == 'soilMoisture', orElse: () => sensors.first);
  final ph = sensors.firstWhere((s) => s.id == 'ph', orElse: () => sensors.first);

  if (temp.status == SensorStatus.optimal) {
    parts.add(
        'Temperature is steady at ${temp.value.toStringAsFixed(1)}°C, well within the 18–26°C ideal window for tomato growth.');
  } else if (temp.status == SensorStatus.warning) {
    parts.add(
        'Temperature at ${temp.value.toStringAsFixed(1)}°C is above the optimal ceiling — pollen viability may be reduced if it continues to rise.');
  } else {
    parts.add(
        'Temperature at ${temp.value.toStringAsFixed(1)}°C is at a critical level and poses an immediate risk to plant health.');
  }

  if (hum.status == SensorStatus.optimal) {
    parts.add(
        'Humidity is at ${hum.value.round()}%, providing good conditions for transpiration without disease pressure.');
  } else if (hum.value > 80) {
    parts.add(
        'Humidity has climbed to ${hum.value.round()}% — sustained levels above 80% create conditions favourable for mould and blight.');
  } else {
    parts.add(
        'Humidity is at ${hum.value.round()}%, which is lower than ideal and may cause plant stress.');
  }

  if (soil.status == SensorStatus.optimal) {
    parts.add(
        'Soil water at ${soil.value.round()}% is in a healthy range, keeping roots well-hydrated.');
  } else if (soil.value < 60) {
    parts.add(
        'Soil water has dipped to ${soil.value.round()}% — below 60% the root zone begins to experience water stress.');
  } else {
    parts.add(
        'Soil water at ${soil.value.round()}% is high; ensure drainage is adequate to avoid waterlogging.');
  }

  if (ph.status != SensorStatus.optimal) {
    parts.add(
        'pH is drifting to ${ph.value.toStringAsFixed(2)}, outside the 6.0–7.0 optimal window — nutrient availability may be compromised.');
  }

  if (activeRisks.isEmpty) {
    parts.add(
        'Risk Prediction modeling shows no imminent threshold breaches across all six monitored areas.');
  } else {
    final top = activeRisks.first;
    final topDomain = riskDomains.firstWhere((d) {
      final r = evaluateRisk(d, history);
      return r.level == top.level && r.trendLabel == top.trendLabel;
    }, orElse: () => riskDomains.first);
    final levelWord = top.level == 'critical'
        ? 'critical'
        : top.level == 'alert'
            ? 'elevated'
            : 'developing';
    if (top.minsToBreach != null) {
      final mins = top.minsToBreach!.round();
      parts.add(
          'Risk Prediction has flagged $levelWord risk of ${topDomain.name} — at the current trend, a problem is projected in approximately $mins minute${mins == 1 ? "" : "s"}.');
    } else {
      parts.add(
          'Risk Prediction has flagged $levelWord risk of ${topDomain.name} based on current sensor readings.');
    }
    if (activeRisks.length > 1) {
      final others = riskDomains
          .where((d) {
            final r = evaluateRisk(d, history);
            return r.level != 'safe';
          })
          .skip(1)
          .map((d) => d.name)
          .join(', ');
      if (others.isNotEmpty) {
        parts.add('Other areas to watch: $others.');
      }
    }
  }

  if (criticals.isNotEmpty || activeRisks.any((r) => r.level == 'critical')) {
    parts.add(
        'Immediate action is recommended — check the Controls screen and inspect the affected systems.');
  } else if (warnings.isNotEmpty || activeRisks.isNotEmpty) {
    parts.add(
        'Continue monitoring closely. Automation rules should manage the current conditions, but a manual check is advised within the next hour.');
  } else {
    parts.add('No action required. The greenhouse is running well within all safe ranges.');
  }

  return parts.join(' ');
}

class AnalyticsScreen extends StatelessWidget {
  const AnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<GreenhouseProvider>(
      builder: (context, gh, _) {
        final activeRiskCount = riskDomains
            .where((d) => evaluateRisk(d, gh.sensorHistory).level != 'safe')
            .length;
        final hasCritical = gh.sensors.any((s) => s.status == SensorStatus.critical);
        final hasWarning = gh.sensors.any((s) => s.status == SensorStatus.warning);
        final reportAccent = hasCritical
            ? AppColors.critical
            : hasWarning
                ? AppColors.warning
                : AppColors.optimal;
        final report = buildConditionReport(gh.sensors, gh.sensorHistory);
        final reportSentences = report.split('. ');
        final headline = reportSentences.first +
            (reportSentences.length > 1 ? '.' : '');
        final details = reportSentences.length > 1
            ? reportSentences.skip(1).join('. ')
            : '';

        return Scaffold(
          backgroundColor: AppColors.background,
          body: SafeArea(
            bottom: false,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Risk Prediction',
                            style: GoogleFonts.inter(
                              fontSize: 28,
                              fontWeight: FontWeight.w700,
                              color: AppColors.foreground,
                              letterSpacing: -0.5,
                            ),
                          ),
                          Text(
                            'Forecasts problems before they happen',
                            style: GoogleFonts.inter(
                                fontSize: 13, color: AppColors.mutedForeground),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding:
                          const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: activeRiskCount > 0
                            ? AppColors.warning.withOpacity(0.15)
                            : AppColors.optimal.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: activeRiskCount > 0
                              ? AppColors.warning.withOpacity(0.4)
                              : AppColors.optimal.withOpacity(0.4),
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            activeRiskCount > 0
                                ? Icons.warning_amber
                                : Icons.verified_user,
                            size: 14,
                            color: activeRiskCount > 0
                                ? AppColors.warning
                                : AppColors.optimal,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            activeRiskCount > 0
                                ? '$activeRiskCount risk${activeRiskCount > 1 ? "s" : ""} detected'
                                : 'All clear',
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: activeRiskCount > 0
                                  ? AppColors.warning
                                  : AppColors.optimal,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    _sectionLabel('LIVE READINGS'),
                    const SizedBox(width: 6),
                    HelpButton(
                      title: 'What are these readings?',
                      body:
                          'These are the current values from all 6 sensors in your greenhouse. Each colored dot shows whether a reading is in the safe (green), warning (yellow), or critical (red) range.',
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: gh.sensors.map((s) {
                    final statusColor =
                        AppColors.statusColor(s.statusLabel.toLowerCase());
                    final displayLabel = sensorDisplayLabel(s.id, s.label);
                    return Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppColors.card,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(
                          color: statusColor == AppColors.optimal
                              ? AppColors.border
                              : statusColor.withOpacity(0.4),
                        ),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.sensors,
                            size: 13,
                            color: AppColors.sensorColor(s.id),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            '$displayLabel: ',
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              color: AppColors.mutedForeground,
                            ),
                          ),
                          Text(
                            formatSensorValue(s.id, s.value),
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: AppColors.foreground,
                            ),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            width: 7,
                            height: 7,
                            decoration: BoxDecoration(
                              color: statusColor,
                              shape: BoxShape.circle,
                            ),
                          ),
                        ],
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 20),
                _sectionLabel('CONDITION REPORT'),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.card,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: reportAccent.withOpacity(0.4)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 38,
                            height: 38,
                            decoration: BoxDecoration(
                              color: reportAccent.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(
                              hasCritical
                                  ? Icons.error_rounded
                                  : hasWarning
                                      ? Icons.warning_rounded
                                      : Icons.check_circle_rounded,
                              size: 20,
                              color: reportAccent,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Condition Report',
                                  style: GoogleFonts.inter(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.foreground,
                                  ),
                                ),
                                Text(
                                  'Auto-generated · updates every 6s',
                                  style: GoogleFonts.inter(
                                      fontSize: 12,
                                      color: AppColors.mutedForeground),
                                ),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: reportAccent.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                  color: reportAccent.withOpacity(0.4)),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 6,
                                  height: 6,
                                  decoration: BoxDecoration(
                                    color: reportAccent,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 5),
                                Text(
                                  hasCritical
                                      ? 'CRITICAL'
                                      : hasWarning
                                          ? 'WARNING'
                                          : 'HEALTHY',
                                  style: GoogleFonts.inter(
                                    fontSize: 10,
                                    fontWeight: FontWeight.w700,
                                    color: reportAccent,
                                    letterSpacing: 0.8,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Divider(color: AppColors.border, height: 1),
                      const SizedBox(height: 14),
                      Text(
                        headline,
                        style: GoogleFonts.inter(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: reportAccent,
                          height: 1.4,
                        ),
                      ),
                      if (details.isNotEmpty) ...[
                        const SizedBox(height: 10),
                        Text(
                          details,
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            color: AppColors.secondaryForeground,
                            height: 1.65,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    _sectionLabel('RISK PREDICTIONS'),
                    const SizedBox(width: 6),
                    HelpButton(
                      title: 'What is Risk Prediction?',
                      body:
                          'This system looks at how your sensor readings are changing over time and calculates whether a problem is likely to happen soon.\n\nFor example, if temperature is slowly rising, it can warn you 20–30 minutes before it gets too hot — giving you time to act.',
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  'Based on the last ${gh.sensorHistory['temperature']?.length ?? 0} readings',
                  style: GoogleFonts.inter(
                      fontSize: 12, color: AppColors.mutedForeground),
                ),
                const SizedBox(height: 10),
                ...riskDomains
                    .map((d) => RiskCard(domain: d, history: gh.sensorHistory)),
                const SizedBox(height: 16),
                _sectionLabel('ABOUT'),
                const SizedBox(height: 8),
                _AboutCard(),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _sectionLabel(String text) {
    return Text(
      text,
      style: GoogleFonts.inter(
        fontSize: 12,
        fontWeight: FontWeight.w600,
        color: AppColors.mutedForeground,
        letterSpacing: 1.2,
      ),
    );
  }
}

class _AboutCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    const benefits = [
      (icon: Icons.memory, text: 'Zero new hardware — runs on existing sensors'),
      (icon: Icons.timer_outlined, text: '15–60 min early warning before a problem occurs'),
      (icon: Icons.shield_outlined, text: 'Devices activate automatically before damage happens'),
      (icon: Icons.calculate_outlined, text: 'Simple math-based prediction — no internet needed'),
      (icon: Icons.bolt, text: 'Saves energy: brief early action vs long emergency response'),
      (icon: Icons.cloud_off, text: 'Keeps working even during internet outages'),
    ];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.eco, size: 24, color: AppColors.primary),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'About Risk Prediction',
                      style: GoogleFonts.inter(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: AppColors.foreground),
                    ),
                    Text(
                      'GRiPS — Greenhouse Risk Prediction System',
                      style: GoogleFonts.inter(
                          fontSize: 12, color: AppColors.mutedForeground),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'This system transforms auTOMATO from a reactive monitor into a proactive guardian. It watches how your sensor readings change over time and warns you about problems 15 to 60 minutes before they happen — and can act automatically when you are away, working, or sleeping.',
            style: GoogleFonts.inter(
                fontSize: 14,
                color: AppColors.secondaryForeground,
                height: 1.6),
          ),
          const SizedBox(height: 12),
          Divider(color: AppColors.border),
          const SizedBox(height: 8),
          Text(
            'KEY BENEFITS',
            style: GoogleFonts.inter(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: AppColors.mutedForeground,
                letterSpacing: 1.0),
          ),
          const SizedBox(height: 10),
          ...benefits.map((b) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(b.icon, size: 16, color: AppColors.primary),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(b.text,
                          style: GoogleFonts.inter(
                              fontSize: 13,
                              color: AppColors.secondaryForeground,
                              height: 1.4)),
                    ),
                  ],
                ),
              )),
          Divider(color: AppColors.border),
          const SizedBox(height: 8),
          Center(
            child: Text(
              'Polytechnic University of the Philippines, Lopez Campus · AuTOMATO Project',
              style: GoogleFonts.inter(
                  fontSize: 11, color: AppColors.mutedForeground),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../models/models.dart';
import '../providers/greenhouse_provider.dart';
import '../theme/app_colors.dart';
import '../widgets/risk_card.dart';
import '../widgets/sensor_card.dart' show formatSensorValue;

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
    parts.add('As of $timeStr, all six sensors are reading within optimal ranges — the greenhouse environment is fully healthy.');
  } else if (criticals.isNotEmpty) {
    final names = criticals.map((s) => s.label.toLowerCase()).join(' and ');
    parts.add('As of $timeStr, the greenhouse is under stress. ${criticals.length == 1 ? 'One sensor — $names — is' : '$names are'} at a critical level, requiring immediate attention.');
  } else {
    final names = warnings.map((s) => s.label.toLowerCase()).join(', ');
    parts.add('As of $timeStr, the greenhouse is in a cautionary state. ${warnings.length == 1 ? '${names[0].toUpperCase()}${names.substring(1)} is' : '${warnings.length} sensors ($names) are'} outside optimal bounds.');
  }

  final temp = sensors.firstWhere((s) => s.id == 'temperature', orElse: () => sensors.first);
  final hum = sensors.firstWhere((s) => s.id == 'humidity', orElse: () => sensors.first);
  final soil = sensors.firstWhere((s) => s.id == 'soilMoisture', orElse: () => sensors.first);
  final ph = sensors.firstWhere((s) => s.id == 'ph', orElse: () => sensors.first);

  if (temp.status == SensorStatus.optimal) {
    parts.add('Temperature is steady at ${temp.value.toStringAsFixed(1)}°C, well within the 18–26°C ideal window for tomato growth.');
  } else if (temp.status == SensorStatus.warning) {
    parts.add('Temperature at ${temp.value.toStringAsFixed(1)}°C is above the optimal ceiling — pollen viability may be reduced if it continues to rise.');
  } else {
    parts.add('Temperature at ${temp.value.toStringAsFixed(1)}°C is at a critical level and poses an immediate risk to plant health.');
  }

  if (hum.status == SensorStatus.optimal) {
    parts.add('Humidity is at ${hum.value.round()}%, providing good conditions for transpiration without disease pressure.');
  } else if (hum.value > 80) {
    parts.add('Humidity has climbed to ${hum.value.round()}% — sustained levels above 80% create conditions favourable for mould and blight.');
  } else {
    parts.add('Humidity is at ${hum.value.round()}%, which is lower than ideal and may cause plant stress.');
  }

  if (soil.status == SensorStatus.optimal) {
    parts.add('Soil moisture at ${soil.value.round()}% is in a healthy range, keeping roots well-hydrated.');
  } else if (soil.value < 60) {
    parts.add('Soil moisture has dipped to ${soil.value.round()}% — below 60% the root zone begins to experience water stress.');
  } else {
    parts.add('Soil moisture at ${soil.value.round()}% is high; ensure drainage is adequate to avoid waterlogging.');
  }

  if (ph.status != SensorStatus.optimal) {
    parts.add('pH is drifting to ${ph.value.toStringAsFixed(2)}, outside the 6.0–7.0 optimal window — nutrient availability may be compromised.');
  }

  if (activeRisks.isEmpty) {
    parts.add('GRiPS risk modeling shows no imminent threshold breaches across all six monitored domains.');
  } else {
    final top = activeRisks.first;
    final topDomain = riskDomains.firstWhere((d) {
      final r = evaluateRisk(d, history);
      return r.level == top.level && r.trendLabel == top.trendLabel;
    }, orElse: () => riskDomains.first);
    final levelWord = top.level == 'critical' ? 'critical' : top.level == 'alert' ? 'elevated' : 'developing';
    if (top.minsToBreach != null) {
      final mins = top.minsToBreach!.round();
      parts.add('GRiPS has flagged $levelWord risk of ${topDomain.name} — at the current trend, a threshold breach is projected in approximately $mins minute${mins == 1 ? "" : "s"}.');
    } else {
      parts.add('GRiPS has flagged $levelWord risk of ${topDomain.name} based on current sensor readings.');
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
        parts.add('Additional risk domains under watch: $others.');
      }
    }
  }

  if (criticals.isNotEmpty || activeRisks.any((r) => r.level == 'critical')) {
    parts.add('Immediate intervention is recommended — check automation settings and inspect the affected systems.');
  } else if (warnings.isNotEmpty || activeRisks.isNotEmpty) {
    parts.add('Continue monitoring closely. Automation rules should manage the current conditions, but manual review is advised within the next hour.');
  } else {
    parts.add('No action required. The greenhouse is running well within all safety margins.');
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
                            'GRiPS',
                            style: GoogleFonts.inter(
                              fontSize: 28,
                              fontWeight: FontWeight.w700,
                              color: AppColors.foreground,
                              letterSpacing: -0.5,
                            ),
                          ),
                          Text(
                            'Risk Prediction System',
                            style: GoogleFonts.inter(
                                fontSize: 13, color: AppColors.mutedForeground),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
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
                            activeRiskCount > 0 ? Icons.warning_amber : Icons.verified_user,
                            size: 14,
                            color: activeRiskCount > 0 ? AppColors.warning : AppColors.optimal,
                          ),
                          const SizedBox(width: 6),
                          Text(
                            activeRiskCount > 0
                                ? '$activeRiskCount risk${activeRiskCount > 1 ? 's' : ''} detected'
                                : 'All clear',
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: activeRiskCount > 0 ? AppColors.warning : AppColors.optimal,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                _sectionLabel('LIVE READINGS'),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: gh.sensors.map((s) {
                    final statusColor = AppColors.statusColor(s.statusLabel.toLowerCase());
                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppColors.card,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.sensors,
                            size: 13,
                            color: AppColors.sensorColor(s.id),
                          ),
                          const SizedBox(width: 5),
                          Text(
                            formatSensorValue(s.id, s.value),
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppColors.foreground,
                            ),
                          ),
                          const SizedBox(width: 5),
                          Container(
                            width: 5,
                            height: 5,
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
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.card,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: reportAccent.withOpacity(0.4)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 34,
                            height: 34,
                            decoration: BoxDecoration(
                              color: reportAccent.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(
                              hasCritical
                                  ? Icons.error_outline
                                  : hasWarning
                                      ? Icons.warning_amber
                                      : Icons.check_circle_outline,
                              size: 18,
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
                                    fontSize: 14,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.foreground,
                                  ),
                                ),
                                Text(
                                  'Auto-generated · updates every 6s',
                                  style: GoogleFonts.inter(
                                      fontSize: 11, color: AppColors.mutedForeground),
                                ),
                              ],
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: reportAccent.withOpacity(0.15),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(color: reportAccent.withOpacity(0.4)),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 5,
                                  height: 5,
                                  decoration: BoxDecoration(
                                    color: reportAccent,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 5),
                                Text(
                                  hasCritical ? 'CRITICAL' : hasWarning ? 'WARNING' : 'HEALTHY',
                                  style: GoogleFonts.inter(
                                    fontSize: 9,
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
                      const SizedBox(height: 10),
                      Divider(color: AppColors.border, height: 1),
                      const SizedBox(height: 10),
                      Text(
                        report,
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          color: AppColors.secondaryForeground,
                          height: 1.6,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                _sectionLabel('RISK PREDICTIONS'),
                const SizedBox(height: 2),
                Text(
                  'Linear trend forecasts using last ${gh.sensorHistory['temperature']?.length ?? 0} readings',
                  style: GoogleFonts.inter(fontSize: 11, color: AppColors.mutedForeground),
                ),
                const SizedBox(height: 10),
                ...riskDomains.map((d) => RiskCard(domain: d, history: gh.sensorHistory)),
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
        fontSize: 11,
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
      (icon: Icons.timer_outlined, text: '15–60 min early warning before threshold breach'),
      (icon: Icons.shield_outlined, text: 'Auto-prevention triggers devices before damage'),
      (icon: Icons.calculate_outlined, text: 'Fully explainable linear trend math'),
      (icon: Icons.bolt, text: 'Energy efficient: brief pre-cooling vs extended emergency'),
      (icon: Icons.cloud_off, text: 'Continues automation during internet outages'),
    ];

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.eco, size: 22, color: AppColors.primary),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('About GRiPS', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: AppColors.foreground)),
                  Text('Greenhouse Risk Prediction System', style: GoogleFonts.inter(fontSize: 12, color: AppColors.mutedForeground)),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            'GRiPS transforms auTOMATO from a reactive monitor into a proactive guardian. Using simple linear trend math on live sensor data, it forecasts environmental problems 15 to 60 minutes before they occur — and acts automatically when farmers are absent, working, or sleeping.',
            style: GoogleFonts.inter(fontSize: 13, color: AppColors.secondaryForeground, height: 1.55),
          ),
          const SizedBox(height: 12),
          Divider(color: AppColors.border),
          const SizedBox(height: 8),
          Text('KEY BENEFITS', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w600, color: AppColors.mutedForeground, letterSpacing: 1.0)),
          const SizedBox(height: 8),
          ...benefits.map((b) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(b.icon, size: 14, color: AppColors.primary),
                const SizedBox(width: 8),
                Expanded(child: Text(b.text, style: GoogleFonts.inter(fontSize: 12, color: AppColors.secondaryForeground, height: 1.4))),
              ],
            ),
          )),
          Divider(color: AppColors.border),
          const SizedBox(height: 8),
          Center(
            child: Text(
              'Polytechnic University of the Philippines, Lopez Campus · AuTOMATO Project',
              style: GoogleFonts.inter(fontSize: 10, color: AppColors.mutedForeground),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ),
    );
  }
}

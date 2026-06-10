import 'dart:math';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../providers/greenhouse_provider.dart';
import '../theme/app_colors.dart';
import '../widgets/kpi_card.dart';
import '../widgets/sensor_card.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<GreenhouseProvider>(
      builder: (context, gh, _) {
        final warnings = gh.sensors.where((s) => s.status.name == 'warning').length;
        final criticals = gh.sensors.where((s) => s.status.name == 'critical').length;

        return Scaffold(
          backgroundColor: AppColors.background,
          body: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: SafeArea(
                  bottom: false,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'auTOMATO',
                                    style: GoogleFonts.inter(
                                      fontSize: 28,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.foreground,
                                      letterSpacing: -0.5,
                                    ),
                                  ),
                                  Text(
                                    'Greenhouse Monitor',
                                    style: GoogleFonts.inter(
                                      fontSize: 14,
                                      color: AppColors.mutedForeground,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: AppColors.primary.withOpacity(0.4)),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    width: 6,
                                    height: 6,
                                    decoration: const BoxDecoration(
                                      color: AppColors.primary,
                                      shape: BoxShape.circle,
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    'LIVE',
                                    style: GoogleFonts.inter(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w700,
                                      color: AppColors.primary,
                                      letterSpacing: 0.8,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        _StatusBanner(criticals: criticals, warnings: warnings),
                        const SizedBox(height: 20),
                        _sectionLabel('OVERVIEW'),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            _HealthArcCard(score: gh.healthScore),
                            const SizedBox(width: 8),
                            KpiCard(
                              icon: Icons.notifications,
                              iconColor: gh.activeAlertCount > 0
                                  ? AppColors.warning
                                  : AppColors.mutedForeground,
                              value: '${gh.activeAlertCount}',
                              label: 'Active Alerts',
                              sublabel: criticals > 0 ? '$criticals critical' : 'none critical',
                            ),
                            const SizedBox(width: 8),
                            KpiCard(
                              icon: Icons.power_settings_new,
                              iconColor: AppColors.primary,
                              value: '${gh.devicesOnCount}/${gh.devices.length}',
                              label: 'Devices On',
                              sublabel: 'running now',
                            ),
                          ],
                        ),
                        const SizedBox(height: 20),
                        _sectionLabel('SENSOR READINGS'),
                        const SizedBox(height: 4),
                        Text(
                          'Last ${gh.sensorHistory['temperature']?.length ?? 0} readings · updates every 6s · tap any card for details',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            color: AppColors.mutedForeground,
                          ),
                        ),
                        const SizedBox(height: 10),
                        ...gh.sensors.map((s) => SensorCard(
                              sensor: s,
                              history: gh.sensorHistory[s.id] ?? [],
                            )),
                        const SizedBox(height: 4),
                        _sectionLabel('DEVICE STATUS'),
                        const SizedBox(height: 8),
                        GridView.count(
                          crossAxisCount: 2,
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          crossAxisSpacing: 8,
                          mainAxisSpacing: 8,
                          childAspectRatio: 2.4,
                          children: gh.devices.map((d) => _DeviceChip(device: d)).toList(),
                        ),
                        const SizedBox(height: 20),
                        _sectionLabel('RECENT ALERTS'),
                        const SizedBox(height: 8),
                        if (gh.alerts.isEmpty)
                          Center(
                            child: Padding(
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              child: Text(
                                'No active alerts',
                                style: GoogleFonts.inter(color: AppColors.mutedForeground),
                              ),
                            ),
                          )
                        else
                          ...gh.alerts.take(3).map((a) => _AlertRow(alert: a)),
                        const SizedBox(height: 80),
                      ],
                    ),
                  ),
                ),
              ),
            ],
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

class _StatusBanner extends StatelessWidget {
  final int criticals;
  final int warnings;

  const _StatusBanner({required this.criticals, required this.warnings});

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color textColor;
    IconData icon;
    String title;
    String subtitle;

    if (criticals > 0) {
      bg = AppColors.critical.withOpacity(0.13);
      textColor = AppColors.critical;
      icon = Icons.warning_rounded;
      title = 'URGENT — Action needed now!';
      subtitle = '$criticals critical alert${criticals > 1 ? "s" : ""} require${criticals == 1 ? "s" : ""} attention';
    } else if (warnings > 0) {
      bg = AppColors.warning.withOpacity(0.12);
      textColor = AppColors.warning;
      icon = Icons.info_rounded;
      title = 'Check on your plants soon';
      subtitle = '$warnings sensor${warnings > 1 ? "s are" : " is"} outside the normal range';
    } else {
      bg = AppColors.optimal.withOpacity(0.12);
      textColor = AppColors.optimal;
      icon = Icons.check_circle_rounded;
      title = 'Your greenhouse is HEALTHY';
      subtitle = 'All sensors are reading normally';
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: textColor.withOpacity(0.4)),
      ),
      child: Row(
        children: [
          Icon(icon, size: 32, color: textColor),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: GoogleFonts.inter(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: textColor,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    color: textColor.withOpacity(0.8),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _HealthArcCard extends StatelessWidget {
  final double score;

  const _HealthArcCard({required this.score});

  Color get _color {
    if (score >= 80) return AppColors.optimal;
    if (score >= 50) return AppColors.warning;
    return AppColors.critical;
  }

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: _color.withOpacity(0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(Icons.eco, size: 20, color: _color),
            ),
            const SizedBox(height: 8),
            SizedBox(
              height: 52,
              child: CustomPaint(
                painter: _ArcPainter(progress: score / 100, color: _color),
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.only(top: 16),
                    child: Text(
                      '${score.round()}%',
                      style: GoogleFonts.inter(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: AppColors.foreground,
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Health Score',
              style: GoogleFonts.inter(fontSize: 13, color: AppColors.mutedForeground),
            ),
            Text(
              score >= 80 ? 'Looking great!' : score >= 50 ? 'Needs attention' : 'Act now',
              style: GoogleFonts.inter(
                fontSize: 11,
                color: _color,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ArcPainter extends CustomPainter {
  final double progress;
  final Color color;

  _ArcPainter({required this.progress, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height * 0.88);
    final radius = size.width * 0.42;
    final rect = Rect.fromCircle(center: center, radius: radius);

    final trackPaint = Paint()
      ..color = AppColors.border
      ..style = PaintingStyle.stroke
      ..strokeWidth = 5
      ..strokeCap = StrokeCap.round;
    canvas.drawArc(rect, pi, pi, false, trackPaint);

    final progressPaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = 5
      ..strokeCap = StrokeCap.round;
    canvas.drawArc(rect, pi, pi * progress.clamp(0.0, 1.0), false, progressPaint);
  }

  @override
  bool shouldRepaint(_ArcPainter old) =>
      old.progress != progress || old.color != color;
}

class _DeviceChip extends StatelessWidget {
  final dynamic device;
  const _DeviceChip({required this.device});

  @override
  Widget build(BuildContext context) {
    final color = device.isOn ? AppColors.primary : AppColors.mutedForeground;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
            color: device.isOn ? AppColors.primary.withOpacity(0.4) : AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: color.withOpacity(0.15),
              borderRadius: BorderRadius.circular(7),
            ),
            child: Icon(
              device.type == 'fan'
                  ? Icons.air
                  : device.type == 'pump'
                      ? Icons.water
                      : device.type == 'light'
                          ? Icons.lightbulb_outline
                          : Icons.blur_on,
              size: 15,
              color: color,
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  device.name,
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AppColors.foreground,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  device.isOn ? 'ON' : 'OFF',
                  style: GoogleFonts.inter(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: color,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _AlertRow extends StatelessWidget {
  final dynamic alert;
  const _AlertRow({required this.alert});

  @override
  Widget build(BuildContext context) {
    final color = alert.severity == 'critical'
        ? AppColors.critical
        : alert.severity == 'warning'
            ? AppColors.warning
            : AppColors.primary;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Icon(
            alert.severity == 'critical'
                ? Icons.error_outline
                : alert.severity == 'warning'
                    ? Icons.warning_amber
                    : Icons.check_circle_outline,
            size: 18,
            color: color,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              alert.message,
              style: GoogleFonts.inter(fontSize: 13, color: AppColors.secondaryForeground),
            ),
          ),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

import '../models/models.dart';
import '../providers/greenhouse_provider.dart';
import '../theme/app_colors.dart';

String _relativeTime(DateTime dt) {
  final diff = DateTime.now().difference(dt);
  if (diff.inSeconds < 60) return 'Just now';
  if (diff.inMinutes == 1) return '1 minute ago';
  if (diff.inMinutes < 60) return '${diff.inMinutes} minutes ago';
  if (diff.inHours == 1) return '1 hour ago';
  if (diff.inHours < 24) return '${diff.inHours} hours ago';
  return DateFormat('MMM d, h:mm a').format(dt);
}

String _adviceForAlert(Alert alert) {
  switch (alert.sensor) {
    case 'temperature':
      return '1. Check if the exhaust fan is turned on.\n'
          '2. Open the greenhouse vents if you can.\n'
          '3. Water the plants to help cool them down.\n'
          '4. Add shade cloth if it stays hot after 10 minutes.';
    case 'humidity':
      return '1. Turn off the mist fogger.\n'
          '2. Turn on the exhaust fan to push humid air out.\n'
          '3. Open vents to let fresh air in.\n'
          '4. Check for standing water on the floor.';
    case 'soilMoisture':
      return '1. Turn on the water pump.\n'
          '2. Check if the irrigation pipes are blocked.\n'
          '3. Water the plants manually if the pump is off.\n'
          '4. Make sure the soil moisture sensor is not buried too deep.';
    case 'light':
      return '1. Turn on the grow lights.\n'
          '2. Check if the greenhouse cover is blocking sunlight.\n'
          '3. Clean dusty or foggy greenhouse panels.\n'
          '4. Move shade cloth away if it was left on.';
    case 'ph':
      return '1. Check your nutrient solution.\n'
          '2. If pH is too high (above 7.0), add a small amount of pH Down solution.\n'
          '3. If pH is too low (below 6.0), add a small amount of pH Up solution.\n'
          '4. Retest after 30 minutes.';
    case 'ec':
      return '1. Check the nutrient solution concentration.\n'
          '2. If EC is too high, dilute the solution with clean water.\n'
          '3. If EC is too low, add more nutrient solution.\n'
          '4. Flush the system if EC has been off for more than a day.';
    default:
      return '1. Check the Controls screen and make sure key devices are running.\n'
          '2. Inspect the greenhouse for anything unusual.\n'
          '3. If the problem continues, check the sensor connections.\n'
          '4. Contact your system administrator if you are unsure.';
  }
}

class AlertsScreen extends StatelessWidget {
  const AlertsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<GreenhouseProvider>(
      builder: (context, gh, _) {
        final criticalCount = gh.alerts.where((a) => a.severity == 'critical').length;
        final warningCount = gh.alerts.where((a) => a.severity == 'warning').length;

        return Scaffold(
          backgroundColor: AppColors.background,
          body: SafeArea(
            bottom: false,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
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
                                  'Alerts',
                                  style: GoogleFonts.inter(
                                    fontSize: 28,
                                    fontWeight: FontWeight.w700,
                                    color: AppColors.foreground,
                                    letterSpacing: -0.5,
                                  ),
                                ),
                                Text(
                                  '${gh.alerts.length} total · $criticalCount critical · $warningCount warnings',
                                  style: GoogleFonts.inter(
                                      fontSize: 13, color: AppColors.mutedForeground),
                                ),
                              ],
                            ),
                          ),
                          if (gh.alerts.isNotEmpty)
                            TextButton.icon(
                              onPressed: () {
                                HapticFeedback.lightImpact();
                                for (final a in List.from(gh.alerts)) {
                                  gh.dismissAlert(a.id);
                                }
                              },
                              icon: const Icon(Icons.clear_all,
                                  size: 16, color: AppColors.mutedForeground),
                              label: Text(
                                'Clear all',
                                style: GoogleFonts.inter(
                                    fontSize: 13, color: AppColors.mutedForeground),
                              ),
                            ),
                        ],
                      ),
                      if (criticalCount > 0) ...[
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          decoration: BoxDecoration(
                            color: AppColors.critical.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppColors.critical.withOpacity(0.4)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.warning_rounded,
                                  size: 22, color: AppColors.critical),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  '$criticalCount critical alert${criticalCount > 1 ? "s" : ""} — your plants need attention now',
                                  style: GoogleFonts.inter(
                                      fontSize: 13,
                                      color: AppColors.critical,
                                      fontWeight: FontWeight.w600),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                      const SizedBox(height: 10),
                      if (gh.alerts.isNotEmpty)
                        Row(
                          children: [
                            Icon(Icons.swipe_left_outlined,
                                size: 15, color: AppColors.mutedForeground),
                            const SizedBox(width: 6),
                            Text(
                              'Swipe left on an alert to dismiss it',
                              style: GoogleFonts.inter(
                                  fontSize: 12, color: AppColors.mutedForeground),
                            ),
                          ],
                        ),
                      const SizedBox(height: 6),
                    ],
                  ),
                ),
                Expanded(
                  child: gh.alerts.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Container(
                                width: 68,
                                height: 68,
                                decoration: BoxDecoration(
                                  color: AppColors.optimal.withOpacity(0.15),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: const Icon(Icons.check_circle_outline,
                                    size: 34, color: AppColors.optimal),
                              ),
                              const SizedBox(height: 14),
                              Text(
                                'All clear!',
                                style: GoogleFonts.inter(
                                  fontSize: 20,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.foreground,
                                ),
                              ),
                              Text(
                                'No active alerts right now',
                                style: GoogleFonts.inter(
                                    fontSize: 14, color: AppColors.mutedForeground),
                              ),
                            ],
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 80),
                          itemCount: gh.alerts.length,
                          itemBuilder: (context, i) {
                            final alert = gh.alerts[i];
                            return _AlertCard(
                              alert: alert,
                              onDismiss: () {
                                HapticFeedback.lightImpact();
                                gh.dismissAlert(alert.id);
                              },
                            );
                          },
                        ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _AlertCard extends StatelessWidget {
  final Alert alert;
  final VoidCallback onDismiss;

  const _AlertCard({required this.alert, required this.onDismiss});

  @override
  Widget build(BuildContext context) {
    final severity = alert.severity;
    final color = severity == 'critical'
        ? AppColors.critical
        : severity == 'warning'
            ? AppColors.warning
            : AppColors.primary;

    final icon = severity == 'critical'
        ? Icons.error_rounded
        : severity == 'warning'
            ? Icons.warning_rounded
            : Icons.info_rounded;

    return Dismissible(
      key: Key(alert.id),
      direction: DismissDirection.endToStart,
      onDismissed: (_) => onDismiss(),
      background: Container(
        margin: const EdgeInsets.only(bottom: 10),
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 24),
        decoration: BoxDecoration(
          color: AppColors.critical.withOpacity(0.2),
          borderRadius: BorderRadius.circular(14),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.delete_outline, color: AppColors.critical, size: 22),
            const SizedBox(height: 4),
            Text(
              'Dismiss',
              style: GoogleFonts.inter(
                  fontSize: 11, color: AppColors.critical, fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: color.withOpacity(0.35)),
        ),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: color.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(icon, size: 24, color: color),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          alert.message,
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            color: AppColors.foreground,
                            height: 1.4,
                          ),
                        ),
                        const SizedBox(height: 6),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: color.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                severity.toUpperCase(),
                                style: GoogleFonts.inter(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  color: color,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Text(
                              _relativeTime(alert.timestamp),
                              style: GoogleFonts.inter(
                                  fontSize: 12, color: AppColors.mutedForeground),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  GestureDetector(
                    onTap: onDismiss,
                    child: Padding(
                      padding: const EdgeInsets.all(4),
                      child: Icon(Icons.close,
                          size: 18, color: AppColors.mutedForeground),
                    ),
                  ),
                ],
              ),
              if (severity == 'critical' || severity == 'warning') ...[
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () => _showAdvice(context, alert, color),
                    icon: Icon(Icons.help_outline_rounded, size: 16, color: color),
                    label: Text(
                      'What should I do?',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: color,
                      ),
                    ),
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(color: color.withOpacity(0.5)),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  void _showAdvice(BuildContext context, Alert alert, Color color) {
    final advice = _adviceForAlert(alert);
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.card,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      isScrollControlled: true,
      builder: (_) => Padding(
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 40),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Row(
              children: [
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(Icons.tips_and_updates_outlined, size: 22, color: color),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    'What to do now',
                    style: GoogleFonts.inter(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AppColors.foreground,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              alert.message,
              style: GoogleFonts.inter(
                  fontSize: 13, color: AppColors.mutedForeground),
            ),
            const SizedBox(height: 18),
            Divider(color: AppColors.border),
            const SizedBox(height: 14),
            Text(
              advice,
              style: GoogleFonts.inter(
                fontSize: 15,
                color: AppColors.secondaryForeground,
                height: 1.8,
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () => Navigator.pop(context),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
                child: Text(
                  'Got it',
                  style: GoogleFonts.inter(
                      fontSize: 15, fontWeight: FontWeight.w700),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

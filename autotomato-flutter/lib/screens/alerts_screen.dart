import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

import '../providers/greenhouse_provider.dart';
import '../theme/app_colors.dart';

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
                                      fontSize: 12, color: AppColors.mutedForeground),
                                ),
                              ],
                            ),
                          ),
                          if (gh.alerts.isNotEmpty)
                            TextButton.icon(
                              onPressed: () {
                                for (final a in List.from(gh.alerts)) {
                                  gh.dismissAlert(a.id);
                                }
                              },
                              icon: const Icon(Icons.clear_all, size: 16, color: AppColors.mutedForeground),
                              label: Text(
                                'Clear all',
                                style: GoogleFonts.inter(
                                    fontSize: 12, color: AppColors.mutedForeground),
                              ),
                            ),
                        ],
                      ),
                      if (criticalCount > 0) ...[
                        const SizedBox(height: 10),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: AppColors.critical.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppColors.critical.withOpacity(0.4)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.error_outline, size: 16, color: AppColors.critical),
                              const SizedBox(width: 8),
                              Text(
                                '$criticalCount critical alert${criticalCount > 1 ? "s" : ""} require immediate attention',
                                style: GoogleFonts.inter(
                                    fontSize: 12, color: AppColors.critical),
                              ),
                            ],
                          ),
                        ),
                      ],
                      const SizedBox(height: 12),
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
                                width: 56,
                                height: 56,
                                decoration: BoxDecoration(
                                  color: AppColors.optimal.withOpacity(0.15),
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                child: const Icon(Icons.check_circle_outline,
                                    size: 28, color: AppColors.optimal),
                              ),
                              const SizedBox(height: 12),
                              Text(
                                'All clear',
                                style: GoogleFonts.inter(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.foreground,
                                ),
                              ),
                              Text(
                                'No active alerts',
                                style: GoogleFonts.inter(
                                    fontSize: 13, color: AppColors.mutedForeground),
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
                              onDismiss: () => gh.dismissAlert(alert.id),
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
  final dynamic alert;
  final VoidCallback onDismiss;

  const _AlertCard({required this.alert, required this.onDismiss});

  @override
  Widget build(BuildContext context) {
    final severity = alert.severity as String;
    final color = severity == 'critical'
        ? AppColors.critical
        : severity == 'warning'
            ? AppColors.warning
            : AppColors.primary;

    final icon = severity == 'critical'
        ? Icons.error_outline
        : severity == 'warning'
            ? Icons.warning_amber
            : Icons.info_outline;

    final timeStr = DateFormat('h:mm a').format(alert.timestamp as DateTime);

    return Dismissible(
      key: Key(alert.id as String),
      direction: DismissDirection.endToStart,
      onDismissed: (_) => onDismiss(),
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 20),
        color: AppColors.critical.withOpacity(0.2),
        child: const Icon(Icons.delete_outline, color: AppColors.critical),
      ),
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: color.withOpacity(0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, size: 16, color: color),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    alert.message as String,
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      color: AppColors.foreground,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: color.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(5),
                        ),
                        child: Text(
                          severity.toUpperCase(),
                          style: GoogleFonts.inter(
                            fontSize: 9,
                            fontWeight: FontWeight.w700,
                            color: color,
                            letterSpacing: 0.5,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        timeStr,
                        style: GoogleFonts.inter(fontSize: 11, color: AppColors.mutedForeground),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            GestureDetector(
              onTap: onDismiss,
              child: const Icon(Icons.close, size: 16, color: AppColors.mutedForeground),
            ),
          ],
        ),
      ),
    );
  }
}

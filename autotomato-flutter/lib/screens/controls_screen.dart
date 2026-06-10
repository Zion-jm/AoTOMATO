import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../providers/greenhouse_provider.dart';
import '../theme/app_colors.dart';

class ControlsScreen extends StatelessWidget {
  const ControlsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<GreenhouseProvider>(
      builder: (context, gh, _) {
        return Scaffold(
          backgroundColor: AppColors.background,
          body: SafeArea(
            bottom: false,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
              children: [
                Text(
                  'Controls',
                  style: GoogleFonts.inter(
                    fontSize: 28,
                    fontWeight: FontWeight.w700,
                    color: AppColors.foreground,
                    letterSpacing: -0.5,
                  ),
                ),
                Text(
                  'Manage devices and automation',
                  style: GoogleFonts.inter(fontSize: 13, color: AppColors.mutedForeground),
                ),
                const SizedBox(height: 20),
                _sectionLabel('DEVICES'),
                const SizedBox(height: 8),
                ...gh.devices.map((d) => _DeviceCard(
                      device: d,
                      onToggle: () => gh.toggleDevice(d.id),
                    )),
                const SizedBox(height: 16),
                _sectionLabel('AUTOMATION RULES'),
                const SizedBox(height: 8),
                ...gh.automationRules.map((r) => _RuleCard(
                      rule: r,
                      onToggle: () => gh.toggleRule(r.id),
                    )),
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

class _DeviceCard extends StatelessWidget {
  final dynamic device;
  final VoidCallback onToggle;

  const _DeviceCard({required this.device, required this.onToggle});

  IconData _icon(String type) {
    switch (type) {
      case 'fan':
        return Icons.air;
      case 'pump':
        return Icons.water;
      case 'light':
        return Icons.lightbulb_outline;
      default:
        return Icons.blur_on;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isOn = device.isOn as bool;
    final color = isOn ? AppColors.primary : AppColors.mutedForeground;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: isOn ? AppColors.primary.withOpacity(0.4) : AppColors.border,
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: color.withOpacity(0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(_icon(device.type as String), size: 22, color: color),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  device.name as String,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.foreground,
                  ),
                ),
                if (device.note != null)
                  Text(
                    device.note as String,
                    style: GoogleFonts.inter(fontSize: 11, color: AppColors.mutedForeground),
                  ),
                const SizedBox(height: 2),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    isOn ? 'RUNNING' : 'STANDBY',
                    style: GoogleFonts.inter(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: color,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Switch(
            value: isOn,
            onChanged: (_) => onToggle(),
            activeColor: AppColors.primary,
            activeTrackColor: AppColors.primary.withOpacity(0.3),
            inactiveThumbColor: AppColors.mutedForeground,
            inactiveTrackColor: AppColors.border,
          ),
        ],
      ),
    );
  }
}

class _RuleCard extends StatelessWidget {
  final dynamic rule;
  final VoidCallback onToggle;

  const _RuleCard({required this.rule, required this.onToggle});

  @override
  Widget build(BuildContext context) {
    final enabled = rule.enabled as bool;
    final color = enabled ? AppColors.primary : AppColors.mutedForeground;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: enabled ? AppColors.primary.withOpacity(0.3) : AppColors.border,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: color.withOpacity(0.15),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(Icons.auto_awesome, size: 18, color: color),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.sensors, size: 12, color: AppColors.mutedForeground),
                    const SizedBox(width: 4),
                    Text(
                      'IF',
                      style: GoogleFonts.inter(
                          fontSize: 9, fontWeight: FontWeight.w600, color: AppColors.mutedForeground, letterSpacing: 0.8),
                    ),
                  ],
                ),
                Text(
                  rule.condition as String,
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: AppColors.foreground,
                  ),
                ),
                const SizedBox(height: 6),
                Row(
                  children: [
                    const Icon(Icons.arrow_forward, size: 12, color: AppColors.mutedForeground),
                    const SizedBox(width: 4),
                    Text(
                      'THEN',
                      style: GoogleFonts.inter(
                          fontSize: 9, fontWeight: FontWeight.w600, color: AppColors.mutedForeground, letterSpacing: 0.8),
                    ),
                  ],
                ),
                Text(
                  rule.action as String,
                  style: GoogleFonts.inter(fontSize: 12, color: AppColors.secondaryForeground),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Switch(
            value: enabled,
            onChanged: (_) => onToggle(),
            activeColor: AppColors.primary,
            activeTrackColor: AppColors.primary.withOpacity(0.3),
            inactiveThumbColor: AppColors.mutedForeground,
            inactiveTrackColor: AppColors.border,
          ),
        ],
      ),
    );
  }
}

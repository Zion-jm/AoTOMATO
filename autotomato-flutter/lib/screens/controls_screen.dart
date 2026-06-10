import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../models/models.dart';
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
                  'Tap a device to turn it on or off',
                  style: GoogleFonts.inter(fontSize: 14, color: AppColors.mutedForeground),
                ),
                const SizedBox(height: 20),
                _sectionLabel('DEVICES'),
                const SizedBox(height: 4),
                Text(
                  'Tap the whole card to toggle a device',
                  style: GoogleFonts.inter(fontSize: 12, color: AppColors.mutedForeground),
                ),
                const SizedBox(height: 10),
                ...gh.devices.map((d) => _DeviceCard(
                      device: d,
                      onToggle: () => _confirmToggle(context, d, () {
                        HapticFeedback.lightImpact();
                        gh.toggleDevice(d.id);
                      }),
                    )),
                const SizedBox(height: 16),
                _sectionLabel('AUTOMATIC RULES'),
                const SizedBox(height: 4),
                Text(
                  'These rules run on their own — even when you\'re away',
                  style: GoogleFonts.inter(fontSize: 12, color: AppColors.mutedForeground),
                ),
                const SizedBox(height: 10),
                ...gh.automationRules.map((r) => _RuleCard(
                      rule: r,
                      onToggle: () {
                        HapticFeedback.lightImpact();
                        gh.toggleRule(r.id);
                      },
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
        fontSize: 12,
        fontWeight: FontWeight.w600,
        color: AppColors.mutedForeground,
        letterSpacing: 1.2,
      ),
    );
  }

  Future<void> _confirmToggle(
      BuildContext context, Device device, VoidCallback onConfirm) async {
    final isOn = device.isOn;
    await showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: AppColors.card,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: Text(
          isOn ? 'Turn off ${device.name}?' : 'Turn on ${device.name}?',
          style: GoogleFonts.inter(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: AppColors.foreground,
          ),
        ),
        content: Text(
          isOn ? _offConsequence(device.id) : _onConsequence(device.id),
          style: GoogleFonts.inter(
            fontSize: 15,
            color: AppColors.secondaryForeground,
            height: 1.55,
          ),
        ),
        actionsPadding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        actions: [
          SizedBox(
            width: double.infinity,
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.pop(ctx),
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(color: AppColors.border),
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                    child: Text(
                      'Cancel',
                      style: GoogleFonts.inter(
                          color: AppColors.mutedForeground,
                          fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(ctx);
                      onConfirm();
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor:
                          isOn ? AppColors.critical.withOpacity(0.85) : AppColors.primary,
                      foregroundColor: isOn ? Colors.white : Colors.black,
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                    child: Text(
                      isOn ? 'Turn Off' : 'Turn On',
                      style: GoogleFonts.inter(fontWeight: FontWeight.w700),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _offConsequence(String id) {
    switch (id) {
      case 'fan':
        return 'Turning off the fan may cause the temperature to rise. Check on your plants if it stays off for more than 10 minutes.';
      case 'pump':
        return 'Turning off the water pump will stop watering. Make sure the soil doesn\'t dry out.';
      case 'growLight':
        return 'Turning off the grow lights will reduce the light available to your plants.';
      case 'fogger':
        return 'Turning off the fogger will lower humidity in the greenhouse.';
      default:
        return 'Are you sure you want to turn this off?';
    }
  }

  String _onConsequence(String id) {
    switch (id) {
      case 'fan':
        return 'This will turn on the exhaust fan to cool down and ventilate the greenhouse.';
      case 'pump':
        return 'This will start the water pump and begin watering your plants.';
      case 'growLight':
        return 'This will turn on the grow lights to give your plants more light.';
      case 'fogger':
        return 'This will start the mist fogger to increase humidity in the greenhouse.';
      default:
        return 'Are you sure you want to turn this on?';
    }
  }
}

class _DeviceCard extends StatelessWidget {
  final Device device;
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
    final isOn = device.isOn;
    final color = isOn ? AppColors.primary : AppColors.mutedForeground;

    return GestureDetector(
      onTap: onToggle,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isOn ? AppColors.primary.withOpacity(0.5) : AppColors.border,
            width: isOn ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: color.withOpacity(0.15),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(_icon(device.type), size: 26, color: color),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    device.name,
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: AppColors.foreground,
                    ),
                  ),
                  if (device.note != null)
                    Text(
                      device.note!,
                      style: GoogleFonts.inter(
                          fontSize: 12, color: AppColors.mutedForeground),
                    ),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: color.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      isOn ? 'RUNNING' : 'STANDBY',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
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
      ),
    );
  }
}

class _RuleCard extends StatelessWidget {
  final AutomationRule rule;
  final VoidCallback onToggle;

  const _RuleCard({required this.rule, required this.onToggle});

  @override
  Widget build(BuildContext context) {
    final enabled = rule.enabled;
    final color = enabled ? AppColors.primary : AppColors.mutedForeground;

    return GestureDetector(
      onTap: onToggle,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: enabled ? AppColors.primary.withOpacity(0.35) : AppColors.border,
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: color.withOpacity(0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(Icons.auto_awesome, size: 22, color: color),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding:
                            const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: enabled
                              ? AppColors.primary.withOpacity(0.15)
                              : AppColors.border,
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          enabled ? 'AUTO-ACTIVE' : 'PAUSED',
                          style: GoogleFonts.inter(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: enabled ? AppColors.primary : AppColors.mutedForeground,
                            letterSpacing: 0.6,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'When:',
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: AppColors.mutedForeground,
                    ),
                  ),
                  Text(
                    rule.condition,
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.foreground,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      Icon(Icons.arrow_forward,
                          size: 13, color: AppColors.mutedForeground),
                      const SizedBox(width: 4),
                      Text(
                        'Then:',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: AppColors.mutedForeground,
                        ),
                      ),
                    ],
                  ),
                  Text(
                    rule.action,
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      color: AppColors.secondaryForeground,
                      height: 1.4,
                    ),
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
      ),
    );
  }
}

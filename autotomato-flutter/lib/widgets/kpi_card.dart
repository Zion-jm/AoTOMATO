import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/app_colors.dart';

class KpiCard extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String value;
  final String label;
  final String? sublabel;

  const KpiCard({
    super.key,
    required this.icon,
    required this.iconColor,
    required this.value,
    required this.label,
    this.sublabel,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: iconColor.withOpacity(0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, size: 18, color: iconColor),
            ),
            const SizedBox(height: 8),
            Text(
              value,
              style: GoogleFonts.inter(
                fontSize: 22,
                fontWeight: FontWeight.w700,
                color: AppColors.foreground,
              ),
            ),
            Text(
              label,
              style: GoogleFonts.inter(
                fontSize: 11,
                color: AppColors.mutedForeground,
              ),
            ),
            if (sublabel != null)
              Text(
                sublabel!,
                style: GoogleFonts.inter(
                  fontSize: 10,
                  color: AppColors.mutedForeground,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

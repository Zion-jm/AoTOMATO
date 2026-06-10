import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../theme/app_colors.dart';

class CameraScreen extends StatelessWidget {
  const CameraScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        bottom: false,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Camera',
                style: GoogleFonts.inter(
                  fontSize: 28,
                  fontWeight: FontWeight.w700,
                  color: AppColors.foreground,
                  letterSpacing: -0.5,
                ),
              ),
              Text(
                'Live greenhouse feed',
                style: GoogleFonts.inter(fontSize: 13, color: AppColors.mutedForeground),
              ),
              const SizedBox(height: 20),
              Expanded(
                child: Container(
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: AppColors.card,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 64,
                        height: 64,
                        decoration: BoxDecoration(
                          color: AppColors.primary.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(18),
                        ),
                        child: const Icon(Icons.camera_alt_outlined,
                            size: 32, color: AppColors.primary),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Camera Feed',
                        style: GoogleFonts.inter(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: AppColors.foreground,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Connect an IP camera or\nRaspberry Pi camera module',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          color: AppColors.mutedForeground,
                          height: 1.5,
                        ),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 24),
                      _FeatureRow(icon: Icons.videocam_outlined, label: 'RTSP / HTTP stream support'),
                      _FeatureRow(icon: Icons.motion_photos_on_outlined, label: 'Motion detection alerts'),
                      _FeatureRow(icon: Icons.photo_library_outlined, label: 'Time-lapse capture'),
                      _FeatureRow(icon: Icons.crop_free, label: 'Plant growth overlay'),
                      const SizedBox(height: 24),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: AppColors.primary.withOpacity(0.3)),
                        ),
                        child: Text(
                          'Configure camera IP in Settings',
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _FeatureRow extends StatelessWidget {
  final IconData icon;
  final String label;

  const _FeatureRow({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 16, color: AppColors.primary),
          const SizedBox(width: 10),
          Text(
            label,
            style: GoogleFonts.inter(fontSize: 13, color: AppColors.secondaryForeground),
          ),
        ],
      ),
    );
  }
}

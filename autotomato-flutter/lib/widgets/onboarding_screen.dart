import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../theme/app_colors.dart';

class OnboardingScreen extends StatefulWidget {
  final VoidCallback onDone;
  const OnboardingScreen({super.key, required this.onDone});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _controller = PageController();
  int _page = 0;

  static const _slides = [
    (
      icon: Icons.dashboard_rounded,
      color: Color(0xFF4ADE80),
      title: 'See Your Greenhouse at a Glance',
      body:
          'The Dashboard shows you how healthy your plants are right now.\n\nGreen means everything is good. Yellow means check soon. Red means action is needed right away.',
    ),
    (
      icon: Icons.tune_rounded,
      color: Color(0xFF60A5FA),
      title: 'Control Your Devices',
      body:
          'The Controls screen lets you turn the fan, water pump, and lights on or off with a single tap.\n\nAutomation rules handle things for you automatically — even when you\'re away.',
    ),
    (
      icon: Icons.notifications_rounded,
      color: Color(0xFFFACC15),
      title: 'Get Notified Before Problems Happen',
      body:
          'The Alerts screen tells you when your plants need attention.\n\nThe Risk Prediction screen warns you about problems up to an hour before they occur — so you can act early.',
    ),
  ];

  Future<void> _finish() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('onboarding_done', true);
    widget.onDone();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'auTOMATO',
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: AppColors.primary,
                    ),
                  ),
                  TextButton(
                    onPressed: _finish,
                    child: Text(
                      'Skip',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        color: AppColors.mutedForeground,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: PageView.builder(
                controller: _controller,
                itemCount: _slides.length,
                onPageChanged: (i) => setState(() => _page = i),
                itemBuilder: (context, i) {
                  final slide = _slides[i];
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 36),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 110,
                          height: 110,
                          decoration: BoxDecoration(
                            color: slide.color.withOpacity(0.12),
                            shape: BoxShape.circle,
                            border: Border.all(
                              color: slide.color.withOpacity(0.3),
                              width: 2,
                            ),
                          ),
                          child: Icon(slide.icon, size: 54, color: slide.color),
                        ),
                        const SizedBox(height: 36),
                        Text(
                          slide.title,
                          style: GoogleFonts.inter(
                            fontSize: 26,
                            fontWeight: FontWeight.w700,
                            color: AppColors.foreground,
                            height: 1.2,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 20),
                        Text(
                          slide.body,
                          style: GoogleFonts.inter(
                            fontSize: 16,
                            color: AppColors.secondaryForeground,
                            height: 1.7,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(32, 0, 32, 32),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(_slides.length, (i) {
                      return AnimatedContainer(
                        duration: const Duration(milliseconds: 250),
                        margin: const EdgeInsets.symmetric(horizontal: 4),
                        width: i == _page ? 28 : 8,
                        height: 8,
                        decoration: BoxDecoration(
                          color: i == _page
                              ? AppColors.primary
                              : AppColors.mutedForeground.withOpacity(0.3),
                          borderRadius: BorderRadius.circular(4),
                        ),
                      );
                    }),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {
                        if (_page < _slides.length - 1) {
                          _controller.nextPage(
                            duration: const Duration(milliseconds: 300),
                            curve: Curves.easeInOut,
                          );
                        } else {
                          _finish();
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(vertical: 17),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14),
                        ),
                        elevation: 0,
                      ),
                      child: Text(
                        _page < _slides.length - 1 ? 'Next  →' : "Let's Start!",
                        style: GoogleFonts.inter(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

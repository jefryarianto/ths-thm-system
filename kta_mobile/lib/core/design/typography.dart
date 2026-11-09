import 'package:flutter/material.dart';
import 'colors.dart';

class KTATypography {
  static const String fontFamily = 'KTADejaVu';

  // Size conversions
  static double mm(double mm) => mm * 10.0;
  static double pt(double pt) => pt * 25.4 / 72.0 * 10.0;

  // Front card text styles
  static const TextStyle orgHeader1 = TextStyle(
    fontFamily: fontFamily,
    fontSize: 5.2 * 25.4 / 72.0 * 10.0,
    fontWeight: FontWeight.w700,
    color: KTAColors.offWhite,
    height: 1.0,
  );

  static const TextStyle orgHeader2 = TextStyle(
    fontFamily: fontFamily,
    fontSize: 6.4 * 25.4 / 72.0 * 10.0,
    fontWeight: FontWeight.w700,
    color: KTAColors.offWhite,
    height: 1.0,
  );

  static const TextStyle orgHeader3 = TextStyle(
    fontFamily: fontFamily,
    fontSize: 5.6 * 25.4 / 72.0 * 10.0,
    fontWeight: FontWeight.w700,
    color: KTAColors.offWhite,
    height: 1.0,
  );

  static const TextStyle cardTitle = TextStyle(
    fontFamily: fontFamily,
    fontSize: 6.4 * 25.4 / 72.0 * 10.0,
    fontWeight: FontWeight.w700,
    color: KTAColors.gold,
    height: 1.0,
  );

  static const TextStyle sectionLabel = TextStyle(
    fontFamily: fontFamily,
    fontSize: 4.0 * 25.4 / 72.0 * 10.0,
    fontWeight: FontWeight.w700,
    color: KTAColors.darkText,
    height: 1.0,
  );

  static const TextStyle namePrimary = TextStyle(
    fontFamily: fontFamily,
    fontSize: 7.0 * 25.4 / 72.0 * 10.0,
    fontWeight: FontWeight.w700,
    color: KTAColors.darkText,
    height: 1.0,
  );

  static const TextStyle genderCode = TextStyle(
    fontFamily: fontFamily,
    fontSize: 7.0 * 25.4 / 72.0 * 10.0,
    fontWeight: FontWeight.w700,
    color: KTAColors.mediumText,
    height: 1.0,
  );

  static const TextStyle dadarInfo = TextStyle(
    fontFamily: fontFamily,
    fontSize: 5.1 * 25.4 / 72.0 * 10.0,
    fontWeight: FontWeight.w700,
    color: KTAColors.darkText,
    height: 1.0,
  );

  static const TextStyle rantingLine = TextStyle(
    fontFamily: fontFamily,
    fontSize: 5.1 * 25.4 / 72.0 * 10.0,
    fontWeight: FontWeight.w700,
    color: KTAColors.darkText,
    height: 1.0,
  );

  static const TextStyle memberNoLabel = TextStyle(
    fontFamily: fontFamily,
    fontSize: 4.0 * 25.4 / 72.0 * 10.0,
    fontWeight: FontWeight.w700,
    color: KTAColors.darkText,
    height: 1.0,
  );

  static const TextStyle memberNumber = TextStyle(
    fontFamily: fontFamily,
    fontSize: 5.2 * 25.4 / 72.0 * 10.0,
    fontWeight: FontWeight.w700,
    color: KTAColors.darkText,
    height: 1.0,
  );

  static const TextStyle expiryLabel = TextStyle(
    fontFamily: fontFamily,
    fontSize: 5.0 * 25.4 / 72.0 * 10.0,
    fontWeight: FontWeight.w700,
    color: KTAColors.darkText,
    height: 1.0,
  );

  // Back card text styles
  static const TextStyle backSectionTitle = TextStyle(
    fontFamily: fontFamily,
    fontSize: 7.0 * 25.4 / 72.0 * 10.0,
    fontWeight: FontWeight.w700,
    color: KTAColors.gold,
    height: 1.0,
  );

  static const TextStyle backFieldLabel = TextStyle(
    fontFamily: fontFamily,
    fontSize: 4.0 * 25.4 / 72.0 * 10.0,
    fontWeight: FontWeight.w700,
    color: KTAColors.darkText,
    height: 1.0,
  );

  static const TextStyle backFieldValue = TextStyle(
    fontFamily: fontFamily,
    fontSize: 5.3 * 25.4 / 72.0 * 10.0,
    fontWeight: FontWeight.w700,
    color: KTAColors.darkText,
    height: 1.0,
  );

  static const TextStyle addressLabel = TextStyle(
    fontFamily: fontFamily,
    fontSize: 4.0 * 25.4 / 72.0 * 10.0,
    fontWeight: FontWeight.w700,
    color: KTAColors.darkText,
    height: 1.0,
  );

  static const TextStyle addressLines = TextStyle(
    fontFamily: fontFamily,
    fontSize: 5.3 * 25.4 / 72.0 * 10.0,
    fontWeight: FontWeight.w400,
    color: KTAColors.darkText,
    height: 1.0,
  );

  static const TextStyle footerIssueDate = TextStyle(
    fontFamily: fontFamily,
    fontSize: 5.0 * 25.4 / 72.0 * 10.0,
    fontWeight: FontWeight.w400,
    color: KTAColors.darkText,
    height: 1.0,
  );

  static const TextStyle coordinatorLabel = TextStyle(
    fontFamily: fontFamily,
    fontSize: 4.0 * 25.4 / 72.0 * 10.0,
    fontWeight: FontWeight.w700,
    color: KTAColors.darkText,
    height: 1.0,
  );

  static const TextStyle coordinatorName = TextStyle(
    fontFamily: fontFamily,
    fontSize: 5.0 * 25.4 / 72.0 * 10.0,
    fontWeight: FontWeight.w400,
    color: KTAColors.darkText,
    height: 1.0,
  );

  static const TextStyle microtext = TextStyle(
    fontFamily: fontFamily,
    fontSize: 2.6 * 25.4 / 72.0 * 10.0,
    fontWeight: FontWeight.w400,
    color: KTAColors.microtextNavy,
    height: 1.0,
  );

  // Helper for triple-layer shadow (engraved effect)
  static List<Shadow> engravedShadow({bool isGold = false}) => [
    const Shadow(
      offset: Offset(1.4, 1.4),
      color: KTAColors.shadowNavy,
    ),
    Shadow(
      offset: const Offset(-0.9, -0.9),
      color: isGold ? KTAColors.highlightGold : KTAColors.highlightWhite,
    ),
    Shadow(
      offset: Offset.zero,
      color: isGold ? KTAColors.gold : KTAColors.offWhite,
    ),
  ];
}

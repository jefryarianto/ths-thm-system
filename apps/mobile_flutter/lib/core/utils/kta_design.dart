import 'package:flutter/painting.dart';

class KtaColors {
  static const Color primaryNavy = Color(0xFF0B377B);
  static const Color deepNavy = Color(0xFF143B76);
  static const Color mediumBlue = Color(0xFF185AB5);
  static const Color brightBlue = Color(0xFF3373AE);
  static const Color gold = Color(0xFFF8DB38);
  static const Color lightGold = Color(0xFFFFF2A1);
  static const Color warmGold = Color(0xFFE4B500);
  static const Color white = Color(0xFFFFFFFF);
  static const Color offWhite = Color(0xFFDFEAF3);
  static const Color darkText = Color(0xFF111C25);
  static const Color mediumText = Color(0xFF000000);
  static const Color lightText = Color(0xFF8193A0);
  static const Color borderBlue = Color(0xFFA9B9CB);
  static const Color photoPlaceholder = Color(0xFFDDE6EA);
  static const Color qrWhite = Color(0xFFFFFFFF);
  static const Color microtextNavy = Color(0xFF0B377B);
  static const Color signatureLine = Color(0xFF0B377B);
  static const Color badgeBlue = Color(0xFF185AB5);
  static const Color badgeGold = Color(0xFFE4B500);
  static const Color shadowNavy = Color(0xFF17394F);
  static const Color highlightWhite = Color(0xFFFFFFFF);
  static const Color highlightGold = Color(0xFFFFF2A1);
}

/// Canvas size: 856 x 539.8 (SVG units = logical pixels)
class KtaPositions {
  // Identity Text Base Column
  static const double cardX = 306.0;

  // Photo
  static const double photoX = 44.0;
  static const double photoY = 145.8;
  static const double photoW = 240.0;
  static const double photoH = 300.0;
  static const double photoRadius = 14.0;

  // Rank Badges
  static const double badgeX = 47.5;
  static const double badgeW = 233.0;
  static const double badgeH = 15.0;
  static const double badgeRadius = 15.0;
  static const double badgeY1 = 470.3;
  static const double badgeY2a = 463.85;
  static const double badgeY2b = 479.35;
  static const double badgeY3a = 454.8;
  static const double badgeY3b = 470.8;
  static const double badgeY3c = 486.8;

  // Logo
  static const double logoX = 700.0;
  static const double logoY = 30.8;
  static const double logoW = 112.0;
  static const double logoH = 112.0;

  // Header Right Anchor
  static const double headerRightX = 683.0;

  // QR Code
  static const double qrX = 641.0;
  static const double qrY = 319.8; // (53.98 - 22.0) * 10
  static const double qrSize = 185.0;

  // Expiry Line & Text
  static const double expiryLineX = 625.0;
  static const double expiryTextX = 733.5;
}

class KtaText {
  static const double ptOrgHeader1 = 5.2;
  static const double ptOrgHeader2 = 6.4;
  static const double ptOrgHeader3 = 5.6;
  static const double ptCardTitle = 6.4;
  static const double ptSectionLabel = 4.0;
  static const double ptNamePrimaryBase = 7.0;
  static const double ptNamePrimaryMin = 3.8;
  static const double ptDadar = 5.1;
  static const double ptRanting = 5.1;
  static const double ptMemberNo = 5.2;
  static const double ptExpiry = 5.0;
  static const double ptBackSectionTitle = 7.0;
  static const double ptBackFieldLabel = 4.0;
  static const double ptBackFieldValueMin = 3.6;
  static const double ptMicrotext = 2.6;
}

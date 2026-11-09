class KTALayout {
  // Card dimensions (logical pixels, 10×mm)
  static const double cardWidth = 856.0;
  static const double cardHeight = 539.8;
  static const double cornerRadius = 31.8;

  // Y-position from bottom (matching layout.ts y() function)
  static double y(double bottomMm) => (53.98 - bottomMm) * 10.0;

  // Photo frame
  static const double photoX = 44.0;
  static const double photoY = 145.8;
  static const double photoWidth = 240.0;
  static const double photoHeight = 300.0;
  static const double photoRadius = 14.0;

  static const double logoX = 700.0;
  static const double logoY = 30.8;
  static const double logoSize = 112.0;

  static const double badgeContainerX = 44.0;
  static const double badgeContainerY = 453.8;
  static const double badgeContainerWidth = 240.0;
  static const double badgeContainerHeight = 48.0;
  static const double badgeContainerRadius = 3.0;

  static const double badgeX = 47.5;
  static const double badgeWidth = 233.0;
  static const double badgeHeight = 15.0;
  static const double badgeRadius = 1.5;

  // QR code
  static const double qrX = 641.0;
  static const double qrY = 22.0;
  static const double qrSize = 185.0;

  // Text positions (x coordinates)
  static const double leftColumnX = 44.0;
  static const double rightColumnX = 306.0;
  static const double headerX = 683.0;
  static const double expiryX = 733.5;
  static const double dividerX = 625.0;

  // Back card layout
  static const double backLabelX = 44.0;
  static const double backColonX = 271.0;
  static const double backValueX = 292.0;
  static const double coordinatorX = 481.0;
  static const double signatureY = 421.0;
  static const double signatureWidth = 254.0;
  static const double signatureHeight = 50.0;
}

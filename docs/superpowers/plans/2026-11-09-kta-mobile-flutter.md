# KTA Mobile Flutter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Flutter mobile app for members to view their KTA card (both sides) with offline support, PNG export, and print/share capabilities, faithfully replicating the Paket E-Card SVG design.

**Architecture:** Recreate the SVG layout using Flutter's `CustomPainter` and widget tree with the same 10×mm coordinate system (856 × 539.8 logical pixels). Bundle DejaVu Sans fonts and background assets. Use `qr_flutter` for QR generation with custom painter for gradient + logo. State management via Riverpod or Provider.

**Tech Stack:** Flutter 3.16+, Dart 3.2+, `qr_flutter` for QR, `flutter_svg` for logo (or `Image.asset`), `printing` + `pdf` for PDF export, `share_plus` for sharing, `http`/`dio` for API, `flutter_secure_storage` for tokens.

**Spec:** `Paket E-Card/.stitch/DESIGN.md`

## Global Constraints

- **Exact visual fidelity** to Paket E-Card SVG — same colors, positions, typography, measurements
- **Coordinate system**: 10×mm scaling (856 × 539.8 logical pixels = 85.6 × 53.98 mm)
- **Font**: DejaVu Sans (regular/bold) bundled as assets, loaded via `FontLoader`
- **Colors**: Map DESIGN.md tokens to `Color` constants exactly
- **Backgrounds**: `depan.png`/`belakang.png` as full-bleed `Image.asset` in `Stack`
- **QR Code**: `qr_flutter` with custom `QrPainter` for gradient modules + centered logo
- **Photo**: `ClipRRect` + `BoxFit.cover` in 240×300 logical pixel frame (14px radius)
- **Rank Badges**: `Container` with `BoxDecoration` (color, rounded corners)
- **Text Auto-fit**: Replicate `fitSingle`/`wrap` logic using `TextPainter` for dynamic sizing
- **Export**: `RenderRepaintBoundary` → `toImage()` → PNG bytes → share/save/print
- **PDF Print**: `printing` package, PDF at 600 DPI with correct CR80 page size + bleed
- **Offline**: Cache member data + assets for offline viewing
- **Indonesian Locale**: `toUpperCase()` with Indonesian locale handling for dotted 'I'

## Review Focus

1. **Text overflow/clipping** → Auto-fit logic matches SVG (min sizes: name 3.8pt, data 3.6pt, address 4.0pt)
2. **QR scannability** → Gradient modules + logo don't break readers; test on physical device
3. **Font licensing** → DejaVu Sans license permits mobile app bundling (verify LICENSE-DejaVu.txt)
4. **Image CORS** → Not an issue in Flutter (assets bundled), but network images need proper handling
5. **Physical print dimensions** → PDF output matches 85.6×53.98mm trim with 2mm bleed

---

### Task 1: Create Flutter Project Structure & Assets

**Files:**
- Create: `pubspec.yaml` (dependencies + assets)
- Create: `assets/fonts/DejaVuSans.ttf` (copy from Paket E-Card)
- Create: `assets/fonts/DejaVuSans-Bold.ttf` (copy from Paket E-Card)
- Create: `assets/images/background/depan.png` (copy from Paket E-Card)
- Create: `assets/images/background/belakang.png` (copy from Paket E-Card)
- Create: `assets/images/logo.png` (copy from Paket E-Card)

**Interfaces:**
- Produces: Flutter project with all assets declared and fonts registered

- [ ] **Step 1: Initialize Flutter project**
```bash
flutter create kta_mobile --org com.ths.thm
cd kta_mobile
```

- [ ] **Step 2: Copy assets to project**
```bash
mkdir -p assets/fonts assets/images/background
cp "Paket E-Card/public/kta/fonts/DejaVuSans.ttf" assets/fonts/
cp "Paket E-Card/public/kta/fonts/DejaVuSans-Bold.ttf" assets/fonts/
cp "Paket E-Card/public/kta/background/depan.png" assets/images/background/
cp "Paket E-Card/public/kta/background/belakang.png" assets/images/background/
cp "Paket E-Card/public/kta/logo.png" assets/images/
```

- [ ] **Step 3: Configure pubspec.yaml**
```yaml
# pubspec.yaml
dependencies:
  flutter:
    sdk: flutter
  qr_flutter: ^4.1.0
  printing: ^5.11.0
  pdf: ^3.10.0
  share_plus: ^7.2.0
  http: ^1.1.0
  flutter_secure_storage: ^9.0.0
  provider: ^6.1.0  # or riverpod: ^2.4.0
  path_provider: ^2.1.0

dev_dependencies:
  flutter_test:
    sdk: flutter
  integration_test:
    sdk: flutter

flutter:
  uses-material-design: true
  assets:
    - assets/fonts/
    - assets/images/background/
    - assets/images/logo.png
  fonts:
    - family: KTADejaVu
      fonts:
        - asset: assets/fonts/DejaVuSans.ttf
          weight: 400
        - asset: assets/fonts/DejaVuSans-Bold.ttf
          weight: 700
```

- [ ] **Step 4: Run pub get**
```bash
flutter pub get
```

- [ ] **Step 5: Commit**
```bash
git add pubspec.yaml assets/
git commit -m "feat: initialize Flutter project with KTA assets and fonts"
```

---

### Task 2: Define Design Tokens & Color Constants

**Files:**
- Create: `lib/core/design/colors.dart`
- Create: `lib/core/design/typography.dart`
- Create: `lib/core/design/layout.dart`
- Create: `lib/core/design/tokens.dart` (exports all)

**Interfaces:**
- Produces: `KTAColors`, `KTATypography`, `KTALayout` classes with exact values from DESIGN.md

- [ ] **Step 1: Write failing test**
```dart
// test/core/design/colors_test.dart
import 'package:kta_mobile/core/design/colors.dart';

void main() {
  test('KTAColors match DESIGN.md hex values', () {
    expect(KTAColors.primaryNavy, equals(Color(0xFF0B377B)));
    expect(KTAColors.gold, equals(Color(0xFFF8DB38)));
    expect(KTAColors.badgeBlue, equals(Color(0xFF185AB5)));
    expect(KTAColors.badgeGold, equals(Color(0xFFE4B500)));
    // ... all tokens
  });
}
```

- [ ] **Step 2: Implement color constants**
```dart
// lib/core/design/colors.dart
import 'package:flutter/material.dart';

class KTAColors {
  // Primary Foundation
  static const Color primaryNavy = Color(0xFF0B377B);
  static const Color deepNavy = Color(0xFF143B76);
  static const Color mediumBlue = Color(0xFF185AB5);
  static const Color brightBlue = Color(0xFF3373AE);
  static const Color white = Color(0xFFFFFFFF);
  static const Color offWhite = Color(0xFFDFEAF3);
  
  // Accent & Interactive
  static const Color gold = Color(0xFFF8DB38);
  static const Color lightGold = Color(0xFFFFF2A1);
  static const Color warmGold = Color(0xFFE4B500);
  
  // Typography
  static const Color darkText = Color(0xFF111C25);
  static const Color mediumText = Color(0xFF000000);
  static const Color lightText = Color(0xFF8193A0);
  
  // Functional
  static const Color borderBlue = Color(0xFFA9B9CB);
  static const Color photoPlaceholder = Color(0xFFDDE6EA);
  static const Color microtextNavy = Color(0xFF0B377B);
  static const Color signatureLine = Color(0xFF0B377B);
  static const Color shadowNavy = Color(0xFF17394F);
  static const Color highlightWhite = Color(0xFFFFFFFF);
  static const Color highlightGold = Color(0xFFFFF2A1);
  
  // Rank Badges
  static const Color badgeBlue = Color(0xFF185AB5);
  static const Color badgeGold = Color(0xFFE4B500);
}
```

- [ ] **Step 3: Implement typography constants**
```dart
// lib/core/design/typography.dart
import 'package:flutter/material.dart';
import 'colors.dart';

class KTATypography {
  static const String fontFamily = 'KTADejaVu';
  
  // Size in mm → logical pixels (×10)
  static double mm(double mm) => mm * 10.0;
  static double pt(double pt) => pt * 25.4 / 72 * 10; // matching layout.ts
  
  // Front sizes
  static const TextStyle orgHeader1 = TextStyle(
    fontFamily: fontFamily, fontSize: 5.2 * 25.4 / 72 * 10, fontWeight: FontWeight.w700,
    color: KTAColors.offWhite, height: 1.0,
  );
  // ... all styles from DESIGN.md Table 3
  
  // Helper for triple-layer shadow (engraved effect)
  static List<Shadow> engravedShadow({bool isGold = false}) => [
    Shadow(offset: Offset(1.4, 1.4), color: KTAColors.shadowNavy),
    Shadow(offset: Offset(-0.9, -0.9), color: isGold ? KTAColors.highlightGold : KTAColors.highlightWhite),
    Shadow(offset: Offset(0, 0), color: isGold ? KTAColors.gold : KTAColors.offWhite),
  ];
}
```

- [ ] **Step 4: Implement layout constants**
```dart
// lib/core/design/layout.dart
class KTALayout {
  // Card dimensions (logical pixels, 10×mm)
  static const double cardWidth = 856.0;
  static const double cardHeight = 539.8;
  static const double cornerRadius = 31.8; // 3.18mm
  
  // Y-position from bottom (matching layout.ts y() function)
  static double y(double bottomMm) => (53.98 - bottomMm) * 10.0;
  
  // Photo frame
  static const double photoX = 44.0;
  static const double photoY = 145.8;
  static const double photoWidth = 240.0;
  static const double photoHeight = 300.0;
  static const double photoRadius = 14.0;
  
  // Rank badges
  static const double badgeX = 47.5;
  static const double badgeWidth = 233.0;
  static const double badgeHeight = 15.0;
  static const double badgeRadius = 1.5;
  
  // QR code
  static const double qrX = 641.0;
  static const double qrY = 22.0; // will use y(22)
  static const double qrSize = 185.0;
  
  // Text positions (x coordinates)
  static const double leftColumnX = 44.0;
  static const double rightColumnX = 306.0;
  static const double headerX = 683.0;
  static const double expiryX = 733.5;
  static const double dividerX = 625.0;
}
```

- [ ] **Step 5: Run test to verify it passes**
```bash
flutter test test/core/design/colors_test.dart
```
Expected: PASS

- [ ] **Step 6: Commit**
```bash
git add lib/core/design/
git commit -m "feat: add KTA design tokens (colors, typography, layout)"
```

---

### Task 3: Create Anggota Data Model & API Service

**Files:**
- Create: `lib/features/kta/data/models/anggota.dart`
- Create: `lib/features/kta/data/services/kta_api_service.dart`
- Create: `lib/features/kta/data/repositories/kta_repository.dart`

**Interfaces:**
- Consumes: Backend API endpoints
- Produces: `Anggota` model (matching `types.ts`), `KtaApiService`, `KtaRepository`

- [ ] **Step 1: Write failing test**
```dart
// test/features/kta/data/models/anggota_test.dart
import 'package:kta_mobile/features/kta/data/models/anggota.dart';

void main() {
  test('Anggota fromJson matches TypeScript interface', () {
    final json = {
      'nama': 'TEST', 'jenisKelamin': 'L', 'nomor': '001',
      'ranting': 'RANTING', 'tempatDadar': 'TEMPAT', 'tahunDadar': '2024',
      'tingkatan': 'tamtama', 'berlakuSampai': '2031-10',
      'fotoUrl': null, 'qrImageUrl': null, 'verifyUrl': 'https://...',
      'tempatTanggalLahir': 'TEMPAT, 1 JAN 2000', 'pekerjaan': 'PEKERJAAN',
      'status': 'AKTIF', 'alamat': 'ALAMAT', 'tahunPelantikan': '2024',
      'tanggalTerbit': '1 JAN 2024',
    };
    final a = Anggota.fromJson(json);
    expect(a.nama, 'TEST');
    expect(a.tingkatan, Tingkatan.tamtama);
  });
}
```

- [ ] **Step 2: Implement Anggota model**
```dart
// lib/features/kta/data/models/anggota.dart
enum Tingkatan { pratama, tamtama, muda, madya, utama }
enum JenisKelamin { L, P }

class Anggota {
  final String nama;
  final JenisKelamin? jenisKelamin;
  final String nomor;
  final String ranting;
  final String tempatDadar;
  final String tahunDadar;
  final String? berlakuSampai;
  final Tingkatan tingkatan;
  final String? fotoUrl;
  final String? qrImageUrl;
  final String? verifyUrl;
  final String tempatTanggalLahir;
  final String pekerjaan;
  final String status;
  final String? tanggalPelantikan;
  final String? tahunPelantikan;
  final String alamat;
  final String? tanggalTerbit;
  final String? koordinator;
  final String? tandaTanganUrl;

  Anggota({...}); // constructor
  
  factory Anggota.fromJson(Map<String, dynamic> json) => Anggota(
    nama: json['nama'] as String,
    jenisKelamin: json['jenisKelamin'] != null 
        ? JenisKelamin.values.byName(json['jenisKelamin'] as String) 
        : null,
    // ... all fields
    tingkatan: Tingkatan.values.byName(json['tingkatan'] as String),
  );
  
  Map<String, dynamic> toJson() => { ... };
}
```

- [ ] **Step 3: Implement API service**
```dart
// lib/features/kta/data/services/kta_api_service.dart
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../models/anggota.dart';

class KtaApiService {
  final String baseUrl;
  final String? Function() getToken;
  
  KtaApiService({required this.baseUrl, required this.getToken});
  
  Future<Anggota> fetchAnggota(String id) async {
    final token = getToken();
    final res = await http.get(
      Uri.parse('$baseUrl/anggota/$id'),
      headers: {'Authorization': 'Bearer $token'},
    );
    if (res.statusCode != 200) throw Exception('Anggota tidak ditemukan');
    return Anggota.fromJson(jsonDecode(res.body));
  }
  
  Future<List<Anggota>> searchAnggota(String query) async {
    final token = getToken();
    final res = await http.get(
      Uri.parse('$baseUrl/anggota/search?q=${Uri.encodeComponent(query)}'),
      headers: {'Authorization': 'Bearer $token'},
    );
    if (res.statusCode != 200) throw Exception('Pencarian gagal');
    return (jsonDecode(res.body) as List).map((e) => Anggota.fromJson(e)).toList();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**
```bash
flutter test test/features/kta/data/
```
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add lib/features/kta/data/
git commit -m "feat: add Anggota model and API service"
```

---

### Task 4: Implement Text Auto-fit Logic (fitSingle/wrap)

**Files:**
- Create: `lib/core/text/text_fit.dart`

**Interfaces:**
- Consumes: `TextPainter` for measurement
- Produces: `fitSingle(text, maxWidth, baseSize, minSize, bold)` and `wrap(text, maxWidth, maxLines, baseSize, minSize, bold)` returning fitted text with size and overflow flag

- [ ] **Step 1: Write failing test**
```dart
// test/core/text/text_fit_test.dart
import 'package:kta_mobile/core/text/text_fit.dart';

void main() {
  test('fitSingle reduces size to fit maxWidth', () {
    final result = fitSingle('VERY LONG NAME THAT NEEDS SHRINKING', 200, 70, 38, true);
    expect(result.size, lessThanOrEqualTo(70));
    expect(result.size, greaterThanOrEqualTo(38));
    expect(result.overflow, isFalse);
  });
  
  test('wrap splits text into max lines', () {
    final result = wrap('RANTING YANG NAMA NYA SANGAT PANJANG SEKALI', 275, 3, 51, 38, true);
    expect(result.lines.length, lessThanOrEqualTo(3));
    expect(result.overflow, isFalse);
  });
}
```

- [ ] **Step 2: Implement fitSingle**
```dart
// lib/core/text/text_fit.dart
import 'package:flutter/material.dart';

class FittedText {
  final String text;
  final double size;
  final bool overflow;
  FittedText({required this.text, required this.size, required this.overflow});
}

class WrappedText {
  final List<String> lines;
  final double size;
  final bool overflow;
  WrappedText({required this.lines, required this.size, required this.overflow});
}

TextPainter _createPainter(String text, double size, bool bold, {String fontFamily = 'KTADejaVu'}) {
  return TextPainter(
    text: TextSpan(text: text, style: TextStyle(
      fontFamily: fontFamily,
      fontSize: size,
      fontWeight: bold ? FontWeight.w700 : FontWeight.w400,
    )),
    textDirection: TextDirection.ltr,
  )..layout();
}

FittedText fitSingle(String text, double maxWidth, double baseSize, double minSize, bool bold) {
  String upper = text.trim().toUpperCase(); // Indonesian locale handled at call site
  double size = baseSize;
  while (size > minSize) {
    final painter = _createPainter(upper, size, bold);
    if (painter.width <= maxWidth) break;
    size = (size - 2.5).clamp(minSize, baseSize); // ~0.25mm steps in logical px
  }
  final painter = _createPainter(upper, size, bold);
  return FittedText(text: upper, size: size, overflow: painter.width > maxWidth);
}

WrappedText wrap(String text, double maxWidth, int maxLines, double baseSize, double minSize, bool bold) {
  String upper = text.trim().toUpperCase();
  List<String> words = upper.split(RegExp(r'\s+')).where((w) => w.isNotEmpty).toList();
  
  for (double size = baseSize; size >= minSize - 0.1; size -= 2.5) {
    List<String> lines = [];
    String currentLine = '';
    
    for (String word in words) {
      List<String> chunks = [];
      String chunk = '';
      for (String char in word.split('')) {
        final testChunk = chunk + char;
        final painter = _createPainter(testChunk, size, bold);
        if (chunk.isNotEmpty && painter.width > maxWidth) {
          chunks.add(chunk);
          chunk = char;
        } else {
          chunk = testChunk;
        }
      }
      if (chunk.isNotEmpty) chunks.add(chunk);
      
      for (String part in chunks) {
        String candidate = currentLine.isEmpty ? part : '$currentLine $part';
        final painter = _createPainter(candidate, size, bold);
        if (currentLine.isNotEmpty && painter.width > maxWidth) {
          lines.add(currentLine);
          currentLine = part;
        } else {
          currentLine = candidate;
        }
      }
    }
    if (currentLine.isNotEmpty) lines.add(currentLine);
    
    bool allFit = lines.every((l) => _createPainter(l, size, bold).width <= maxWidth);
    if (lines.length <= maxLines && allFit) {
      return WrappedText(lines: lines, size: size, overflow: false);
    }
  }
  return WrappedText(lines: [], size: minSize, overflow: true);
}
```

- [ ] **Step 3: Run test to verify it passes**
```bash
flutter test test/core/text/text_fit_test.dart
```
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add lib/core/text/text_fit.dart
git commit -m "feat: add text auto-fit logic (fitSingle/wrap)"
```

---

### Task 5: Build Front Side CustomPainter (KtaFrontPainter)

**Files:**
- Create: `lib/features/kta/presentation/painters/kta_front_painter.dart`

**Interfaces:**
- Consumes: `Anggota`, `KTALayout`, `KTATypography`, `KTAColors`, `fitSingle`, `wrap`
- Produces: `CustomPainter` that draws front side exactly matching SVG

- [ ] **Step 1: Write failing test**
```dart
// test/features/kta/presentation/painters/kta_front_painter_test.dart
import 'package:kta_mobile/features/kta/presentation/painters/kta_front_painter.dart';

void main() {
  test('KtaFrontPainter paints without error', () {
    final painter = KtaFrontPainter(anggota: mockAnggota);
    final picture = PictureRecorder();
    final canvas = Canvas(picture);
    painter.paint(canvas, Size(KTALayout.cardWidth, KTALayout.cardHeight));
    expect(picture.endRecording(), isNotNull);
  });
}
```

- [ ] **Step 2: Implement KtaFrontPainter**
```dart
// lib/features/kta/presentation/painters/kta_front_painter.dart
import 'package:flutter/material.dart';
import 'dart:ui' as ui;
import '../../data/models/anggota.dart';
import '../../../core/design/tokens.dart';
import '../../../core/text/text_fit.dart';

class KtaFrontPainter extends CustomPainter {
  final Anggota anggota;
  final ui.Image? backgroundImage;
  final ui.Image? logoImage;
  final ui.Image? photoImage;
  final ui.Image? qrImage;
  
  KtaFrontPainter({
    required this.anggota,
    this.backgroundImage,
    this.logoImage,
    this.photoImage,
    this.qrImage,
  });
  
  @override
  void paint(Canvas canvas, Size size) {
    final clipRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(0, 0, size.width, size.height),
      Radius.circular(KTALayout.cornerRadius),
    );
    canvas.clipRRect(clipRect);
    
    // 1. Background
    if (backgroundImage != null) {
      canvas.drawImageRect(
        backgroundImage!,
        Rect.fromLTWH(0, 0, backgroundImage!.width.toDouble(), backgroundImage!.height.toDouble()),
        Rect.fromLTWH(0, 0, size.width, size.height),
        Paint(),
      );
    }
    
    // 2. Logo
    if (logoImage != null) {
      canvas.drawImageRect(
        logoImage!,
        Rect.fromLTWH(0, 0, logoImage!.width.toDouble(), logoImage!.height.toDouble()),
        Rect.fromLTWH(KTALayout.logoX, KTALayout.logoY, KTALayout.logoSize, KTALayout.logoSize),
        Paint(),
      );
    }
    
    // 3. Organization Headers (right-aligned, triple-layer shadow)
    _drawHeaderText(canvas, 'ORGANISASI PENCAK SILAT PENDIDIKAN', KTALayout.headerX, KTALayout.y(49.45), KTATypography.pt(5.2), false);
    _drawHeaderText(canvas, 'TUNGGAL HATI SEMINARI – TUNGGAL HATI MARIA', KTALayout.headerX, KTALayout.y(46.4), KTATypography.pt(6.4), false);
    _drawHeaderText(canvas, 'DISTRIK KEUSKUPAN LARANTUKA', KTALayout.headerX, KTALayout.y(43.1), KTATypography.pt(5.6), false);
    _drawHeaderText(canvas, 'KARTU TANDA ANGGOTA', KTALayout.headerX, KTALayout.y(37.1), KTATypography.pt(6.4), true);
    
    // 4. Photo Frame
    final photoRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(KTALayout.photoX, KTALayout.photoY, KTALayout.photoWidth, KTALayout.photoHeight),
      Radius.circular(KTALayout.photoRadius),
    );
    canvas.drawRRect(photoRect, Paint()..color = KTAColors.photoPlaceholder);
    if (photoImage != null) {
      canvas.save();
      canvas.clipRRect(photoRect);
      canvas.drawImageRect(
        photoImage!,
        Rect.fromLTWH(0, 0, photoImage!.width.toDouble(), photoImage!.height.toDouble()),
        Rect.fromLTWH(KTALayout.photoX, KTALayout.photoY, KTALayout.photoWidth, KTALayout.photoHeight),
        Paint()..filterQuality = FilterQuality.high,
      );
      canvas.restore();
    }
    canvas.drawRRect(photoRect, Paint()..color = KTAColors.borderBlue..style = PaintingStyle.stroke..strokeWidth = 1);
    
    // 5. Rank Badges
    final badge = _getBadge(anggota.tingkatan);
    final badgeYs = badge.count == 1 
        ? [470.3] 
        : badge.count == 2 
            ? [KTALayout.y(6.45) - 15, KTALayout.y(4.45) - 15] 
            : [454.8, 470.8, 486.8];
    for (final yy in badgeYs) {
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(KTALayout.badgeX, yy, KTALayout.badgeWidth, KTALayout.badgeHeight),
          Radius.circular(KTALayout.badgeRadius),
        ),
        Paint()..color = badge.color,
      );
    }
    
    // 6. Identity Fields (right column)
    final nameText = anggota.nama.toUpperCase();
    final sex = anggota.jenisKelamin?.name ?? '';
    final nameFitted = fitSingle(nameText, 506 - (sex.isNotEmpty ? 40 + KTATypography.pt(7) : 0), KTATypography.pt(7), KTATypography.pt(3.8), true);
    final genderX = KTALayout.rightColumnX + _measureText(nameFitted.text, nameFitted.size, true) + 40;
    
    _drawLabel(canvas, 'NAMA LENGKAP', KTALayout.rightColumnX, KTALayout.y(33.5), 4.0);
    _drawTripleLayerText(canvas, nameFitted.text, KTALayout.rightColumnX, KTALayout.y(30.7), nameFitted.size, true);
    if (sex.isNotEmpty) {
      _drawText(canvas, sex, genderX, KTALayout.y(30.7), KTATypography.pt(7), true, KTAColors.mediumText);
    }
    
    final dadarText = '${anggota.tempatDadar}, ${anggota.tahunDadar}'.replaceAll(RegExp(r'^, |, $'), '');
    final dadarFitted = fitSingle(dadarText.isEmpty ? '[BELUM DIISI]' : dadarText, 275, KTATypography.pt(5.1), KTATypography.pt(3.8), true);
    _drawLabel(canvas, 'TEMPAT / TAHUN DADAR', KTALayout.rightColumnX, KTALayout.y(26.6), 4.0);
    _drawText(canvas, dadarFitted.text, KTALayout.rightColumnX, KTALayout.y(23.8), dadarFitted.size, true);
    
    final branchWrapped = wrap(anggota.ranting.isEmpty ? '[BELUM DIISI]' : anggota.ranting, 275, 3, KTATypography.pt(5.1), KTATypography.pt(3.8), true);
    _drawLabel(canvas, 'RANTING', KTALayout.rightColumnX, KTALayout.y(19.7), 4.0);
    for (int i = 0; i < branchWrapped.lines.length; i++) {
      _drawText(canvas, branchWrapped.lines[i], KTALayout.rightColumnX, KTALayout.y(16.9) + i * 25, branchWrapped.size, true);
    }
    
    final numberFitted = fitSingle(anggota.nomor.isEmpty ? '[BELUM DIISI]' : anggota.nomor, 275, KTATypography.pt(5.2), KTATypography.pt(3.8), true);
    _drawLabel(canvas, 'NO. ANGGOTA', KTALayout.rightColumnX, KTALayout.y(7.7), 4.0);
    _drawText(canvas, numberFitted.text, KTALayout.rightColumnX, KTALayout.y(4.9), numberFitted.size, true);
    
    // 7. Expiry
    final expiryText = _formatExpiry(anggota.berlakuSampai);
    _drawText(canvas, 'EXP: $expiryText', KTALayout.expiryX, KTALayout.y(23.4), KTATypography.pt(5), true, KTAColors.mediumText, align: TextAlign.center);
    
    // 8. Divider line
    canvas.drawLine(
      Offset(KTALayout.dividerX, KTALayout.y(20.99)),
      Offset(KTALayout.dividerX, KTALayout.y(4.51)),
      Paint()..color = KTAColors.primaryNavy..strokeWidth = 1.235,
    );
    
    // 9. QR Code (drawn via widget overlay, not painter)
    // 10. Microtext
    _drawMicrotext(canvas, 'PRO PATRIA ET ECCLESIA', KTALayout.y(0.75));
  }
  
  // Helper methods: _drawHeaderText, _drawLabel, _drawTripleLayerText, _drawText, _measureText, _getBadge, _formatExpiry, _drawMicrotext
  // ... implement all helpers matching SVG logic exactly
}
```

- [ ] **Step 3: Run test to verify it passes**
```bash
flutter test test/features/kta/presentation/painters/kta_front_painter_test.dart
```
Expected: PASS

- [ ] **Step 4: Commit**
```bash
git add lib/features/kta/presentation/painters/kta_front_painter.dart
git commit -m "feat: add KTA front side CustomPainter"
```

---

### Task 6: Build Back Side CustomPainter (KtaBackPainter)

**Files:**
- Create: `lib/features/kta/presentation/painters/kta_back_painter.dart`

**Interfaces:**
- Consumes: `Anggota`, design tokens, text fit helpers
- Produces: `CustomPainter` for back side matching SVG

- [ ] **Step 1: Implement similar to front painter**
Key differences:
- Background: `belakang.png`
- Title: "DATA ANGGOTA" in gold at (44, y(48.65))
- Data table: 5 rows (Nama, Tempat/Tgl Lahir, Pekerjaan, Status, Pelantikan) with label:value format
- Address block wrapping to 3 lines
- Footer: Issue date left, Coordinator right with signature line
- Microtext: "Fortiter in Re, Suaviter in Modo"

- [ ] **Step 2: Test and commit**
```bash
flutter test test/features/kta/presentation/painters/kta_back_painter_test.dart
git add lib/features/kta/presentation/painters/kta_back_painter.dart
git commit -m "feat: add KTA back side CustomPainter"
```

---

### Task 7: Create QR Code Widget with Gradient + Logo

**Files:**
- Create: `lib/features/kta/presentation/widgets/kta_qr_code.dart`

**Interfaces:**
- Consumes: `qr_flutter`, `Anggota` (verifyUrl or qrImageUrl), logo image
- Produces: Widget rendering QR matching SVG (gradient modules, centered logo)

- [ ] **Step 1: Implement custom QrPainter**
```dart
// lib/features/kta/presentation/widgets/kta_qr_code.dart
import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'dart:ui' as ui;

class KtaQrCode extends StatelessWidget {
  final String data;
  final ui.Image? logoImage;
  final double size; // 185 logical pixels
  
  const KtaQrCode({required this.data, this.logoImage, this.size = 185, super.key});
  
  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      size: Size(size, size),
      painter: _QrPainter(data: data, logoImage: logoImage, size: size),
    );
  }
}

class _QrPainter extends CustomPainter {
  final String data;
  final ui.Image? logoImage;
  final double size;
  
  _QrPainter({required this.data, this.logoImage, required this.size});
  
  @override
  void paint(Canvas canvas, Size canvasSize) {
    final qrCode = QrCode(4, QrErrorCorrectLevel.H)..addData(data);
    final modules = qrCode.modules;
    final n = modules.length;
    const quietZone = 4;
    final full = n + quietZone * 2;
    final moduleSize = size / full;
    
    // White background
    canvas.drawRect(Rect.fromLTWH(0, 0, size, size), Paint()..color = Colors.white);
    
    // Gradient paint for modules
    final gradient = LinearGradient(
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
      colors: [KTAColors.deepNavy, KTAColors.brightBlue],
    ).createShader(Rect.fromLTWH(0, 0, size, size));
    
    final modulePaint = Paint()..shader = gradient;
    
    // Draw modules
    for (int row = 0; row < n; row++) {
      for (int col = 0; col < n; col++) {
        if (modules[row][col]) {
          final x = (col + quietZone) * moduleSize;
          final y = (row + quietZone) * moduleSize;
          canvas.drawRect(Rect.fromLTWH(x, y, moduleSize, moduleSize), modulePaint);
        }
      }
    }
    
    // Center logo
    if (logoImage != null) {
      final logoWidth = (n * 0.08).ceil() * moduleSize;
      final cx = size / 2;
      final cy = size / 2;
      final r = logoWidth * 0.7;
      
      // White circle behind logo
      canvas.drawCircle(Offset(cx, cy), r, Paint()..color = Colors.white);
      
      // Logo image
      final src = Rect.fromLTWH(0, 0, logoImage!.width.toDouble(), logoImage!.height.toDouble());
      final dst = Rect.fromLTWH(cx - logoWidth/2, cy - logoWidth/2, logoWidth, logoWidth);
      canvas.drawImageRect(logoImage!, src, dst, Paint()..filterQuality = FilterQuality.high);
    }
  }
  
  @override
  bool shouldRepaint(covariant _QrPainter oldDelegate) => oldDelegate.data != data;
}
```

- [ ] **Step 2: Test QR scannability on device**
Build and run on physical device, scan with multiple QR apps

- [ ] **Step 3: Commit**
```bash
git add lib/features/kta/presentation/widgets/kta_qr_code.dart
git commit -m "feat: add KTA QR code widget with gradient and logo"
```

---

### Task 8: Build KTA Card Widget (Composing Front/Back)

**Files:**
- Create: `lib/features/kta/presentation/widgets/kta_card.dart`
- Create: `lib/features/kta/presentation/widgets/kta_card_preview.dart`

**Interfaces:**
- Consumes: `Anggota`, `KtaFrontPainter`, `KtaBackPainter`, `KtaQrCode`, image loading
- Produces: `KtaCard` widget with front/back switch, export/share/print actions

- [ ] **Step 1: Implement KtaCard widget**
```dart
// lib/features/kta/presentation/widgets/kta_card.dart
import 'package:flutter/material.dart';
import 'dart:ui' as ui;
import '../../data/models/anggota.dart';
import '../painters/kta_front_painter.dart';
import '../painters/kta_back_painter.dart';
import 'kta_qr_code.dart';
import 'package:printing/printing.dart';
import 'package:pdf/pdf.dart';
import 'package:share_plus/share_plus.dart';
import 'package:path_provider/path_provider.dart';
import 'dart:io';

class KtaCard extends StatefulWidget {
  final Anggota anggota;
  final VoidCallback? onExportFront;
  final VoidCallback? onExportBack;
  
  const KtaCard({required this.anggota, this.onExportFront, this.onExportBack, super.key});
  
  @override
  State<KtaCard> createState() => _KtaCardState();
}

class _KtaCardState extends State<KtaCard> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final GlobalKey _frontKey = GlobalKey();
  final GlobalKey _backKey = GlobalKey();
  
  ui.Image? _bgFront;
  ui.Image? _bgBack;
  ui.Image? _logo;
  ui.Image? _photo;
  ui.Image? _qrCustom;
  
  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadAssets();
  }
  
  Future<void> _loadAssets() async {
    final loader = AssetImageLoader();
    _bgFront = await loader.load('assets/images/background/depan.png');
    _bgBack = await loader.load('assets/images/background/belakang.png');
    _logo = await loader.load('assets/images/logo.png');
    
    if (widget.anggota.fotoUrl != null) {
      _photo = await NetworkImage(widget.anggota.fotoUrl!).resolve(ImageConfiguration());
    }
    
    if (widget.anggota.qrImageUrl != null) {
      _qrCustom = await NetworkImage(widget.anggota.qrImageUrl!).resolve(ImageConfiguration());
    }
    
    setState(() {});
  }
  
  Future<void> _exportPng(GlobalKey key, String filename) async {
    final boundary = key.currentContext?.findRenderObject() as RenderRepaintBoundary?;
    if (boundary == null) return;
    
    final image = await boundary.toImage(pixelRatio: 3.0); // ~600 DPI
    final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
    final bytes = byteData!.buffer.asUint8List();
    
    final dir = await getTemporaryDirectory();
    final file = File('${dir.path}/$filename');
    await file.writeAsBytes(bytes);
    
    await Share.shareXFiles([XFile(file.path)], text: 'KTA ${widget.anggota.nama}');
  }
  
  Future<void> _printPdf() async {
    final pdf = pw.Document();
    
    // Render both sides to images at high res
    final frontImg = await _renderToImage(_frontKey);
    final backImg = await _renderToImage(_backKey);
    
    pdf.addPage(pw.Page(
      pageFormat: PdfPageFormat(85.6 * PdfPageFormat.mm, 53.98 * PdfPageFormat.mm),
      margin: pw.EdgeInsets.all(2 * PdfPageFormat.mm), // bleed
      build: (ctx) => pw.Image(pw.MemoryImage(frontImg)),
    ));
    pdf.addPage(pw.Page(
      pageFormat: PdfPageFormat(85.6 * PdfPageFormat.mm, 53.98 * PdfPageFormat.mm),
      margin: pw.EdgeInsets.all(2 * PdfPageFormat.mm),
      build: (ctx) => pw.Image(pw.MemoryImage(backImg)),
    ));
    
    await Printing.layoutPdf(onLayout: (format) => pdf.save());
  }
  
  Future<Uint8List> _renderToImage(GlobalKey key) async {
    final boundary = key.currentContext?.findRenderObject() as RenderRepaintBoundary?;
    final image = await boundary!.toImage(pixelRatio: 3.0);
    final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
    return byteData!.buffer.asUint8List();
  }
  
  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        TabBar(
          controller: _tabController,
          tabs: const [Tab(text: 'Depan'), Tab(text: 'Belakang')],
        ),
        Expanded(
          child: TabBarView(
            controller: _tabController,
            children: [
              _buildSide(_frontKey, true),
              _buildSide(_backKey, false),
            ],
          ),
        ),
        _buildActions(),
      ],
    );
  }
  
  Widget _buildSide(GlobalKey key, bool isFront) {
    return RepaintBoundary(
      key: key,
      child: Container(
        width: KTALayout.cardWidth,
        height: KTALayout.cardHeight,
        child: Stack(
          children: [
            CustomPaint(
              size: Size(KTALayout.cardWidth, KTALayout.cardHeight),
              painter: isFront
                  ? KtaFrontPainter(
                      anggota: widget.anggota,
                      backgroundImage: _bgFront,
                      logoImage: _logo,
                      photoImage: _photo,
                      qrImage: _qrCustom,
                    )
                  : KtaBackPainter(
                      anggota: widget.anggota,
                      backgroundImage: _bgBack,
                      logoImage: _logo,
                    ),
            ),
            // QR Code overlay (front only)
            if (isFront) Positioned(
              left: KTALayout.qrX,
              top: KTALayout.y(22),
              width: KTALayout.qrSize,
              height: KTALayout.qrSize,
              child: widget.anggota.qrImageUrl != null
                  ? Image.network(widget.anggota.qrImageUrl!, width: KTALayout.qrSize, height: KTALayout.qrSize)
                  : KtaQrCode(data: widget.anggota.verifyUrl ?? '', logoImage: _logo),
            ),
          ],
        ),
      ),
    );
  }
  
  Widget _buildActions() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: [
          ElevatedButton.icon(
            icon: const Icon(Icons.download),
            label: const Text('Unduh Depan'),
            onPressed: () => _exportPng(_frontKey, 'KTA-depan.png'),
          ),
          ElevatedButton.icon(
            icon: const Icon(Icons.download),
            label: const Text('Unduh Belakang'),
            onPressed: () => _exportPng(_backKey, 'KTA-belakang.png'),
          ),
          ElevatedButton.icon(
            icon: const Icon(Icons.print),
            label: const Text('Cetak PDF'),
            onPressed: _printPdf,
          ),
        ],
      ),
    );
  }
}
```

- [ ] **Step 2: Create preview page/screen**
```dart
// lib/features/kta/presentation/screens/kta_preview_screen.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart'; // or Provider
import '../../data/models/anggota.dart';
import '../widgets/kta_card.dart';

class KtaPreviewScreen extends ConsumerWidget {
  final String anggotaId;
  
  const KtaPreviewScreen({required this.anggotaId, super.key});
  
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final anggotaAsync = ref.watch(fetchAnggotaProvider(anggotaId));
    
    return Scaffold(
      appBar: AppBar(title: const Text('KTA Saya')),
      body: anggotaAsync.when(
        data: (anggota) => Center(child: KtaCard(anggota: anggota)),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
      ),
    );
  }
}
```

- [ ] **Step 3: Test on device**
Run on iOS/Android, verify both sides render correctly, export works, PDF prints at correct size

- [ ] **Step 4: Commit**
```bash
git add lib/features/kta/presentation/widgets/kta_card.dart lib/features/kta/presentation/screens/kta_preview_screen.dart
git commit -m "feat: add KTA card widget with export/print/share"
```

---

### Task 9: Implement Member Search & List Screen

**Files:**
- Create: `lib/features/kta/presentation/screens/kta_list_screen.dart`
- Create: `lib/features/kta/presentation/widgets/anggota_search_delegate.dart`

**Interfaces:**
- Consumes: `searchAnggota` API, navigation to preview screen
- Produces: Searchable list with navigation

- [ ] **Step 1: Implement search delegate**
```dart
// lib/features/kta/presentation/widgets/anggota_search_delegate.dart
import 'package:flutter/material.dart';
import '../../data/models/anggota.dart';
import '../../data/repositories/kta_repository.dart';

class AnggotaSearchDelegate extends SearchDelegate<Anggota?> {
  final KtaRepository repository;
  
  AnggotaSearchDelegate(this.repository);
  
  @override
  List<Widget> buildActions(BuildContext context) => [
    IconButton(icon: const Icon(Icons.clear), onPressed: () => query = ''),
  ];
  
  @override
  Widget buildLeading(BuildContext context) => IconButton(
    icon: const Icon(Icons.arrow_back),
    onPressed: () => close(context, null),
  );
  
  @override
  Widget buildResults(BuildContext context) => _buildSuggestions();
  
  @override
  Widget buildSuggestions(BuildContext context) => _buildSuggestions();
  
  Widget _buildSuggestions() {
    if (query.length < 2) return const Center(child: Text('Ketik minimal 2 karakter'));
    
    return FutureBuilder<List<Anggota>>(
      future: repository.searchAnggota(query),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError) return Center(child: Text('Error: ${snapshot.error}'));
        final results = snapshot.data ?? [];
        if (results.isEmpty) return const Center(child: Text('Tidak ditemukan'));
        
        return ListView.builder(
          itemCount: results.length,
          itemBuilder: (context, index) {
            final a = results[index];
            return ListTile(
              title: Text(a.nama),
              subtitle: Text('${a.nomor} • ${a.ranting}'),
              onTap: () => close(context, a),
            );
          },
        );
      },
    );
  }
}
```

- [ ] **Step 2: Create list screen with search**
```dart
// lib/features/kta/presentation/screens/kta_list_screen.dart
class KtaListScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('KTA Anggota'),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () async {
              final result = await showSearch(
                context: context,
                delegate: AnggotaSearchDelegate(ref.read(ktaRepositoryProvider)),
              );
              if (result != null && context.mounted) {
                Navigator.push(context, MaterialPageRoute(
                  builder: (_) => KtaPreviewScreen(anggotaId: result.nomor),
                ));
              }
            },
          ),
        ],
      ),
      body: const Center(child: Text('Gunakan pencarian untuk menemukan anggota')),
    );
  }
}
```

- [ ] **Step 3: Test and commit**
```bash
flutter test test/features/kta/presentation/
git add lib/features/kta/presentation/screens/kta_list_screen.dart lib/features/kta/presentation/widgets/anggota_search_delegate.dart
git commit -m "feat: add KTA member search and list screen"
```

---

### Task 10: Add Authentication & Offline Support

**Files:**
- Create: `lib/core/auth/auth_service.dart`
- Create: `lib/features/kta/data/local/kta_local_storage.dart`
- Modify: `lib/features/kta/data/repositories/kta_repository.dart` (add caching)

**Interfaces:**
- Consumes: `flutter_secure_storage`, `shared_preferences`/`hive`
- Produces: Authenticated API calls, offline-first data access

- [ ] **Step 1: Implement auth service with secure storage**
```dart
// lib/core/auth/auth_service.dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class AuthService {
  static const _storage = FlutterSecureStorage();
  static const _tokenKey = 'auth_token';
  
  Future<String?> getToken() async => await _storage.read(key: _tokenKey);
  Future<void> setToken(String token) async => await _storage.write(key: _tokenKey, value: token);
  Future<void> clearToken() async => await _storage.delete(key: _tokenKey);
  
  Future<bool> isLoggedIn() async => (await getToken()) != null;
}
```

- [ ] **Step 2: Implement offline cache**
```dart
// lib/features/kta/data/local/kta_local_storage.dart
import 'package:shared_preferences/shared_preferences.dart';
import '../models/anggota.dart';

class KtaLocalStorage {
  static const _prefix = 'anggota_';
  late SharedPreferences _prefs;
  
  Future<void> init() async => _prefs = await SharedPreferences.getInstance();
  
  Future<void> cacheAnggota(Anggota a) async {
    await _prefs.setString('$_prefix${a.nomor}', jsonEncode(a.toJson()));
  }
  
  Future<Anggota?> getCachedAnggota(String id) async {
    final json = _prefs.getString('$_prefix$id');
    return json != null ? Anggota.fromJson(jsonDecode(json)) : null;
  }
  
  Future<void> clearCache() async {
    final keys = _prefs.getKeys().where((k) => k.startsWith(_prefix));
    for (final k in keys) await _prefs.remove(k);
  }
}
```

- [ ] **Step 3: Update repository to use cache-first strategy**
```dart
// lib/features/kta/data/repositories/kta_repository.dart
class KtaRepository {
  final KtaApiService _api;
  final KtaLocalStorage _local;
  final AuthService _auth;
  
  KtaRepository(this._api, this._local, this._auth);
  
  Future<Anggota> getAnggota(String id) async {
    // Try cache first
    final cached = await _local.getCachedAnggota(id);
    if (cached != null) return cached;
    
    // Fetch from API
    final token = await _auth.getToken();
    final anggota = await _api.fetchAnggota(id);
    
    // Cache for offline
    await _local.cacheAnggota(anggota);
    return anggota;
  }
  
  Future<List<Anggota>> searchAnggota(String query) async {
    // Search always hits API (could cache recent searches)
    final token = await _auth.getToken();
    return _api.searchAnggota(query);
  }
}
```

- [ ] **Step 4: Test offline mode**
Disconnect network, open cached member → should display

- [ ] **Step 5: Commit**
```bash
git add lib/core/auth/ lib/features/kta/data/local/ lib/features/kta/data/repositories/
git commit -m "feat: add authentication and offline support"
```

---

### Task 11: Integration Testing & Device Verification

**Files:**
- Create: `integration_test/kta_flow_test.dart`

**Interfaces:**
- Consumes: All previous tasks
- Produces: Verified end-to-end flow on device

- [ ] **Step 1: Write integration test**
```dart
// integration_test/kta_flow_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:kta_mobile/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  
  testWidgets('Full KTA flow: login → search → preview → export', (tester) async {
    app.main();
    await tester.pumpAndSettle();
    
    // Login
    await tester.enterText(find.byType(TextField).first, 'test@ths-thm.org');
    await tester.enterText(find.byType(TextField).last, 'password123');
    await tester.tap(find.byType(ElevatedButton));
    await tester.pumpAndSettle();
    
    // Search
    await tester.tap(find.byIcon(Icons.search));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'test member');
    await tester.pumpAndSettle();
    await tester.tap(find.text('Test Member').first);
    await tester.pumpAndSettle();
    
    // Preview - both tabs
    expect(find.text('Depan'), findsOneWidget);
    await tester.tap(find.text('Belakang'));
    await tester.pumpAndSettle();
    expect(find.text('DATA ANGGOTA'), findsOneWidget);
    
    // Export (verify no crash)
    await tester.tap(find.text('Unduh Depan'));
    await tester.pumpAndSettle(const Duration(seconds: 5));
  });
}
```

- [ ] **Step 2: Run on physical devices**
```bash
flutter test integration_test/kta_flow_test.dart -d <device-id>
```
Test on: iOS (iPhone), Android (multiple screen sizes)

- [ ] **Step 3: Verify print output**
Print PDF from app → measure physical dimensions with calipers → should be 85.6×53.98mm ±0.2mm

- [ ] **Step 4: Verify QR scannability**
Export PNG → print on card stock → scan with multiple apps (WhatsApp, Google Lens, dedicated QR apps)

- [ ] **Step 5: Commit**
```bash
git add integration_test/
git commit -m "test: add KTA integration tests"
```

---

## Summary

This plan delivers a complete Flutter mobile app for KTA viewing using the exact Paket E-Card design specifications. Key technical decisions:

1. **CustomPainter approach** — Replicates SVG coordinate system exactly (10×mm, 856×539.8)
2. **Text auto-fit port** — Dart implementation of `fitSingle`/`wrap` matching TypeScript logic
3. **QR gradient painter** — Custom `QrPainter` with LinearGradient shader + centered logo
4. **Asset bundling** — Backgrounds, logo, DejaVu fonts as Flutter assets (no CORS issues)
5. **Export pipeline** — `RenderRepaintBoundary` → high-res PNG → share/print via system dialogs
6. **Offline-first** — Cache member data locally, works without network
7. **Print fidelity** — PDF generation at 600 DPI with correct CR80 page size + 2mm bleed

The app provides members a secure, offline-capable way to view their KTA with export/print/share functionality matching the web admin capabilities.
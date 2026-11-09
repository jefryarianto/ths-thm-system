---
name: "KTA THS-THM Design System"
colors:
  primaryNavy: "#0B377B"
  deepNavy: "#143B76"
  mediumBlue: "#185AB5"
  brightBlue: "#3373AE"
  gold: "#F8DB38"
  lightGold: "#FFF2A1"
  warmGold: "#E4B500"
  white: "#FFFFFF"
  offWhite: "#DFEAF3"
  darkText: "#111C25"
  mediumText: "#000000"
  lightText: "#8193A0"
  borderBlue: "#A9B9CB"
  photoPlaceholder: "#DDE6EA"
  qrWhite: "#FFFFFF"
  microtextNavy: "#0B377B"
  signatureLine: "#0B377B"
  badgeBlue: "#185AB5"
  badgeGold: "#E4B500"
  shadowNavy: "#17394F"
  highlightWhite: "#FFFFFF"
  highlightGold: "#FFF2A1"
---

# Design System: KTA THS-THM
**Project ID:** KTA-THS-THM-E-Card

## 1. Visual Theme & Atmosphere

The KTA (Kartu Tanda Anggota) design system embodies the institutional identity of Organisasi Pencak Silat Pendidikan Tunggal Hati Seminari – Tunggal Hati Maria (THS-THM) Distrik Keuskupan Larantuka. The visual language is formal, authoritative, and deeply rooted in organizational tradition — combining deep navy blues that convey trust and stability with warm gold accents that signify achievement and distinction. The design feels like an official government or military identification card: precise, structured, and purposeful.

The atmosphere is ceremonial yet functional. Every element serves a verification purpose — from the microtext Latin mottos ("PRO PATRIA ET ECCLESIA" on front, "Fortiter in Re, Suaviter in Modo" on back) that act as anti-counterfeiting measures, to the guilloche patterns and dotted-map motifs that provide visual security texture. The CR80 card format (85.6 × 53.98 mm) with 2mm bleed ensures print-production readiness. Density is high but organized: the front packs photo, identity, rank badges, QR code, and organizational headers into a single coherent surface; the back presents structured data fields in a clean label-value table. There is no decorative whitespace — every millimeter carries information or security function.

## 2. Color Palette & Roles

### Primary Foundation
| Token | Hex | Role | Description |
|-------|-----|------|-------------|
| `primaryNavy` | `#0B377B` | Primary brand, borders, microtext, signature line | Deep authoritative navy — the institutional anchor color |
| `deepNavy` | `#143B76` | QR gradient start, dark accents | Slightly lighter navy for gradient transitions |
| `mediumBlue` | `#185AB5` | Blue rank badges (pratama, tamtama), header text shadow | Mid-tone blue for rank indicators and header depth |
| `brightBlue` | `#3373AE` | QR gradient end | Brighter blue for QR code gradient luminosity |
| `white` | `#FFFFFF` | Card background base, QR quiet zone, text highlights | Pure white for clean surfaces and contrast |
| `offWhite` | `#DFEAF3` | Primary text fill (front name/header) | Cool off-white for primary text on dark backgrounds |

### Accent & Interactive
| Token | Hex | Role | Description |
|-------|-----|------|-------------|
| `gold` | `#F8DB38` | Yellow rank badges (muda, madya, utama), "KARTU TANDA ANGGOTA" header, "DATA ANGGOTA" label | Warm institutional gold — signifies achievement and official status |
| `lightGold` | `#FFF2A1` | Yellow header text shadow | Pale gold for text depth on gold headers |
| `warmGold` | `#E4B500` | Yellow rank badge fill | Slightly deeper gold for badge solids |

### Typography & Text Hierarchy
| Token | Hex | Role | Description |
|-------|-----|------|-------------|
| `darkText` | `#111C25` | Primary body text (front name, data fields) | Near-black with subtle blue undertone for readability |
| `mediumText` | `#000000` | Labels, field names, gender indicator | Pure black for maximum contrast on light surfaces |
| `lightText` | `#8193A0` | Text shadows, name outline (front) | Muted blue-gray for text depth effects |

### Functional States
| Token | Hex | Role | Description |
|-------|-----|------|-------------|
| `borderBlue` | `#A9B9CB` | Photo frame border, input-like borders | Soft blue-gray for structural borders |
| `photoPlaceholder` | `#DDE6EA` | Photo area background when no image | Pale blue-gray placeholder surface |
| `qrWhite` | `#FFFFFF` | QR code background, quiet zone | Pure white for QR scannability |
| `microtextNavy` | `#0B377B` | Microtext lines (bottom edge security text) | Same as primary navy for security microtext |
| `signatureLine` | `#0B377B` | Coordinator signature underline | Primary navy for official signature line |
| `shadowNavy` | `#17394F` | Text shadow (dark layer) | Darker navy for multi-layer text shadows |
| `highlightWhite` | `#FFFFFF` | Text highlight (middle layer) | Pure white for text highlight layer |
| `highlightGold` | `#FFF2A1` | Gold header text highlight | Light gold for gold header highlight layer |

### Rank Badge Colors
| Rank | Count | Color Token | Hex |
|------|-------|-------------|-----|
| Pratama | 1 | `badgeBlue` / `mediumBlue` | `#185AB5` |
| Tamtama | 2 | `badgeBlue` / `mediumBlue` | `#185AB5` |
| Muda | 1 | `badgeGold` / `warmGold` | `#E4B500` |
| Madya | 2 | `badgeGold` / `warmGold` | `#E4B500` |
| Utama | 3 | `badgeGold` / `warmGold` | `#E4B500` |

## 3. Typography Rules

### Font Family
- **Primary**: `KTADejaVu` (DejaVu Sans) — Humanist sans-serif with excellent Unicode support, designed for legibility at small sizes. Used at weights 400 (regular) and 700 (bold).
- **Fallback Stack**: `DejaVu Sans, sans-serif` — System fallback ensuring readability even if custom font fails.

### Type Scale & Hierarchy
All sizes defined in **millimeters** (converted via `pt(mm) = mm × 25.4 / 72 × 10` for SVG coordinates).

| Role | Size (mm) | Weight | Usage | Side |
|------|-----------|--------|-------|------|
| Org Header Line 1 | 5.2 pt | 700 | "ORGANISASI PENCAK SILAT PENDIDIKAN" | Front |
| Org Header Line 2 | 6.4 pt | 700 | "TUNGGAL HATI SEMINARI – TUNGGAL HATI MARIA" | Front |
| Org Header Line 3 | 5.6 pt | 700 | "DISTRIK KEUSKUPAN LARANTUKA" | Front |
| Card Title | 6.4 pt | 700 | "KARTU TANDA ANGGOTA" (gold) | Front |
| Section Label | 4.0 pt | 700 | "NAMA LENGKAP", "TEMPAT / TAHUN DADAR", etc. | Front |
| Name Primary | 7.0 → 3.8 pt | 700 | Member name (auto-fits, min 3.8pt) | Front |
| Gender Code | 7.0 pt | 700 | "L" / "P" after name | Front |
| Dadar Info | 5.1 → 3.8 pt | 700 | Tempat/tahun Dadar (auto-fits) | Front |
| Ranting Line | 5.1 → 3.8 pt | 700 | Ranting name (wraps to 3 lines max) | Front |
| Member No Label | 4.0 pt | 700 | "NO. ANGGOTA" | Front |
| Member Number | 5.2 → 3.8 pt | 700 | Member ID (auto-fits) | Front |
| Expiry Label | 5.0 pt | 700 | "EXP: MM/YY" | Front |
| Back Section Title | 7.0 pt | 700 | "DATA ANGGOTA" (gold) | Back |
| Back Field Label | 4.0 pt | 700 | "NAMA LENGKAP", "TEMPAT / TANGGAL LAHIR", etc. | Back |
| Back Field Value | 5.3 → 3.6 pt | 700/400 | Field data (auto-fits, min 3.6pt) | Back |
| Address Label | 4.0 pt | 700 | "ALAMAT" | Back |
| Address Lines | 5.3 → 4.0 pt | 400 | Address (wraps to 3 lines max) | Back |
| Footer Issue Date | 5.0 → 3.6 pt | 400 | "TANGGAL TERBIT: ..." | Back |
| Coordinator Label | 4.0 pt | 700 | "KOORDINATOR DISTRIK" | Back |
| Coordinator Name | 5.0 → 3.8 pt | 400 | Coordinator name (auto-fits) | Back |
| Microtext | 2.6 pt | 400 | Latin mottos (security) | Both |

### Text Effects
- **Front Name/Headers**: Triple-layer shadow — dark navy offset (+1.4, +1.4), white/gold offset (-0.9, -0.9), primary fill (0, 0). Creates engraved/embossed depth.
- **Gold Headers**: Same triple-layer but with gold highlight (`#FFF2A1`) and gold fill (`#F8DB38`).
- **All Text**: Uppercase via `toLocaleUpperCase('id-ID')` for Indonesian locale.

### Spacing Principles
- Base unit: **0.1 mm** in SVG coordinate system (viewBox 856 × 539.8 = 10× mm)
- Text line heights: ~2.5–3.5 mm between baselines
- Section gaps: ~4–7 mm between major sections
- Photo frame: 24 × 30 mm with 14 mm corner radius
- Rank badges: 23.3 mm wide × 1.5 mm high, spaced vertically
- QR code: 18.5 × 18.5 mm including 4-module quiet zone

## 4. Component Stylings

### KTA Card (Primary Component)
**Dimensions**: CR80 format — 85.6 × 53.98 mm trim, 89.6 × 57.98 mm with 2mm bleed
**SVG ViewBox**: 856 × 539.8 (10× mm scale)
**Corner Radius**: 3.18 mm (31.8 SVG units) — applied via clipPath

**Front Side Structure**:
1. **Background Layer**: Full-bleed PNG (`depan.png`) with organizational motifs, guilloche, dotted map, gold header bar
2. **Logo**: 11.2 × 11.2 mm at top-right (700, 30.8 SVG)
3. **Organization Headers**: 4 lines, right-aligned at x=683, descending baselines
4. **Card Title**: "KARTU TANDA ANGGOTA" in gold, right-aligned
5. **Photo Frame**: 24 × 30 mm rounded rect at (44, 145.8), 14 mm radius, stroke border
6. **Rank Badges**: Horizontal bars (233 × 1.5 mm, 1.5 mm radius) at left of photo, count/color by rank
7. **Identity Fields**: Left-aligned at x=306, labels at 4pt, values auto-sized
8. **Expiry**: Right-aligned at x=733.5, vertical divider line at x=625
9. **QR Code**: 18.5 × 18.5 mm at (641, y(22)), gradient modules, centered logo
10. **Microtext**: Bottom-edge repeating Latin motto at 2.6pt

**Back Side Structure**:
1. **Background Layer**: Full-bleed PNG (`belakang.png`) with guilloche, dotted map
2. **Section Title**: "DATA ANGGOTA" in gold at top-left
3. **Data Table**: 5 rows (Nama, Tempat/Tgl Lahir, Pekerjaan, Status, Pelantikan) — label : value format
4. **Address Block**: "ALAMAT" label, wrapped value (3 lines max)
5. **Footer**: Issue date left, Coordinator signature block right with underline
6. **Microtext**: Bottom-edge repeating Latin motto

### Rank Badge Component
- **Shape**: Rounded rectangle, 23.3 mm wide × 1.5 mm high, 1.5 mm corner radius
- **Position**: Aligned left with photo frame (x=47.5), vertically stacked
- **Color**: Blue (`#185AB5`) for Pratama/Tamtama, Gold (`#E4B500`) for Muda/Madya/Utama
- **Count**: 1 (Pratama/Muda), 2 (Tamtama/Madya), 3 (Utama)
- **Vertical Positions**: Calculated from photo top — single at 470.3, dual at y(6.45)-15 & y(4.45)-15, triple at 454.8/470.8/486.8

### QR Code Component
- **Generation**: Client-side via `qrcode` library, Error Correction Level H
- **Style**: Square modules, gradient fill (`#143B76` → `#3373AE`), centered logo
- **Quiet Zone**: 4 modules (standard)
- **Logo**: Organization logo, 8% of QR width, circular mask with white background
- **Fallback**: If `qrImageUrl` provided, use custom styled QR image instead

### Photo Component
- **Frame**: 24 × 30 mm, 14 mm corner radius, 1px stroke `#A9B9CB`
- **Fill**: `cover` mode (center-cropped), clipped to rounded frame
- **Placeholder**: `#DDE6EA` background when no photo

### Export PNG
- **Output**: 2022 × 1275 px (≈600 DPI CR80)
- **Features**: Embedded fonts (DejaVu Sans regular/bold as data URIs), embedded images (CORS-fetched), transparent rounded corners
- **Format**: PNG with alpha channel

## 5. Layout Principles

### Grid & Structure
- **Coordinate System**: 10× mm scaling (856 × 539.8 SVG units = 85.6 × 53.98 mm)
- **Origin**: Top-left (0,0), Y increases downward
- **Y-Position Helper**: `y(bottomMm) = (53.98 - bottomMm) × 10` — positions from bottom edge
- **No CSS Grid/Flexbox**: Absolute positioning in SVG coordinate space

### Whitespace Strategy
- **Margins**: 4.4 mm left/right (x=44, x=812), 14.58 mm top (y=145.8 for photo)
- **Section Rhythm**: ~4mm between label and value baselines, ~7mm between field groups
- **Photo Dominance**: Photo frame occupies left 28% of card width, full height minus margins
- **Right Column**: Identity fields occupy ~60% width (x=306 to x=780)

### Alignment & Visual Balance
- **Right-Aligned**: Organization headers, card title, expiry (front)
- **Left-Aligned**: All data fields, labels, values (both sides)
- **Centered**: QR code, expiry label, coordinator signature block
- **Visual Weight**: Left side anchored by photo + badges; right side by dense text + QR

### Responsive Behavior
- **Web Preview**: SVG scales via `width: 100%; height: auto` (`.kta-svg` class)
- **Mobile**: Same SVG, container constrains max-width (e.g., 700px in examples)
- **Print**: Fixed physical dimensions via `@page` CSS (85.6 × 53.98 mm trim, 2mm bleed)
- **Touch Targets**: Not applicable (static card), but export buttons need 44×44px minimum

## 6. Design System Notes for Stitch Generation

### Language to Use
- "Official identification card aesthetic"
- "Institutional navy and gold color scheme"
- "CR80 format with 2mm bleed"
- "DejaVu Sans typography, all uppercase"
- "Guilloche security patterns and microtext"
- "Rank badges as horizontal bars (blue/gold by tier)"
- "QR code with gradient modules and centered logo"
- "Triple-layer text shadow for engraved depth effect"
- "Label-value data table on reverse side"
- "Photo frame with rounded corners and stroke border"

### Color References
```yaml
primaryNavy: "#0B377B"      # Core brand, borders, microtext
deepNavy: "#143B76"         # QR gradient start
mediumBlue: "#185AB5"       # Blue rank badges, header shadows
brightBlue: "#3373AE"       # QR gradient end
gold: "#F8DB38"             # Gold rank badges, main headers
lightGold: "#FFF2A1"        # Gold text highlights
warmGold: "#E4B500"         # Gold badge fills
darkText: "#111C25"         # Primary body text
borderBlue: "#A9B9CB"       # Photo frame, structural borders
photoPlaceholder: "#DDE6EA" # Empty photo state
microtextNavy: "#0B377B"    # Security microtext
```

### Component Prompts
1. **Front KTA Card**: "Official membership card front, CR80 format, deep navy background with guilloche patterns and gold header bar. Top-right logo. Four right-aligned organization headers in white with navy shadow. Gold 'KARTU TANDA ANGGOTA' title. Left side: 24×30mm photo frame with rounded corners, rank badges as horizontal bars (blue for junior, gold for senior). Right side: identity fields (name, dadar, ranting, member number) in DejaVu Sans uppercase with triple-layer shadow. Right-aligned expiry with vertical divider. QR code 18.5mm with blue gradient modules and centered logo. Bottom microtext 'PRO PATRIA ET ECCLESIA' repeating."

2. **Back KTA Card**: "Official membership card back, CR80 format. Gold 'DATA ANGGOTA' header. Label-value table: Nama Lengkap, Tempat/Tanggal Lahir, Pekerjaan, Status, Pelantikan — labels 4pt bold, values auto-sized. Address block wrapping to 3 lines. Footer: left 'TANGGAL TERBIT', right coordinator name with signature line and underline. Bottom microtext 'Fortiter in Re, Suaviter in Modo' repeating. Guilloche border pattern, dotted map watermark."

3. **Rank Badge**: "Horizontal bar 23.3×1.5mm, 1.5mm radius. Blue (#185AB5) for Pratama (1 bar), Tamtama (2 bars). Gold (#E4B500) for Muda (1), Madya (2), Utama (3). Stacked vertically with 1.5mm gap."

### Incremental Iteration
- Adjust `pt()` scale factor if physical print dimensions drift
- Microtext legibility: test at 2.6pt on actual card stock
- QR scannability: verify gradient modules don't interfere with readers
- Font embedding: ensure DejaVu Sans licenses permit distribution
- CORS: all external images (photo, QR, signature) must allow cross-origin fetch for PNG export
- Indonesian locale: `toLocaleUpperCase('id-ID')` handles dotted I correctly

---

## Implementation Specifications for Target Platforms

### Web Admin (React/Next.js)
- **Component**: Reuse `KtaCard.tsx` directly — it's a self-contained SVG component
- **Integration**: Copy `components/kta/` and `public/kta/` to project
- **Dependencies**: `qrcode`, `@types/qrcode`
- **Font Loading**: Import `kta-fonts.css` at app root (`app/layout.tsx`)
- **Data Flow**: Admin fetches `Anggota` from API, passes to `KtaCard` via `PasangDiWebsite` wrapper
- **Features**: Preview both sides, validation warnings, PNG download, print-ready view
- **Responsive**: Container max-width 700px, SVG scales fluidly
- **Security**: Admin-only routes, CORS-enabled asset URLs, authenticated QR verification endpoints

### Mobile Flutter
- **Approach**: Recreate SVG layout in Flutter `CustomPainter` or widget tree
- **Coordinates**: Use same 10× mm system (856 × 539.8 logical pixels)
- **Fonts**: Bundle DejaVu Sans TTF, use `FontWeight.w400`/`w700`
- **Colors**: Map DESIGN.md tokens to `Color` constants
- **Backgrounds**: Use `depan.png`/`belakang.png` as `Image.asset` in `Stack`
- **QR**: Use `qr_flutter` with custom painter for gradient + logo
- **Photo**: `ClipRRect` with `BoxFit.cover` in sized container
- **Rank Badges**: `Container` with `decoration: BoxDecoration(color, borderRadius)`
- **Text**: `Text` widgets with `TextPainter` for auto-fit (replicate `fitSingle`/`wrap` logic)
- **Export**: `RenderRepaintBoundary` → `toImage` → PNG bytes → share/save
- **Print**: `printing` package with PDF generation at 600 DPI
- **State**: Receive `Anggota` model via API, display in `Scaffold` with preview + actions
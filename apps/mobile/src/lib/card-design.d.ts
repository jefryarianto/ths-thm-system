/**
 * Type declarations for the card-design CJS shim.
 *
 * The shim (`card-design.js`) re-exports `@ths-thm/card-design` via
 * `module.exports = require(...)`, which TypeScript can't infer named
 * exports from. This file provides the type surface.
 */

type Freeze<T> = T extends object ? { readonly [K in keyof T]: Freeze<T[K]> } : T;

declare const CARD: Freeze<{ W: number; H: number; RADIUS: number }>;

declare const FONTS: Freeze<{
  ocrA: string;
  openSansBold: string;
  robotoRegular: string;
  robotoBold: string;
}>;

declare const COLORS: Freeze<{
  front: { bg: string; border: string };
  back: { bg: string; border: string };
  header: { from: string; to: string };
  bottom: { from: string; fromOpacity: number; to: string; toOpacity: number };
  backGradient: string[];
  wavy: { from: string; fromOpacity: number; to: string; toOpacity: number }[];
  bgCircle1: string;
  bgCircle2: string;
  guillocheFront: string;
  guillocheBack: string;
  headerText: string;
  label: string;
  value: string;
  valueStrong: string;
  rankText: string;
  rankStripBorder: string;
  stampBorder: string;
  stampText: string;
  ttd: string;
  white: string;
}>;

declare const FRONT: Freeze<{
  header: {
    height: number;
    padTop: number;
    padBottom: number;
    padH: number;
    gap: number;
    row: { fontSize: number; lineHeight: number; spacing: number[]; rowGap: number };
  };
  logo: {
    size: number;
    radius: number;
    bg: string;
    border: number;
    borderColor: string;
    img: number;
  };
  photo: {
    big: { left: number; top: number; w: number; h: number };
    small: { right: number; top: number; w: number; h: number };
    crop: { faceCrop: number; pasfotoAspect: number };
  };
  rank: {
    right: number;
    top: number;
    w: number;
    name: { fontSize: number; letterSpacing: number; marginBottom: number };
    strip: { h: number; gap: number; radius: number };
  };
  info: {
    left: number;
    top: number;
    right: number;
    rowMarginBottom: number;
    label: { fontSize: number; color: string; letterSpacing: number };
    value: { fontSize: number; color: string; marginTop: number; lineHeight: number };
    valueStrong: { fontSize: number; color: string; letterSpacing: number; marginTop: number };
    jk: { w: number; marginLeft: number };
  };
  bottom: {
    left: number;
    bottom: number;
    label: { fontSize: number; color: string; marginBottom: number };
    value: { fontSize: number; color: string; marginTop: number };
  };
  signer: {
    right: number;
    bottom: number;
    w: number;
    h: number;
    title1: { left: number; top: number; fontSize: number };
    title2: { left: number; top: number; fontSize: number };
    wrap: { left: number; top: number; w: number; h: number };
    sig: {
      left: number;
      top: number;
      w: number;
      h: number;
      fontSize: number;
      rotate: number;
      color: string;
    };
    stamp: {
      left: number;
      top: number;
      size: number;
      radius: number;
      border: number;
      rotate: number;
      text: { fontSize: number };
    };
    name: { fontSize: number; underline: boolean };
    title: { fontSize: number; marginTop: number };
  };
  watermark: { left: number; top: number; w: number; h: number; color: string; opacity: number };
  bgCircle1: { top: number; right: number; size: number };
  bgCircle2: { bottom: number; left: number; size: number };
}>;

declare const BACK: Freeze<{
  title: {
    top: number;
    fontSize: number;
    letterSpacing: number;
    subtitle: { fontSize: number; marginTop: number };
  };
  qr: {
    left: number;
    top: number;
    size: number;
    radius: number;
    border: number;
    borderColor: string;
    bg: string;
    padding: number;
  };
  info: {
    left: number;
    top: number;
    right: number;
    padding: number;
    desc: { fontSize: number; lineHeight: number; marginBottom: number; opacity: number };
    row: {
      marginBottom: number;
      label: { w: number; fontSize: number };
      colon: { w: number };
      value: { fontSize: number };
    };
  };
  footer: {
    left: number;
    right: number;
    bottom: number;
    text: { fontSize: number; lineHeight: number; opacity: number };
    urlLabel: { fontSize: number; opacity: number };
    urlValue: { fontSize: number; marginTop: number };
  };
  watermark: { w: number; h: number; color: string; opacity: number };
}>;

declare const DECOR: Freeze<{
  wavyPaths: string[];
  headerPath: string;
  bottomPath: string;
  backWave: string;
  guilloche: {
    inset: number;
    rects: {
      inset: number;
      rx: number;
      strokeWidth: number;
      opacity: number;
      dash: string | null;
    }[];
    pattern: { w: number; h: number; path: string; strokeWidth: number };
  };
}>;

declare const CAMERA: Freeze<{
  overlay: {
    dimColor: string;
    dimTop: number;
    dimSide: number;
    dimBottom: number;
    guide: { w: number; h: number };
    oval: {
      w: number;
      h: number;
      radius: number;
      borderWidth: number;
      borderColor: string;
      glow: string;
    };
    corner: { size: number; color: string; width: number; radius: number; offset: number };
  };
  hint: {
    top: number;
    left: number;
    right: number;
    radius: number;
    bg: string;
    padV: number;
    padH: number;
    text: string;
  };
  flash: { top: number; right: number; size: number; radius: number; bg: string };
  close: { top: number; left: number; size: number; radius: number; bg: string };
  capture: {
    size: number;
    radius: number;
    borderWidth: number;
    borderColor: string;
    inner: number;
    innerRadius: number;
    innerColor: string;
  };
  bottomBar: { bottom: number };
  uploading: { marginTop: number; fontSize: number; color: string };
}>;

declare function getLevelVisual(
  tingkat: string | null | undefined,
  fromApi: { stripCount: number; color: string; label?: string } | null,
): { stripCount: number; color: string; label: string };

declare function photoCrop(boxW: number, boxH: number): {
  w: number;
  h: number;
  left: number;
  top: number;
};

/** Spesifikasi runtime kartu hasil merge template aktif (resolveCardSpec). */
export interface CardTemplateRuntime {
  template: {
    id: string | null;
    name: string | null;
    label: string | null;
    frontImage: string | null;
    backImage: string | null;
  } | null;
  hasFrontImage: boolean;
  hasBackImage: boolean;
  guilloche: { front: boolean; back: boolean; strokeFront: string; strokeBack: string };
  watermark: { front: boolean; back: boolean; opacity: number | null };
  textColors: Record<string, string>;
}

declare function resolveCardSpec(activeTemplate: unknown): CardTemplateRuntime;

export { CARD, FONTS, COLORS, FRONT, BACK, DECOR, CAMERA, getLevelVisual, photoCrop, resolveCardSpec };

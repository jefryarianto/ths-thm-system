import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { vi, afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

// Mock fetch globally
global.fetch = vi.fn();

// Polyfill ResizeObserver (used by recharts ResponsiveContainer)
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// Polyfill URL.createObjectURL / revokeObjectURL
if (typeof globalThis.URL.createObjectURL === 'undefined') {
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  globalThis.URL.revokeObjectURL = vi.fn();
}

// Polyfill document.fonts
if (typeof document !== 'undefined' && !document.fonts) {
  // @ts-expect-error mock FontFaceSet
  document.fonts = { ready: Promise.resolve(), check: () => true };
}

// Polyfill SVG text measurement for JSDOM
if (typeof window !== 'undefined') {
  const getLen = function (this: SVGElement) {
    const text = this.textContent || '';
    const fontSize = parseFloat(this.getAttribute('font-size') || '16');
    return text.length * fontSize * 0.72;
  };
  const svgProto = window.SVGElement?.prototype as unknown as Record<string, unknown> | undefined;
  if (svgProto && !svgProto.getComputedTextLength) {
    svgProto.getComputedTextLength = getLen;
  }
  if (typeof SVGTextElement !== 'undefined') {
    const textProto = SVGTextElement.prototype as unknown as Record<string, unknown>;
    if (!textProto.getComputedTextLength) {
      textProto.getComputedTextLength = getLen;
    }
  }
}

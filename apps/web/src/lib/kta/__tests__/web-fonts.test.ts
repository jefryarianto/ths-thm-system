import { describe, expect, it } from 'vitest';
import config from '../../../../tailwind.config.js';

type TypographyConfig = {
  theme?: { extend?: { fontFamily?: Record<string, string[]> } };
};

const fontFamily = (config as unknown as TypographyConfig).theme?.extend?.fontFamily;

describe('website typography', () => {
  it('uses the original sans stack for the website UI', () => {
    expect(fontFamily?.sans).toEqual([
      '"Inter"',
      '"Open Sans"',
      'Roboto',
      'system-ui',
      'sans-serif',
    ]);
  });

  it('uses the original serif stack for the website UI', () => {
    expect(fontFamily?.serif).toEqual([
      'Georgia',
      'Cambria',
      '"Times New Roman"',
      'Times',
      'serif',
    ]);
  });
});

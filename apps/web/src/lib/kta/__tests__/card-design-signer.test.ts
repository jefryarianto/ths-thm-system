import { describe, expect, it } from 'vitest';
import { BACK } from '@/lib/card-design';

describe('BACK.signer', () => {
  it('anchors the title to the left with label typography', () => {
    expect(BACK.signer.title).toEqual({ left: 0, top: 0, fontSize: 18 });
  });

  it('anchors the name to the left above the signature block', () => {
    expect(BACK.signer.name).toEqual({
      left: 0,
      bottom: 35,
      fontSize: 18,
      underline: true,
    });
  });
});

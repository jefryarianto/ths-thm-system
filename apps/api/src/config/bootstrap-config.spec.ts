import { isPublicUpload } from './bootstrap-config';

describe('isPublicUpload', () => {
  it('treats berita cover images as public so <img> tags can load them', () => {
    expect(isPublicUpload('berita-image-1700000000000-123456789.png')).toBe(true);
  });

  it('keeps existing public template assets public', () => {
    expect(isPublicUpload('card-template-front-123.png')).toBe(true);
    expect(isPublicUpload('signature-123.png')).toBe(true);
    expect(isPublicUpload('stamp-123.png')).toBe(true);
    expect(isPublicUpload('doc-template-123.png')).toBe(true);
  });

  it('keeps private member/proof assets protected', () => {
    expect(isPublicUpload('member-photo-123.png')).toBe(false);
    expect(isPublicUpload('proofs/bukti-123.png')).toBe(false);
    expect(isPublicUpload('forum-image-123.png')).toBe(false);
  });
});

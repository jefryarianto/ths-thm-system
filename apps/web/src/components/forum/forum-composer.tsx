'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, Send, X, Loader2 } from 'lucide-react';
import apiClient, { unwrap, extractErrorMessage } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { useDebounce } from '@/lib/hooks/use-debounce';

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // samakan dengan MAX_IMAGE_UPLOAD_SIZE server (10MB)

interface MentionOption {
  id: string;
  nama: string;
}

interface AttachedImage {
  url: string;
  uploading: boolean;
}

interface ForumComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (content: string, images: string[]) => Promise<void>;
  submitLabel: string;
  submitting?: boolean;
  placeholder?: string;
  rows?: number;
}

/**
 * Editor konten forum: textarea + autocomplete mention (@nama) + lampiran gambar.
 * Konten dikontrol oleh parent (`value`/`onChange`); lampiran diurus di sini dan
 * dikirim ke parent lewat `onSubmit(content, images)`. Saat konten dikosongkan
 * parent (submit sukses), lampiran ikut dibersihkan.
 */
export function ForumComposer({
  value,
  onChange,
  onSubmit,
  submitLabel,
  submitting = false,
  placeholder = 'Tulis konten... gunakan @ untuk mention anggota',
  rows = 3,
}: ForumComposerProps) {
  const toast = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [images, setImages] = useState<AttachedImage[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionOptions, setMentionOptions] = useState<MentionOption[]>([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionOpen, setMentionOpen] = useState(false);
  const debouncedQuery = useDebounce(mentionQuery ?? '', 300);

  // Parent mengosongkan konten setelah submit sukses → bersihkan lampiran.
  useEffect(() => {
    if (!value) setImages([]);
  }, [value]);

  const detectMention = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const caret = el.selectionStart ?? el.value.length;
    const before = el.value.slice(0, caret);
    const match = before.match(/@([\p{L}\p{M}\d_ -]{0,30})$/u);
    if (match && match[1].length >= 2) {
      setMentionQuery(match[1]);
      setMentionOpen(true);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
      setMentionOpen(false);
    }
  }, []);

  useEffect(() => {
    if (!debouncedQuery) {
      setMentionOptions([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.get('/forum/mentions', { params: { search: debouncedQuery } });
        const data = unwrap<MentionOption[]>(res) || [];
        if (!cancelled) {
          setMentionOptions(data);
          setMentionIndex(0);
        }
      } catch {
        if (!cancelled) setMentionOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const insertMention = (option: MentionOption) => {
    const el = textareaRef.current;
    if (!el || mentionQuery === null) return;
    const caret = el.selectionStart ?? value.length;
    const start = caret - mentionQuery.length - 1; // posisi karakter '@'
    const next = `${value.slice(0, start)}@${option.nama} ${value.slice(caret)}`;
    onChange(next);
    setMentionOpen(false);
    setMentionQuery(null);
    const newCaret = start + option.nama.length + 2;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(newCaret, newCaret);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionOpen && mentionOptions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((i) => (i + 1) % mentionOptions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((i) => (i - 1 + mentionOptions.length) % mentionOptions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(mentionOptions[mentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setMentionOpen(false);
        return;
      }
    }
    // Enter tanpa Shift mengirim (buka dropdown berarti biarkan default dicegah di atas)
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (!submitting && value.trim()) void handleSubmit();
    }
  };

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    for (const file of Array.from(fileList)) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        toast('error', `Format tidak didukung: ${file.name} (gunakan JPG/PNG/WebP)`);
        continue;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        toast('error', `File terlalu besar: ${file.name} (maks 10MB)`);
        continue;
      }
      const tempUrl = URL.createObjectURL(file);
      setImages((prev) => [...prev, { url: tempUrl, uploading: true }]);
      try {
        const form = new FormData();
        form.append('image', file);
        const res = await apiClient.post('/forum/upload-image', form);
        const data = unwrap<{ filename: string; url: string }>(res);
        if (!data?.url) throw new Error('Upload gagal');
        setImages((prev) =>
          prev.map((img) => (img.url === tempUrl ? { url: data.url, uploading: false } : img)),
        );
      } catch (err: unknown) {
        setImages((prev) => prev.filter((img) => img.url !== tempUrl));
        URL.revokeObjectURL(tempUrl);
        toast('error', extractErrorMessage(err, `Gagal mengunggah ${file.name}`));
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (url: string) => {
    setImages((prev) => prev.filter((img) => img.url !== url));
  };

  const handleSubmit = async () => {
    if (!value.trim() || submitting) return;
    if (images.some((img) => img.uploading)) {
      toast('error', 'Tunggu semua gambar selesai diunggah');
      return;
    }
    await onSubmit(value.trim(), images.map((img) => img.url));
  };

  const canSubmit = !!value.trim() && !submitting && !images.some((img) => img.uploading);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          detectMention();
        }}
        onClick={detectMention}
        onKeyUp={detectMention}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setMentionOpen(false), 150)}
        placeholder={placeholder}
        rows={rows}
        className="w-full border border-gray-200 dark:border-gray-600 dark:bg-gray-800 rounded-lg p-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />

      {mentionOpen && mentionOptions.length > 0 && (
        <div className="absolute z-30 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
          {mentionOptions.map((option, index) => (
            <button
              key={option.id}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                insertMention(option);
              }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                index === mentionIndex
                  ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <span className="font-medium">{option.nama}</span>
            </button>
          ))}
        </div>
      )}

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {images.map((img) => (
            <div
              key={img.url}
              className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 group"
            >
              <img src={img.url} alt="Lampiran" className="w-full h-full object-cover" />
              {img.uploading ? (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Loader2 size={18} className="text-white animate-spin" />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => removeImage(img.url)}
                  className="absolute top-0.5 right-0.5 p-0.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Hapus gambar"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition disabled:opacity-50"
          title="Lampirkan gambar (JPG/PNG/WebP, maks 10MB)"
        >
          <ImagePlus size={14} /> Gambar
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Send size={14} /> {submitting ? 'Mengirim...' : submitLabel}
        </button>
      </div>
    </div>
  );
}

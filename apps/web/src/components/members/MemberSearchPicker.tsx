'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import apiClient from '@/lib/api-client';
import { Search, X, Loader2, MapPin, BadgeCheck, Check } from 'lucide-react';

interface MemberResult {
  id: string;
  namaLengkap: string;
  nomorAnggota: string;
  email?: string;
  rantingId: string;
  ranting?: {
    id: string;
    nama: string;
    wilayah?: { id: string; nama: string };
  };
}

interface MemberSearchPickerProps {
  /** Currently selected member ID */
  value?: string;
  /** Called when a member is selected */
  onChange: (member: MemberResult | null) => void;
  /** Optional placeholder text */
  placeholder?: string;
  /** Optional ranting filter */
  rantingId?: string;
  /** Optional wilayah filter */
  wilayahId?: string;
  /** If true, show a compact version */
  compact?: boolean;
  /** Minimum search query length before triggering search */
  minQueryLength?: number;
  /** Debounce delay in ms */
  debounceMs?: number;
}

export default function MemberSearchPicker({
  value,
  onChange,
  placeholder = 'Cari anggota...',
  rantingId,
  wilayahId,
  compact = false,
  minQueryLength = 2,
  debounceMs = 350,
}: MemberSearchPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MemberResult[]>([]);
  const [selected, setSelected] = useState<MemberResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // If value changes externally, fetch the member name
  useEffect(() => {
    if (!value) {
      setSelected(null);
      return;
    }
    // Fetch member name if we have an ID but no selected member
    if (!selected || selected.id !== value) {
      apiClient
        .get(`/members/${value}`)
        .then((r) => {
          const m = r.data?.data || r.data;
          if (m && m.id) {
            setSelected({
              id: m.id,
              namaLengkap: m.namaLengkap,
              nomorAnggota: m.nomorAnggota,
              rantingId: m.rantingId,
              ranting: m.ranting,
            });
          }
        })
        .catch(() => {});
    }
  }, [value, selected]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const doSearch = useCallback(
    async (q: string) => {
      if (q.length < minQueryLength) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const params: Record<string, string> = { q };
        if (rantingId) params.rantingId = rantingId;
        if (wilayahId) params.wilayahId = wilayahId;
        const res = await apiClient.get('/members/search', { params });
        const data = res.data?.data || res.data;
        setResults(Array.isArray(data) ? data : []);
      } catch {
        setResults([]);
      }
      setLoading(false);
    },
    [rantingId, wilayahId, minQueryLength],
  );

  const handleInputChange = (q: string) => {
    setQuery(q);
    setOpen(true);
    if (q.length >= minQueryLength) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSearch(q), debounceMs);
    } else {
      setResults([]);
    }
  };

  const handleSelect = (member: MemberResult) => {
    setSelected(member);
    setQuery('');
    setResults([]);
    setOpen(false);
    onChange(member);
  };

  const handleClear = () => {
    setSelected(null);
    setQuery('');
    setResults([]);
    setOpen(false);
    onChange(null);
    inputRef.current?.focus();
  };

  // If compact & selected, show a pill badge
  if (compact && selected) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 text-sm">
        <BadgeCheck size={14} className="text-blue-600 dark:text-blue-400" />
        <span className="font-medium text-gray-900 dark:text-white">{selected.namaLengkap}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">({selected.nomorAnggota})</span>
        <button onClick={handleClear} className="ml-1 p-0.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors">
          <X size={12} className="text-gray-400" />
        </button>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      {/* Selected state */}
      {selected ? (
        <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
          <BadgeCheck size={18} className="text-blue-600 dark:text-blue-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {selected.namaLengkap}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {selected.nomorAnggota}
              {selected.ranting && <span className="ml-2">· {selected.ranting.nama}</span>}
            </p>
          </div>
          <button
            onClick={handleClear}
            className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
            title="Ganti anggota"
          >
            <X size={14} className="text-gray-400" />
          </button>
        </div>
      ) : (
        <>
          {/* Search input */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => {
                if (results.length > 0) setOpen(true);
              }}
              placeholder={placeholder}
              className="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
            {loading && (
              <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" />
            )}
            {!loading && query && (
              <button
                onClick={() => {
                  setQuery('');
                  setResults([]);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Dropdown results */}
          {open && (
            <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-72 overflow-y-auto">
              {loading && results.length === 0 && (
                <div className="flex items-center gap-2 px-4 py-6 text-sm text-gray-500 justify-center">
                  <Loader2 size={14} className="animate-spin" />
                  Mencari...
                </div>
              )}

              {!loading && query.length < minQueryLength && (
                <div className="px-4 py-6 text-sm text-gray-400 text-center">
                  Ketik minimal {minQueryLength} karakter
                </div>
              )}

              {!loading && results.length === 0 && query.length >= minQueryLength && (
                <div className="px-4 py-6 text-sm text-gray-400 text-center">
                  Tidak ada anggota ditemukan
                </div>
              )}

              {results.map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleSelect(member)}
                  className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {member.namaLengkap}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                      <span className="text-xs font-mono text-blue-600 dark:text-blue-400">
                        {member.nomorAnggota}
                      </span>
                      {member.ranting && (
                        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <MapPin size={10} />
                          {member.ranting.nama}
                          {member.ranting.wilayah && ` · ${member.ranting.wilayah.nama}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <Check size={14} className="text-blue-500 mt-1 shrink-0 opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search } from 'lucide-react';
import apiClient, { extractErrorMessage, unwrap } from '@/lib/api-client';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { PermissionGuard } from '@/components/auth/permission-guard';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import { useToast } from '@/components/ui/toast';
import { MAX_BULK_KTA, buildBulkKtaPayload, validateBulkKtaSelection } from '@/components/kta/bulk';

interface MemberResult {
  id: string;
  namaLengkap: string;
  nomorAnggota: string;
}

const INPUT_CLASS =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm';

export default function KtaBulkPage() {
  const router = useRouter();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MemberResult[]>([]);
  const [searchError, setSearchError] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<MemberResult[]>([]);
  const [batchName, setBatchName] = useState('');
  const [saving, setSaving] = useState(false);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSearchResults([]);
      setSearchError('');
      return;
    }
    let cancelled = false;
    apiClient
      .get('/members', { params: { search: debouncedQuery, limit: 20 } })
      .then((response) => {
        if (!cancelled) {
          setSearchResults(unwrap<MemberResult[]>(response));
          setSearchError('');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setSearchResults([]);
          const detail = extractErrorMessage(err, '');
          setSearchError(detail ? `Gagal mencari anggota: ${detail}` : 'Gagal mencari anggota');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const toggleMember = (member: MemberResult) => {
    const id = member.id;
    if (selectedIds.includes(id)) {
      setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
      setSelectedMembers((prev) => prev.filter((selected) => selected.id !== id));
      return;
    }
    if (selectedIds.length >= MAX_BULK_KTA) return;
    setSelectedIds((prev) => [...prev, id]);
    setSelectedMembers((prev) => [...prev, member]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validateBulkKtaSelection(selectedIds);
    if (validationError) {
      toast('error', validationError);
      return;
    }
    const payload = buildBulkKtaPayload(selectedIds, batchName);
    const body: { anggotaIds: string[]; batchName?: string } = { anggotaIds: payload.anggotaIds };
    if (payload.batchName) body.batchName = payload.batchName;

    setSaving(true);
    try {
      const response = await apiClient.post('/kta-applications/bulk', body);
      const result = unwrap<{
        batchId?: string;
        totalSubmitted: number;
        ineligible?: { anggotaId: string; errors: string[] }[];
      }>(response);
      toast('success', `${result.totalSubmitted} KTA berhasil diajukan`);
      if (result.ineligible?.length) {
        toast('warning', `${result.ineligible.length} anggota tidak memenuhi syarat`);
      }
      router.push(result.batchId ? `/kta/batches/${result.batchId}` : '/kta/queue');
    } catch (err) {
      toast('error', extractErrorMessage(err, 'Gagal mengajukan KTA massal'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PermissionGuard module="members" action="create" minRole="admin_ranting">
      <Breadcrumbs />
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push('/kta/queue')}
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            aria-label="Kembali ke antrian KTA"
          >
            <ArrowLeft size={18} className="text-gray-500" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Bulk KTA Anggota</h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 space-y-6"
        >
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-200">
            Cari anggota, pilih maksimal {MAX_BULK_KTA} anggota, lalu ajukan KTA sekaligus untuk ranting Anda.
          </div>

          <div>
            <label htmlFor="memberSearch" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cari Anggota
            </label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id="memberSearch"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className={`${INPUT_CLASS} pl-9`}
                placeholder="Cari nama / nomor anggota..."
              />
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Hasil Pencarian
            </p>
            {searchError ? (
              <p className="text-sm text-red-600 dark:text-red-400">{searchError}</p>
            ) : searchResults.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {debouncedQuery.length < 2 ? 'Ketik minimal 2 karakter untuk mencari.' : 'Tidak ada anggota yang cocok.'}
              </p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {searchResults.map((member) => (
                  <label
                    key={member.id}
                    className="flex items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 p-3 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(member.id)}
                      disabled={!selectedIds.includes(member.id) && selectedIds.length >= MAX_BULK_KTA}
                      onChange={() => toggleMember(member)}
                      className="h-4 w-4 accent-blue-600"
                    />
                    <span className="text-sm text-gray-900 dark:text-white">{member.namaLengkap}</span>
                    <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{member.nomorAnggota}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Terpilih ({selectedIds.length}/{MAX_BULK_KTA})
            </p>
            {selectedIds.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedMembers.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => toggleMember(member)}
                    className="px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-xs text-blue-700 dark:text-blue-300"
                  >
                    {member.namaLengkap} ×
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="batchName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nama Batch (opsional)
            </label>
            <input
              id="batchName"
              value={batchName}
              onChange={(event) => setBatchName(event.target.value)}
              className={INPUT_CLASS}
              placeholder="Contoh: KTA Ranting November"
              maxLength={100}
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition text-sm"
          >
            {saving ? 'Mengajukan...' : `Ajukan ${selectedIds.length} KTA`}
          </button>
        </form>
      </div>
    </PermissionGuard>
  );
}

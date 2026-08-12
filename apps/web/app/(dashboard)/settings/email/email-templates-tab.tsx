'use client';

import { useState, useEffect, useCallback } from 'react';
import { useConfirm } from '@/components/ui/confirm-modal';
import { FileText, Edit3, Trash2, Eye, X, Code, Send } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { EMAIL_TEMPLATES } from './shared';
import Modal from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';

interface CustomTemplate {
  id: string;
  name: string;
  subject: string;
  htmlBody: string;
  isActive: boolean;
  updatedAt: string;
}

export default function EmailTemplatesTab() {
  const { confirm, confirmModal } = useConfirm();
  const toast = useToast();
  const [customTemplates, setCustomTemplates] = useState<Map<string, CustomTemplate>>(new Map());
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<{
    name: string;
    label: string;
    params: string;
  } | null>(null);
  const [editForm, setEditForm] = useState({ subject: '', htmlBody: '', isActive: true });
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewSubject, setPreviewSubject] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [testEmailInput, setTestEmailInput] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showTestForm, setShowTestForm] = useState(false);
  const [sampleValues, setSampleValues] = useState<Record<string, string>>({
    nama: 'John Doe',
    email: 'john@example.com',
    nomorAnggota: 'THM-2026-0001',
    password: 'password123',
    kegiatanNama: 'Latihan Rutin Sabtu',
    tanggal: '20 Juni 2026',
    lokasi: 'GOR THS-THM',
    peran: 'Penguji Utama',
    resetLink: 'https://app.ths-thm.org/reset?token=xxx',
    badgeName: 'Rajin Berlatih',
    badgeIcon: '🏅',
    description: 'Telah mengikuti 10 kali latihan',
    oldLevel: 'Bronze',
    newLevel: 'Silver',
    points: '1500',
  });

  const total = EMAIL_TEMPLATES.reduce((c, g) => c + g.items.length, 0);

  const fetchCustomTemplates = useCallback(async () => {
    try {
      const { data: res } = await apiClient.get('/mail/templates');
      const map = new Map<string, CustomTemplate>();
      for (const t of res.data || []) {
        map.set(t.name, t);
      }
      setCustomTemplates(map);
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCustomTemplates();
  }, [fetchCustomTemplates]);

  const openEditor = (tpl: { name: string; label: string; params: string }) => {
    const custom = customTemplates.get(tpl.name);
    setEditingTemplate(tpl);
    setEditForm({
      subject: custom?.subject || '',
      htmlBody: custom?.htmlBody || '',
      isActive: custom?.isActive ?? true,
    });
    setShowPreview(false);
    setShowTestForm(false);
    setTestResult(null);
    setTestEmailInput('');
  };

  const closeEditor = () => {
    setEditingTemplate(null);
    setEditForm({ subject: '', htmlBody: '', isActive: true });
    setShowTestForm(false);
    setTestResult(null);
    setTestEmailInput('');
  };

  const saveTemplate = async () => {
    if (!editingTemplate) return;
    if (!editForm.subject.trim()) {
      toast('error', 'Subject harus diisi');
      return;
    }
    if (!editForm.htmlBody.trim()) {
      toast('error', 'Konten HTML harus diisi');
      return;
    }

    setSaving(true);
    try {
      await apiClient.put(`/mail/templates/${editingTemplate.name}`, editForm);
      toast('success', editForm.isActive ? 'Template berhasil disimpan' : 'Template dinonaktifkan');
      await fetchCustomTemplates();
      closeEditor();
    } catch {
      toast('error', 'Gagal menyimpan template');
    }
    setSaving(false);
  };

  const deleteCustomTemplate = async (name: string) => {
    if (!(await confirm(`Hapus custom template "${name}"? Template akan kembali ke default.`))) return;
    try {
      await apiClient.delete(`/mail/templates/${name}`);
      toast('success', 'Custom template dihapus, kembali ke default');
      await fetchCustomTemplates();
      if (editingTemplate?.name === name) closeEditor();
    } catch {
      toast('error', 'Gagal menghapus template');
    }
  };

  const previewTemplate = () => {
    // Replace {{variable}} placeholders with sample values
    let renderedSubject = editForm.subject;
    let renderedHtml = editForm.htmlBody;

    for (const [key, value] of Object.entries(sampleValues)) {
      renderedSubject = renderedSubject.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi'), value);
      renderedHtml = renderedHtml.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi'), value);
    }

    // Replace any remaining {{...}} placeholders with highlighted placeholder text
    renderedSubject = renderedSubject.replace(/\{\{[^}]+\}\}/g, '[{{$&}}]');
    renderedHtml = renderedHtml.replace(/\{\{[^}]+\}\}/g, '<span style="color:#f59e0b;font-weight:bold;">$&</span>');

    setPreviewSubject(renderedSubject);
    setPreviewHtml(renderedHtml);
    setShowPreview(true);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <div className="flex items-center justify-center py-8">
          <span className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm">
        <p className="text-blue-700 dark:text-blue-400 font-medium mb-1">
          ✏️ Kustomisasi Template Email
        </p>
        <p className="text-blue-600 dark:text-blue-300 text-xs">
          Klik template untuk mengedit subject dan konten HTML. Gunakan{' '}
          <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded text-xs">{'{{variable}}'}</code>{' '}
          sebagai placeholder untuk data dinamis. Template custom akan menggantikan template default
          saat dikirim.
        </p>
      </div>

      {/* Template List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Direktori Template Email
          </h2>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {total} template •{' '}
            <span className="text-green-600 dark:text-green-400">
              {customTemplates.size} custom
            </span>
          </span>
        </div>

        {EMAIL_TEMPLATES.map((group) => (
          <div key={group.category} className="mb-6 last:mb-0">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 border-b border-gray-100 dark:border-gray-700 pb-2">
              {group.category}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {group.items.map((tpl) => {
                const custom = customTemplates.get(tpl.name);
                return (
                  <button
                    key={tpl.name}
                    onClick={() => openEditor(tpl)}
                    className={`flex items-start gap-3 p-3 rounded-lg border text-left w-full transition ${
                      custom
                        ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/30 hover:bg-green-100 dark:hover:bg-green-950/50'
                        : 'border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-lg flex-shrink-0 ${
                        custom
                          ? 'bg-green-100 dark:bg-green-900'
                          : 'bg-blue-50 dark:bg-blue-950'
                      }`}
                    >
                      <FileText
                        size={14}
                        className={
                          custom
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-blue-600 dark:text-blue-400'
                        }
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {tpl.label}
                        </span>
                        {custom && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-400 font-medium">
                            Custom
                          </span>
                        )}
                        {custom && !custom.isActive && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-medium">
                            Nonaktif
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {tpl.trigger}
                      </p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 font-mono mt-0.5">
                        {tpl.params}
                      </p>
                    </div>
                    <div className="flex-shrink-0 mt-0.5">
                      {custom ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCustomTemplate(tpl.name);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded transition-colors"
                          title="Hapus custom template"
                        >
                          <X size={12} />
                        </button>
                      ) : (
                        <Edit3 size={12} className="text-gray-300 dark:text-gray-600" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ─── Editor Modal ─── */}
      <Modal
        open={!!editingTemplate}
        onClose={closeEditor}
        title={editingTemplate ? `Edit Template: ${editingTemplate.label}` : ''}
        size="lg"
      >
        {editingTemplate && (
          <div className="space-y-4">
            {/* Template Info */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-sm">
              <p className="text-gray-600 dark:text-gray-400">
                <strong>Trigger:</strong> {editingTemplate.label} —{' '}
                {EMAIL_TEMPLATES.flatMap((g) => g.items).find((t) => t.name === editingTemplate.name)
                  ?.trigger || ''}
              </p>
              <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                Parameter: <code className="font-mono">{editingTemplate.params}</code>
              </p>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Subject
              </label>
              <input
                type="text"
                value={editForm.subject}
                onChange={(e) => setEditForm((p) => ({ ...p, subject: e.target.value }))}
                placeholder="Masukkan subject email (gunakan {{variable}} untuk data dinamis)"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Contoh: Selamat Datang, {'{{nama}}'} — THS-THM
              </p>
            </div>

            {/* HTML Body */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Konten HTML
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    Gunakan {'{{variable}}'} untuk data dinamis
                  </span>
                </div>
              </div>
              <textarea
                value={editForm.htmlBody}
                onChange={(e) => setEditForm((p) => ({ ...p, htmlBody: e.target.value }))}
                rows={14}
                placeholder={`<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">\n  <h1>Halo, {{nama}}!</h1>\n  ...\n</div>`}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none resize-y"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
                <Code size={11} /> Template HTML dengan inline CSS. Variabel dinamis:{' '}
                {editingTemplate.params.replace(/[()]/g, '')}
              </p>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="template-active"
                checked={editForm.isActive}
                onChange={(e) => setEditForm((p) => ({ ...p, isActive: e.target.checked }))}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <label htmlFor="template-active" className="text-sm text-gray-700 dark:text-gray-300">
                Template aktif (gunakan custom template ini saat mengirim email)
              </label>
            </div>

            {/* Sample Values (for preview) */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800"
              >
                <Eye size={14} />
                {showPreview ? 'Sembunyikan Preview' : 'Lihat Preview'}
              </button>

              {showPreview && (
                <div className="mt-3 space-y-3">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Sample Values (untuk preview):
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(sampleValues).map(([key, value]) => (
                        <div key={key} className="flex items-center gap-2 text-xs">
                          <span className="text-gray-500 dark:text-gray-400 font-mono">
                            {'{{'}{key}{'}}'}
                          </span>
                          <input
                            type="text"
                            value={value}
                            onChange={(e) =>
                              setSampleValues((p) => ({ ...p, [key]: e.target.value }))
                            }
                            className="flex-1 px-2 py-1 border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 rounded text-xs"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Preview Result */}
                  {previewSubject && (
                    <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                      <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-600">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          Subject: {previewSubject}
                        </p>
                      </div>
                      <div
                        className="p-4 max-h-96 overflow-y-auto"
                        dangerouslySetInnerHTML={{ __html: previewHtml || '<p class="text-gray-400">Preview tidak tersedia</p>' }}
                      />
                    </div>
                  )}

                  {!previewSubject && (
                    <button
                      onClick={previewTemplate}
                      className="px-3 py-1.5 text-xs bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900 transition"
                    >
                      Generate Preview
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Test Email Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <button
                onClick={() => setShowTestForm(!showTestForm)}
                className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 hover:text-green-800"
              >
                <Send size={14} />
                {showTestForm ? 'Sembunyikan Test Email' : 'Kirim Test dengan Template Ini'}
              </button>

              {showTestForm && (
                <div className="mt-3 space-y-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                    Kirim email test menggunakan subject &amp; konten HTML di atas. Placeholder akan diganti dengan sample values.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      value={testEmailInput}
                      onChange={(e) => setTestEmailInput(e.target.value)}
                      placeholder="Masukkan email tujuan test"
                      className="flex-1 px-3 py-2 border border-green-300 dark:border-green-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                    />
                    <button
                      onClick={async () => {
                        if (!testEmailInput.trim()) {
                          toast('error', 'Masukkan alamat email tujuan');
                          return;
                        }
                        if (!editForm.subject.trim() || !editForm.htmlBody.trim()) {
                          toast('error', 'Subject dan konten HTML harus diisi');
                          return;
                        }
                        setTestSending(true);
                        setTestResult(null);
                        try {
                          const { data } = await apiClient.post('/mail/templates/test-send', {
                            name: editingTemplate?.name,
                            subject: editForm.subject,
                            htmlBody: editForm.htmlBody,
                            to: testEmailInput.trim(),
                          });
                          setTestResult({
                            success: data.success,
                            message: data.message || (data.success ? 'Berhasil dikirim' : 'Gagal dikirim'),
                          });
                        } catch (err: unknown) {
                          const apiErr = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
                          setTestResult({
                            success: false,
                            message: apiErr || 'Gagal terhubung ke server',
                          });
                        }
                        setTestSending(false);
                      }}
                      disabled={testSending || !testEmailInput.trim()}
                      className="flex items-center justify-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50"
                    >
                      {testSending ? (
                        <>
                          <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                          Mengirim...
                        </>
                      ) : (
                        <>
                          <Send size={14} /> Kirim Test
                        </>
                      )}
                    </button>
                  </div>
                  {testResult && (
                    <div
                      className={`px-3 py-2 rounded-lg text-sm flex items-start gap-2 ${
                        testResult.success
                          ? 'bg-white dark:bg-gray-700 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-700'
                          : 'bg-white dark:bg-gray-700 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700'
                      }`}
                    >
                      <span>{testResult.message}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
              <div>
                {customTemplates.has(editingTemplate.name) && (
                  <button
                    onClick={() => deleteCustomTemplate(editingTemplate.name)}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} /> Reset ke Default
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={closeEditor}
                  disabled={saving}
                  className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={saveTemplate}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                  {saving ? (
                    <>
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Edit3 size={14} /> Simpan Custom Template
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
      {confirmModal}
    </div>
  );
}

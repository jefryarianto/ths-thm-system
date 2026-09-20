'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/modal';
import { useAuth } from '@/hooks/use-auth';
import { GraduationCap, Users, ClipboardCheck, FileText, Calendar, ChevronRight } from 'lucide-react';

const STORAGE_KEY = 'admin_kegiatan_welcome_seen';

interface GuideStep {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const steps: GuideStep[] = [
  {
    icon: <GraduationCap className='h-6 w-6 text-primary' />,
    title: 'Kelola Pendadaran',
    description: 'Buat dan kelola jadwal pendadaran. Tetapkan admin kegiatan, tentukan kriteria ujian, dan pantau progres peserta.',
  },
  {
    icon: <Users className='h-6 w-6 text-success' />,
    title: 'Daftarkan Calon Anggota',
    description: 'Masukkan data calon anggota yang akan mengikuti pendadaran. Import dari Excel atau input manual.',
  },
  {
    icon: <ClipboardCheck className='h-6 w-6 text-purple-600' />,
    title: 'Ajukan Penguji',
    description: 'Pilih penguji dari anggota yang hadir di lokasi pendadaran. Pengajuan akan disetujui oleh admin distrik.',
  },
  {
    icon: <FileText className='h-6 w-6 text-warning' />,
    title: 'Atur Ujian Praktek',
    description: 'Buat ujian, tentukan item penilaian, dan assign penguji untuk menilai setiap calon anggota.',
  },
  {
    icon: <Calendar className='h-6 w-6 text-error' />,
    title: 'Pantau Progres',
    description: 'Lihat status kehadiran, skor penguji, dan hasil validasi secara real-time dari dashboard.',
  },
];

export default function AdminKegiatanWelcome() {
  const { role } = useAuth();
  const [open, setOpen] = useState(false);

  // role baru tersedia setelah hydration (useAuth membaca localStorage di effect).
  // Cek "seen" hanya berjalan di client, sehingga tidak ada risiko hydration mismatch.
  useEffect(() => {
    if (role === 'admin_kegiatan') {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) setOpen(true);
    }
  }, [role]);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setOpen(false);
  };

  // Sebelum hydration role selalu null → komponen tak merender apa pun,
  // sama seperti HTML dari server. Setelah hydration, role terisi via re-render.
  if (role !== 'admin_kegiatan') return null;

  return (
    <Modal open={open} onClose={handleClose} title='Selamat Datang, Admin Kegiatan!' size='lg'>
      <div className='space-y-4'>
        <p className='text-sm text-muted'>
          Anda ditugaskan sebagai <strong>Admin Kegiatan</strong>. Berikut panduan cepat untuk memulai:
        </p>

        <div className='space-y-3'>
          {steps.map((step, i) => (
            <div key={i} className='flex items-start gap-3 p-3 rounded-lg bg-surface-variant'>
              <div className='shrink-0 mt-0.5'>{step.icon}</div>
              <div>
                <h4 className='text-sm font-semibold text-text'>{step.title}</h4>
                <p className='text-xs text-muted mt-0.5'>{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className='p-3 rounded-lg bg-info-50 dark:bg-info-950 border border-info-200 dark:border-info-800'>
          <p className='text-xs text-info-700 dark:text-info-300'>
            <strong>Menu Anda:</strong> Dashboard, Calon, Pendadaran, Penguji, Penilaian, Dokumen, Iuran, Forum, Notifikasi
          </p>
        </div>

        <div className='flex justify-end'>
          <button onClick={handleClose} className='px-4 py-2 bg-success text-white rounded-lg text-sm font-medium hover:bg-success-700'>
            Mulai Bekerja <ChevronRight className='inline h-4 w-4 ml-1' />
          </button>
        </div>
      </div>
    </Modal>
  );
}

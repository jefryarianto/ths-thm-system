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
    icon: <GraduationCap className='h-6 w-6 text-blue-600' />,
    title: 'Kelola Pendadaran',
    description: 'Buat dan kelola jadwal pendadaran. Tetapkan admin kegiatan, tentukan kriteria ujian, dan pantau progres peserta.',
  },
  {
    icon: <Users className='h-6 w-6 text-emerald-600' />,
    title: 'Daftarkan Calon Anggota',
    description: 'Masukkan data calon anggota yang akan mengikuti pendadaran. Import dari Excel atau input manual.',
  },
  {
    icon: <ClipboardCheck className='h-6 w-6 text-purple-600' />,
    title: 'Ajukan Penguji',
    description: 'Pilih penguji dari anggota yang hadir di lokasi pendadaran. Pengajuan akan disetujui oleh admin distrik.',
  },
  {
    icon: <FileText className='h-6 w-6 text-orange-600' />,
    title: 'Atur Ujian Praktek',
    description: 'Buat ujian, tentukan item penilaian, dan assign penguji untuk menilai setiap calon anggota.',
  },
  {
    icon: <Calendar className='h-6 w-6 text-red-600' />,
    title: 'Pantau Progres',
    description: 'Lihat status kehadiran, skor penguji, dan hasil validasi secara real-time dari dashboard.',
  },
];

export default function AdminKegiatanWelcome() {
  const { role } = useAuth();
  const [open, setOpen] = useState(false);

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

  if (role !== 'admin_kegiatan') return null;

  return (
    <Modal open={open} onClose={handleClose} title='Selamat Datang, Admin Kegiatan!' size='lg'>
      <div className='space-y-4'>
        <p className='text-sm text-gray-600 dark:text-gray-400'>
          Anda ditugaskan sebagai <strong>Admin Kegiatan</strong>. Berikut panduan cepat untuk memulai:
        </p>

        <div className='space-y-3'>
          {steps.map((step, i) => (
            <div key={i} className='flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800'>
              <div className='shrink-0 mt-0.5'>{step.icon}</div>
              <div>
                <h4 className='text-sm font-semibold text-gray-900 dark:text-white'>{step.title}</h4>
                <p className='text-xs text-gray-600 dark:text-gray-400 mt-0.5'>{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className='p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800'>
          <p className='text-xs text-blue-700 dark:text-blue-300'>
            <strong>Menu Anda:</strong> Dashboard, Calon, Pendadaran, Penguji, Penilaian, Dokumen, Iuran, Forum, Notifikasi
          </p>
        </div>

        <div className='flex justify-end'>
          <button onClick={handleClose} className='px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700'>
            Mulai Bekerja <ChevronRight className='inline h-4 w-4 ml-1' />
          </button>
        </div>
      </div>
    </Modal>
  );
}

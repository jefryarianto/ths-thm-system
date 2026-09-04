'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/ui/modal';
import { useAuth } from '@/hooks/use-auth';
import { ClipboardCheck, Eye, BarChart3, FileText, ChevronRight } from 'lucide-react';

const STORAGE_KEY = 'penguji_welcome_seen';

interface GuideStep {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const steps: GuideStep[] = [
  {
    icon: <ClipboardCheck className='h-6 w-6 text-blue-600' />,
    title: 'Tugas Anda sebagai Penguji',
    description: 'Anda ditugaskan untuk menilai calon anggota yang mengikuti pendadaran. Penilaian dilakukan berdasarkan aspek dan item yang telah ditentukan.',
  },
  {
    icon: <Eye className='h-6 w-6 text-emerald-600' />,
    title: 'Buka Menu Penilaian',
    description: 'Akses menu Penilaian dari sidebar untuk melihat daftar pendadaran yang ditugaskan kepada Anda.',
  },
  {
    icon: <BarChart3 className='h-6 w-6 text-purple-600' />,
    title: 'Input Nilai',
    description: 'Buka detail pendadaran, pilih tab Penilaian, dan masukkan nilai untuk setiap item penilaian pada calon anggota yang Anda uji.',
  },
  {
    icon: <FileText className='h-6 w-6 text-orange-600' />,
    title: 'Lihat Hasil',
    description: 'Setelah semua calon anggota selesai diuji, admin distrik akan melakukan validasi nilai. Anda dapat melihat rekap hasil penilaian.',
  },
];

export default function PengujiWelcome() {
  const { role } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (role === 'penguji') {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) setOpen(true);
    }
  }, [role]);

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setOpen(false);
  };

  if (role !== 'penguji') return null;

  return (
    <Modal open={open} onClose={handleClose} title='Selamat Datang, Penguji!' size='lg'>
      <div className='space-y-4'>
        <p className='text-sm text-gray-600 dark:text-gray-400'>
          Anda ditugaskan sebagai <strong>Penguji</strong>. Berikut panduan cepat untuk memulai:
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
            <strong>Menu Anda:</strong> Dashboard, Penilaian
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

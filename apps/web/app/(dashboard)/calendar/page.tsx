'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import apiClient from '@/lib/api-client';
import { PermissionGuard } from '@/components/auth/permission-guard';

const MONTHS_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const DAYS_FULL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

// ─── Indonesian National Holidays ──────────────────────────────
function getIndonesianHolidays(year: number): Array<{ date: string; name: string }> {
  return [
    { date: `${year}-01-01`, name: 'Tahun Baru Masehi' },
    { date: `${year}-01-28`, name: 'Tahun Baru Imlek 2578' },
    { date: `${year}-03-29`, name: 'Hari Raya Nyepi' },
    { date: `${year}-03-31`, name: 'Wafat Isa Almasih' },
    { date: `${year}-04-10`, name: 'Idul Fitri 1449 H' },
    { date: `${year}-04-11`, name: 'Idul Fitri 1449 H' },
    { date: `${year}-05-01`, name: 'Hari Buruh Internasional' },
    { date: `${year}-05-08`, name: 'Kenaikan Isa Almasih' },
    { date: `${year}-05-20`, name: 'Hari Kebangkitan Nasional' },
    { date: `${year}-06-01`, name: 'Hari Lahir Pancasila' },
    { date: `${year}-06-06`, name: 'Idul Adha 1449 H' },
    { date: `${year}-06-27`, name: 'Tahun Baru Islam 1450 H' },
    { date: `${year}-08-17`, name: 'Hari Kemerdekaan RI' },
    { date: `${year}-09-05`, name: 'Maulid Nabi Muhammad SAW' },
    { date: `${year}-10-01`, name: 'Hari Kesaktian Pancasila' },
    { date: `${year}-10-28`, name: 'Hari Sumpah Pemuda' },
    { date: `${year}-11-10`, name: 'Hari Pahlawan' },
    { date: `${year}-12-22`, name: 'Hari Ibu' },
    { date: `${year}-12-25`, name: 'Hari Raya Natal' },
    { date: `${year}-12-26`, name: 'Cuti Bersama Natal' },
  ];
}

function isHoliday(day: number, month: number, year: number): { isHoliday: boolean; name?: string } {
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const found = getIndonesianHolidays(year).find(h => h.date === dateStr);
  return found ? { isHoliday: true, name: found.name } : { isHoliday: false };
}

// ─── Types ──────────────────────────────────────────────────────
interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  endDate?: string;
  type: string;
  location?: string;
  description?: string;
}

// ─── Event Color Map ────────────────────────────────────────────
const EVENT_STYLES: Record<string, { dot: string; badge: string; text: string }> = {
  training: {
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  pendadaran: {
    dot: 'bg-violet-500',
    badge: 'bg-violet-100 dark:bg-violet-900/60 text-violet-800 dark:text-violet-200 border-violet-200 dark:border-violet-800',
    text: 'text-violet-700 dark:text-violet-300',
  },
  latihan: {
    dot: 'bg-amber-500',
    badge: 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-300',
  },
  ujian_tingkat: {
    dot: 'bg-rose-500',
    badge: 'bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800',
    text: 'text-rose-700 dark:text-rose-300',
  },
  rapat: {
    dot: 'bg-sky-500',
    badge: 'bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-200 border-sky-200 dark:border-sky-800',
    text: 'text-sky-700 dark:text-sky-300',
  },
};

function getEventStyle(type: string) {
  return EVENT_STYLES[type] || {
    dot: 'bg-blue-500',
    badge: 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-300',
  };
}

// ─── Component ──────────────────────────────────────────────────
export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const today = useMemo(() => {
    const d = new Date();
    return { day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear() };
  }, []);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/calendar/events?year=${year}&month=${month}`);
      if (data.success) setEvents(data.data.events || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [year, month]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [firstDay, daysInMonth]);

  const getEventsForDay = useCallback((day: number) =>
    events.filter(e => {
      const d = new Date(e.date);
      return d.getDate() === day && d.getMonth() === month - 1;
    }),
    [events, month],
  );

  const prevMonth = () => { if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1); };
  const goToday = () => { setYear(today.year); setMonth(today.month); };

  const isToday = (day: number) => day === today.day && month === today.month && year === today.year;

  const getDayClass = (day: number, dayOfWeek: number): { numClass: string; cellClass: string } => {
    const holi = isHoliday(day, month, year);
    const isRed = dayOfWeek === 0 || holi.isHoliday;
    const isSat = dayOfWeek === 6;

    let numClass: string;
    let cellClass = 'bg-white dark:bg-gray-900';

    if (isToday(day)) {
      numClass = 'bg-blue-600 text-white font-bold';
      cellClass = 'ring-2 ring-blue-500 dark:ring-blue-400 ring-inset bg-blue-50/50 dark:bg-blue-950/20';
    } else if (isRed) {
      numClass = 'text-red-600 dark:text-red-400 font-semibold';
      cellClass = 'bg-red-50/40 dark:bg-red-950/10';
    } else if (isSat) {
      numClass = 'text-blue-600 dark:text-blue-400';
    } else {
      numClass = 'text-gray-900 dark:text-gray-100';
    }

    return { numClass, cellClass };
  };

  return (
    <PermissionGuard module="calendar" action="view">
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kalender Kegiatan</h1>
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Hari Merah</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Sabtu</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Hari ini</span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={prevMonth} className="px-3 sm:px-4 py-2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors text-sm font-medium">
          &larr; {MONTHS_FULL[month === 1 ? 11 : month - 2].substring(0, 3)}
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-gray-900 dark:text-white">
            {MONTHS_FULL[month - 1]} {year}
          </span>
          <button onClick={goToday} className="px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 ro

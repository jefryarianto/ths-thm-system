'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import apiClient from '@/lib/api-client';
import { PermissionGuard } from '@/components/auth/permission-guard';

const MONTHS_FULL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const DAYS_FULL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

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

interface NationalHoliday {
  id: string;
  date: string;
  name: string;
}

interface HolidayLookup {
  [dateKey: string]: string; // "YYYY-MM-DD" => holiday name
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

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ─── Component ──────────────────────────────────────────────────
export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [holidays, setHolidays] = useState<HolidayLookup>({});
  const [loading, setLoading] = useState(true);

  const today = useMemo(() => {
    const d = new Date();
    return { day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear() };
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const { data } = await apiClient.get(`/calendar/events?year=${year}&month=${month}`);
      if (data.success) setEvents(data.data.events || []);
    } catch { /* ignore */ }
  }, [year, month]);

  const fetchHolidays = useCallback(async () => {
    try {
      const { data } = await apiClient.get(`/calendar/holidays?year=${year}`);
      if (data.success && Array.isArray(data.data)) {
        const lookup: HolidayLookup = {};
        for (const h of data.data as NationalHoliday[]) {
          const d = new Date(h.date);
          const key = toDateKey(d.getFullYear(), d.getMonth() + 1, d.getDate());
          // Only store first holiday name for a given date (most significant)
          if (!lookup[key]) lookup[key] = h.name;
        }
        setHolidays(lookup);
      }
    } catch { /* ignore */ }
  }, [year]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchEvents(), fetchHolidays()]).finally(() => setLoading(false));
  }, [fetchEvents, fetchHolidays]);

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
    const holidayName = holidays[toDateKey(year, month, day)];
    const isRed = dayOfWeek === 0 || !!holidayName;
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
          <button onClick={goToday} className="px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors">
            Hari Ini
          </button>
        </div>
        <button onClick={nextMonth} className="px-3 sm:px-4 py-2 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors text-sm font-medium">
          {MONTHS_FULL[month === 12 ? 0 : month].substring(0, 3)} &rarr;
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          {DAYS_FULL.map((d, i) => (
            <div key={d} className={`p-2 sm:p-3 text-center text-xs sm:text-sm font-semibold ${
              i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'
            }`}>
              <span className="hidden sm:inline">{d}</span>
              <span className="sm:hidden">{d.substring(0, 2)}</span>
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, idx) => {
            if (day === null) return <div key={`empty-${idx}`} className="min-h-[80px] sm:min-h-[100px] bg-gray-50/30 dark:bg-gray-800/10" />;

            const dayOfWeek = idx % 7;
            const { numClass, cellClass } = getDayClass(day, dayOfWeek);
            const dayEvents = getEventsForDay(day);
            const holidayName = holidays[toDateKey(year, month, day)];

            return (
              <div
                key={`day-${day}`}
                className={`min-h-[80px] sm:min-h-[100px] p-1 sm:p-2 border-b border-r border-gray-100 dark:border-gray-800/50 ${cellClass} transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/20`}
                title={holidayName || (dayEvents.length > 0 ? `${dayEvents.length} kegiatan` : undefined)}
              >
                {/* Date number */}
                <div className="flex items-start justify-between mb-1">
                  <span className={`inline-flex items-center justify-center w-7 h-7 text-xs sm:text-sm rounded-full ${numClass}`}>
                    {day}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="hidden sm:inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-blue-500 rounded-full">
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                {/* Holiday name */}
                {holidayName && (
                  <div className="hidden sm:block text-[10px] leading-tight text-red-600 dark:text-red-400 font-medium truncate mb-0.5 px-0.5">
                    {holidayName}
                  </div>
                )}

                {/* Event dots */}
                <div className="flex flex-col gap-0.5">
                  {dayEvents.slice(0, 3).map((ev) => (
                    <div
                      key={ev.id}
                      className={`hidden sm:flex items-center gap-1 px-1 py-0.5 rounded text-[10px] leading-tight truncate ${getEventStyle(ev.type).badge}`}
                      title={ev.title}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getEventStyle(ev.type).dot}`} />
                      {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="hidden sm:block text-[10px] text-gray-400 dark:text-gray-500 pl-1">
                      +{dayEvents.length - 3} lainnya
                    </div>
                  )}
                  {/* Mobile dots */}
                  {dayEvents.length > 0 && (
                    <div className="sm:hidden flex gap-0.5 flex-wrap">
                      {dayEvents.slice(0, 4).map((ev) => (
                        <span key={ev.id} className={`w-1.5 h-1.5 rounded-full ${getEventStyle(ev.type).dot}`} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="mt-4 flex items-center justify-center py-3 text-sm text-gray-400 dark:text-gray-500">
          <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Memuat kalender...
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        {Object.entries(EVENT_STYLES).map(([key, style]) => (
          <span key={key} className="inline-flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${style.dot}`} />
            {key === 'training' ? 'Latihan' : key === 'pendadaran' ? 'Pendadaran' : key === 'ujian_tingkat' ? 'Ujian Tingkat' : key.charAt(0).toUpperCase() + key.slice(1)}
          </span>
        ))}
      </div>
    </div>
    </PermissionGuard>
  );
}

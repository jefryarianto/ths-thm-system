'use client';
import { useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export default function CalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [events, setEvents] = useState<Array<{ date: string; title: string; type: string; location?: string }>>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get(`/calendar/events?year=${year}&month=${month}`);
      if (data.success) setEvents(data.data.events || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [year, month]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDay = new Date(year, month - 1, 1).getDay();
  const calendarDays: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

  const getEventsForDay = (day: number) => events.filter(e => {
    const d = new Date(e.date);
    return d.getDate() === day && d.getMonth() === month - 1;
  });

  const prevMonth = () => { if (month === 1) { setYear(y => y - 1); setMonth(12); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setYear(y => y + 1); setMonth(1); } else setMonth(m => m + 1); };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Kalender Kegiatan</h1>

      <div className="flex items-center justify-between mb-6">
        <button onClick={prevMonth} className="px-4 py-2 bg-blue-100 rounded-lg hover:bg-blue-200">&larr; Sebelumnya</button>
        <span className="text-xl font-bold">{MONTHS[month - 1]} {year}</span>
        <button onClick={nextMonth} className="px-4 py-2 bg-blue-100 rounded-lg hover:bg-blue-200">Berikutnya &rarr;</button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Memuat...</div>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS.map(d => <div key={d} className="text-center font-semibold text-sm py-2 text-gray-600">{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              const dayEvents = day ? getEventsForDay(day) : [];
              return (
                <div key={i} className={`min-h-[100px] p-1 rounded-lg border ${day ? 'bg-white' : 'bg-gray-50'}`}>
                  {day && <span className="text-sm font-medium">{day}</span>}
                  {dayEvents.slice(0, 3).map((e: { title: string; type: string }, j: number) => (
                    <div key={j} className={`text-xs p-1 mt-1 rounded truncate ${e.type === 'training' ? 'bg-green-100 text-green-800' : e.type === 'pendadaran' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                      {e.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && <div className="text-xs text-gray-400 mt-1">+{dayEvents.length - 3} lagi</div>}
                </div>
              );
            })}
          </div>

          <div className="mt-6">
            <h2 className="text-lg font-semibold mb-3">Semua Event Bulan Ini ({events.length})</h2>
            <div className="space-y-2">
              {events.map((e: { date: string; title: string; type: string; location?: string }, i: number) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-white rounded-lg border">
                  <div className={`w-3 h-3 rounded-full ${e.type === 'training' ? 'bg-green-500' : e.type === 'pendadaran' ? 'bg-purple-500' : 'bg-blue-500'}`} />
                  <div className="flex-1">
                    <div className="font-medium">{e.title}</div>
                    <div className="text-sm text-gray-500">{new Date(e.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                  </div>
                  {e.location && <span className="text-sm text-gray-500">{e.location}</span>}
                </div>
              ))}
              {events.length === 0 && <div className="text-center py-8 text-gray-400">Tidak ada kegiatan bulan ini</div>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
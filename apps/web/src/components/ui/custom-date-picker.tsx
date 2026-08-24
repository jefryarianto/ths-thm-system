'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const DAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  return `${y}-${m}-${d}`;
}

function fromIdToDate(idDate: string): Date | null {
  if (!idDate) return null;

  // Handle YYYY-MM-DD (ISO) format
  if (idDate.includes('-') && idDate.length === 10) {
    const [y, m, d] = idDate.split('-');
    const yyyy = Number(y);
    const mm = Number(m);
    const dd = Number(d);
    if (!dd || !mm || !yyyy) return null;
    const date = new Date(yyyy, mm - 1, dd);
    if (date.getFullYear() !== yyyy || date.getMonth() !== mm - 1 || date.getDate() !== dd) return null;
    return date;
  }

  // Handle DD/MM/YYYY format
  const parts = idDate.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  const dd = Number(d);
  const mm = Number(m);
  const yyyy = Number(y);
  if (!dd || !mm || !yyyy) return null;
  const date = new Date(yyyy, mm - 1, dd);
  if (date.getFullYear() !== yyyy || date.getMonth() !== mm - 1 || date.getDate() !== dd) return null;
  return date;
}

interface CustomDatePickerProps {
  value?: string | null;
  onChange: (iso: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function CustomDatePicker({ value, onChange, placeholder = 'DD/MM/YYYY', disabled }: CustomDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(() => {
    if (value) {
      const parsed = fromIdToDate(value);
      if (parsed) return parsed;
    }
    return new Date();
  });
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = value ? fromIdToDate(value) : null;

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();

  const handleSelect = useCallback(
    (day: number) => {
      const picked = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
      onChange(toIso(picked));
      setOpen(false);
    },
    [viewDate, onChange],
  );

  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayValue = selectedDate
    ? `${pad(selectedDate.getDate())}/${pad(selectedDate.getMonth() + 1)}/${selectedDate.getFullYear()}`
    : '';

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        disabled={disabled}
        className={`w-full flex items-center justify-between px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 transition ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span className={displayValue ? '' : 'text-gray-400 dark:text-gray-500'}>
          {displayValue || placeholder}
        </span>
        <CalendarIcon size={16} className="text-gray-400 dark:text-gray-500" />
      </button>

      {open && (
        <div className="absolute z-50 mt-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-elegant-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={prevMonth} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {MONTHS_ID[viewDate.getMonth()]} {viewDate.getFullYear()}
            </span>
            <button type="button" onClick={nextMonth} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAYS_ID.map((day) => (
              <div key={day} className="text-center text-[11px] font-medium text-gray-500 dark:text-gray-400 py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isSelected = selectedDate
                ? selectedDate.getFullYear() === viewDate.getFullYear()
                  && selectedDate.getMonth() === viewDate.getMonth()
                  && selectedDate.getDate() === day
                : false;
              const isToday = (() => {
                const today = new Date();
                return today.getFullYear() === viewDate.getFullYear()
                  && today.getMonth() === viewDate.getMonth()
                  && today.getDate() === day;
              })();
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelect(day)}
                  className={`h-8 w-8 mx-auto flex items-center justify-center rounded-lg text-xs font-medium transition ${
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : isToday
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

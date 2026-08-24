'use client';

import React from 'react';

// ─── Types ──────────────────────────────────────────────────────

export interface CalendarDayEvent {
  id: string;
  title: string;
  date: string;
  type: string;
  time?: string;
}

export type CalendarDayVariant = 'sm' | 'md' | 'lg';

export interface CalendarDayProps {
  /** Day of month (1-31). Required. */
  day: number;

  /** Year for date context */
  year?: number;

  /** Month for date context (1-12) */
  month?: number;

  /** Size variant */
  variant?: CalendarDayVariant;

  /** Events for this day */
  events?: CalendarDayEvent[];

  /** Holiday name (if this day is a national holiday) */
  holidayName?: string | null;

  /** Whether this day is today */
  isToday?: boolean;

  /** Day of week (0=Sunday, 6=Saturday) - used for weekend coloring */
  dayOfWeek?: number;

  /** Whether to show weekend colors (red for Sunday, blue for Saturday) */
  showWeekendColors?: boolean;

  /** Custom class for the cell */
  className?: string;

  /** Click handler */
  onClick?: (day: number) => void;

  /** Max events to show before "+N more" truncation */
  maxVisibleEvents?: number;

  /** Event color map: type → { dot, badge, text } tailwind classes */
  eventStyles?: Record<string, { dot: string; badge: string; text: string }>;

  /** Whether the day is in a different month (greyed out) */
  isOutsideMonth?: boolean;

  /** Custom content rendered at the bottom of the cell (only for md/lg) */
  children?: React.ReactNode;
}

// ─── Default Event Styles ──────────────────────────────────────

const DEFAULT_EVENT_STYLES: Record<string, { dot: string; badge: string; text: string }> = {
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
  holiday: {
    dot: 'bg-red-500',
    badge: 'bg-red-100 dark:bg-red-900/60 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800',
    text: 'text-red-700 dark:text-red-300',
  },
};

function getEventStyle(type: string, customStyles?: Record<string, { dot: string; badge: string; text: string }>) {
  const styles = customStyles || DEFAULT_EVENT_STYLES;
  return styles[type] || {
    dot: 'bg-blue-500',
    badge: 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-300',
  };
}

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ─── Size Maps ─────────────────────────────────────────────────

const SIZE_MAP: Record<CalendarDayVariant, {
  cell: string;
  numSize: string;
  numWrapper: string;
  badgeSize: string;
  dotSize: string;
  eventBadge: string;
  eventText: string;
  holidayText: string;
}> = {
  sm: {
    cell: 'min-h-[32px] p-0.5',
    numSize: 'text-[11px]',
    numWrapper: 'w-5 h-5',
    badgeSize: 'w-3.5 h-3.5 text-[7px]',
    dotSize: 'w-1 h-1',
    eventBadge: 'hidden',     // no event text on sm
    eventText: 'hidden',
    holidayText: 'hidden',
  },
  md: {
    cell: 'min-h-[80px] sm:min-h-[100px] p-1 sm:p-2',
    numSize: 'text-xs sm:text-sm',
    numWrapper: 'w-7 h-7',
    badgeSize: 'w-5 h-5 text-[10px]',
    dotSize: 'w-1.5 h-1.5',
    eventBadge: 'hidden sm:flex',
    eventText: 'text-[10px] leading-tight',
    holidayText: 'hidden sm:block text-[10px]',
  },
  lg: {
    cell: 'min-h-[120px] sm:min-h-[150px] p-2 sm:p-3',
    numSize: 'text-sm sm:text-base',
    numWrapper: 'w-8 h-8 sm:w-9 sm:h-9',
    badgeSize: 'w-5 h-5 sm:w-6 sm:h-6 text-[10px] sm:text-xs',
    dotSize: 'w-2 h-2',
    eventBadge: 'flex',
    eventText: 'text-[11px] sm:text-xs leading-tight',
    holidayText: 'block text-[10px] sm:text-xs',
  },
};

// ─── Component ─────────────────────────────────────────────────

export default function CalendarDay({
  day,
  year,
  month,
  variant = 'md',
  events = [],
  holidayName,
  isToday = false,
  dayOfWeek,
  showWeekendColors = true,
  className = '',
  onClick,
  maxVisibleEvents,
  eventStyles: customEventStyles,
  isOutsideMonth = false,
  children,
}: CalendarDayProps) {

  const isSunday = dayOfWeek === 0;
  const isSaturday = dayOfWeek === 6;
  const isRedDay = isSunday || !!holidayName;

  const style = SIZE_MAP[variant];
  const visibleEvents = maxVisibleEvents
    ? events.slice(0, maxVisibleEvents)
    : variant === 'sm'
      ? events.slice(0, 3)
      : variant === 'md'
        ? events.slice(0, 3)
        : events.slice(0, 5);
  const overflowCount = events.length - visibleEvents.length;

  // ── Num classes ──
  let numClass: string;
  let cellBg: string;

  if (isOutsideMonth) {
    numClass = 'text-gray-300 dark:text-gray-600';
    cellBg = 'bg-gray-50/50 dark:bg-gray-900/30';
  } else if (isToday) {
    numClass = 'bg-blue-600 text-white font-bold';
    cellBg = 'ring-2 ring-blue-500 dark:ring-blue-400 ring-inset bg-blue-50/50 dark:bg-blue-950/20';
  } else if (isRedDay && showWeekendColors) {
    numClass = 'text-red-600 dark:text-red-400 font-semibold';
    cellBg = 'bg-red-50/40 dark:bg-red-950/10';
  } else if (isSaturday && showWeekendColors) {
    numClass = 'text-blue-600 dark:text-blue-400';
    cellBg = 'bg-white dark:bg-gray-900';
  } else {
    numClass = 'text-gray-900 dark:text-gray-100';
    cellBg = 'bg-white dark:bg-gray-900';
  }

  const handleClick = onClick ? () => onClick(day) : undefined;

  return (
    <div
      className={`${style.cell} border-b border-r border-gray-100 dark:border-gray-800/50 ${cellBg} transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/20 ${onClick ? 'cursor-pointer' : ''} ${isOutsideMonth ? 'opacity-50' : ''} ${className}`}
      title={holidayName || (events.length > 0 ? `${events.length} kegiatan` : undefined)}
      onClick={handleClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(day); } } : undefined}
    >
      {/* Date number row */}
      <div className="flex items-start justify-between mb-0.5 sm:mb-1">
        <span className={`inline-flex items-center justify-center rounded-full ${style.numWrapper} ${style.numSize} ${numClass}`}>
          {day}
        </span>
        {events.length > 0 && variant !== 'sm' && (
          <span className={`inline-flex items-center justify-center rounded-full font-bold text-white bg-blue-500 ${style.badgeSize}`}>
            {events.length}
          </span>
        )}
      </div>

      {/* Holiday name */}
      {holidayName && (
        <div className={`${style.holidayText} leading-tight text-red-600 dark:text-red-400 font-medium truncate mb-0.5 px-0.5`}>
          {holidayName}
        </div>
      )}

      {/* Events */}
      {events.length > 0 && (
        <div className="flex flex-col gap-0.5">
          {/* Event badges (md/lg only) */}
          {visibleEvents.map((ev) => (
            <div
              key={ev.id}
              className={`${style.eventBadge} items-center gap-1 px-1 py-0.5 rounded truncate ${getEventStyle(ev.type, customEventStyles).badge}`}
              title={ev.title}
            >
              <span className={`${style.dotSize} rounded-full shrink-0 ${getEventStyle(ev.type, customEventStyles).dot}`} />
              <span className="truncate">{ev.title}</span>
              {variant === 'lg' && ev.time && (
                <span className="text-[10px] opacity-75 shrink-0 ml-auto">{ev.time}</span>
              )}
            </div>
          ))}

          {/* Overflow indicator */}
          {overflowCount > 0 && (
            <div className={`${style.eventText} text-gray-400 dark:text-gray-500 pl-1 ${variant === 'sm' ? 'hidden' : ''}`}>
              +{overflowCount} lainnya
            </div>
          )}

          {/* Mobile dots (sm/md only) */}
          {variant !== 'lg' && (
            <div className="sm:hidden flex gap-0.5 flex-wrap">
              {events.slice(0, 4).map((ev) => (
                <span
                  key={ev.id}
                  className={`${style.dotSize} rounded-full ${getEventStyle(ev.type, customEventStyles).dot}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Custom content (md/lg only) */}
      {children}
    </div>
  );
}

// ─── Exported utilities ────────────────────────────────────────

/**
 * Common constants shared by calendar consumers.
 */
export const MONTHS_FULL = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export const DAYS_FULL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export const DAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export { DEFAULT_EVENT_STYLES as EVENT_STYLES, toDateKey };

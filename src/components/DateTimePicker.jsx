import { useState, useRef, useEffect } from 'react';

const MONTHS = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
const DAYS = ['Lu','Ma','Me','Gi','Ve','Sa','Do'];

function pad(n) { return String(n).padStart(2, '0'); }

function buildCalendar(year, month) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  let startDay = first.getDay() - 1; // Monday = 0
  if (startDay < 0) startDay = 6;

  const days = [];
  // Previous month padding
  const prevLast = new Date(year, month, 0).getDate();
  for (let i = startDay - 1; i >= 0; i--) days.push({ day: prevLast - i, current: false });
  // Current month
  for (let d = 1; d <= last.getDate(); d++) days.push({ day: d, current: true });
  // Next month padding
  const remaining = 42 - days.length;
  for (let d = 1; d <= remaining; d++) days.push({ day: d, current: false });

  return days;
}

function parseValue(value) {
  if (!value) return null;
  // value = "2026-02-28T09:00" (datetime-local format)
  const [datePart, timePart] = value.split('T');
  const [y, m, d] = datePart.split('-').map(Number);
  const [h, min] = (timePart || '00:00').split(':').map(Number);
  return { year: y, month: m - 1, day: d, hour: h, minute: min };
}

function formatValue(year, month, day, hour, minute) {
  return `${year}-${pad(month + 1)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
}

export default function DateTimePicker({ value, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const parsed = parseValue(value);
  const today = new Date();
  const [viewYear, setViewYear] = useState(parsed?.year || today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? today.getMonth());

  const selYear = parsed?.year;
  const selMonth = parsed?.month;
  const selDay = parsed?.day;
  const selHour = parsed?.hour ?? 0;
  const selMinute = parsed?.minute ?? 0;

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const calendar = buildCalendar(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const selectDay = (day, isCurrent) => {
    if (!isCurrent) return;
    const h = selHour;
    const m = selMinute;
    onChange(formatValue(viewYear, viewMonth, day, h, m));
  };

  const setHour = (h) => {
    if (!parsed) {
      const t = new Date();
      onChange(formatValue(t.getFullYear(), t.getMonth(), t.getDate(), h, 0));
    } else {
      onChange(formatValue(selYear, selMonth, selDay, h, selMinute));
    }
  };

  const setMinute = (m) => {
    if (!parsed) {
      const t = new Date();
      onChange(formatValue(t.getFullYear(), t.getMonth(), t.getDate(), t.getHours(), m));
    } else {
      onChange(formatValue(selYear, selMonth, selDay, selHour, m));
    }
  };

  const clear = (e) => {
    e.stopPropagation();
    onChange('');
    setOpen(false);
  };

  const isToday = (day) => day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
  const isSelected = (day) => day === selDay && viewMonth === selMonth && viewYear === selYear;

  const displayValue = parsed
    ? `${pad(parsed.day)}/${pad(parsed.month + 1)}/${parsed.year}  ${pad(parsed.hour)}:${pad(parsed.minute)}`
    : '';

  return (
    <div ref={ref} className="relative">
      {/* Input */}
      <div
        className="w-full border border-border rounded-lg px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent bg-white flex items-center gap-2 cursor-pointer min-h-[38px]"
        onClick={() => setOpen(!open)}
      >
        <svg className="w-4 h-4 text-text-secondary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {displayValue ? (
          <span className="flex-1">{displayValue}</span>
        ) : (
          <span className="flex-1 text-text-secondary">{placeholder || 'Seleziona data e ora...'}</span>
        )}
        {value && (
          <button type="button" onClick={clear} className="text-text-secondary hover:text-danger">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 bg-white border border-border rounded-xl shadow-lg p-4 w-[300px]">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-bg transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-semibold">{MONTHS[viewMonth]} {viewYear}</span>
            <button type="button" onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-bg transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-[10px] font-medium text-text-secondary py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {calendar.map((cell, i) => (
              <button
                key={i}
                type="button"
                onClick={() => selectDay(cell.day, cell.current)}
                className={`
                  w-full aspect-square flex items-center justify-center text-xs rounded-lg transition-colors
                  ${!cell.current ? 'text-text-secondary/30 cursor-default' : 'hover:bg-bg cursor-pointer'}
                  ${cell.current && isSelected(cell.day) ? 'bg-accent text-white hover:bg-accent-hover' : ''}
                  ${cell.current && isToday(cell.day) && !isSelected(cell.day) ? 'font-bold text-accent' : ''}
                `}
              >
                {cell.day}
              </button>
            ))}
          </div>

          {/* Time selector */}
          <div className="border-t border-border mt-3 pt-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-text-secondary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <select
                value={selHour}
                onChange={(e) => setHour(Number(e.target.value))}
                className="border border-border rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{pad(i)}</option>
                ))}
              </select>
              <span className="text-sm font-medium">:</span>
              <select
                value={selMinute}
                onChange={(e) => setMinute(Number(e.target.value))}
                className="border border-border rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
              >
                {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                  <option key={m} value={m}>{pad(m)}</option>
                ))}
              </select>
              <span className="text-xs text-text-secondary ml-auto">Timezone ad account</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';

export default function Select({ label, value, onChange, options, placeholder, className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const listRef = useRef(null);

  const selected = options.find((opt) => opt.value === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Scroll selected item into view when opening
  useEffect(() => {
    if (open && listRef.current && value) {
      const el = listRef.current.querySelector(`[data-value="${value}"]`);
      if (el) el.scrollIntoView({ block: 'nearest' });
    }
  }, [open, value]);

  return (
    <div className={`relative ${className}`} ref={ref}>
      {label && <label className="block text-xs font-medium text-text-secondary mb-1">{label}</label>}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between border border-border rounded-lg px-3 py-2 text-[13px] bg-white hover:border-accent/40 focus:outline-none focus:ring-2 focus:ring-accent/[0.15] focus:border-accent transition-colors text-left ${!selected && placeholder ? 'text-text-tertiary' : 'text-text'}`}
      >
        <span className="truncate">{selected ? selected.label : (placeholder || 'Select...')}</span>
        <svg className={`w-3.5 h-3.5 text-text-tertiary flex-shrink-0 ml-2 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          ref={listRef}
          className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-border rounded-xl shadow-lg max-h-[220px] overflow-y-auto py-1"
        >
          {placeholder && (
            <button
              type="button"
              data-value=""
              onClick={() => { onChange(''); setOpen(false); }}
              className={`w-full flex items-center px-3 py-1.5 text-[13px] text-left hover:bg-accent/5 transition-colors ${!value ? 'bg-accent/5 text-accent font-medium' : 'text-text-tertiary'}`}
            >
              {placeholder}
            </button>
          )}
          {options.map((opt) => {
            const isSel = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                data-value={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-[13px] text-left hover:bg-accent/5 transition-colors ${isSel ? 'bg-accent/5' : ''}`}
              >
                <span className={isSel ? 'font-medium text-accent' : 'text-text'}>{opt.label}</span>
                {isSel && (
                  <svg className="w-3.5 h-3.5 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

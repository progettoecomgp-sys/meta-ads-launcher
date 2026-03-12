import { useState, useRef, useEffect } from 'react';

export default function CreativeAdSetPicker({ adSets, selectedIds, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const isAll = selectedIds.includes('__all__');
  const count = isAll ? adSets.length : selectedIds.length;

  const toggle = (id) => {
    if (id === '__all__') {
      onChange(['__all__']);
      return;
    }
    let next;
    if (isAll) {
      // Switching from "all" to specific — select only this one
      next = [id];
    } else if (selectedIds.includes(id)) {
      next = selectedIds.filter((x) => x !== id);
      if (next.length === 0) next = ['__all__']; // can't have zero
    } else {
      next = [...selectedIds, id];
      // If all are individually selected, switch back to __all__
      if (next.length === adSets.length) next = ['__all__'];
    }
    onChange(next);
  };

  const isSelected = (id) => isAll || selectedIds.includes(id);

  // Label for the button
  const label = isAll
    ? 'All Ad Sets'
    : count === 1
      ? (adSets.find((a) => a._id === selectedIds[0])?.name || 'Ad Set')
      : `${count} ad sets`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium rounded-md border border-border hover:border-accent hover:text-accent transition-colors bg-white"
      >
        {!isAll && count < adSets.length && (
          <span className="flex -space-x-1">
            {selectedIds.slice(0, 3).map((id) => {
              const as = adSets.find((a) => a._id === id);
              return as ? <span key={id} className="w-2 h-2 rounded-full border border-white" style={{ backgroundColor: as._color }} /> : null;
            })}
          </span>
        )}
        <span className="truncate max-w-[100px]">{label}</span>
        <svg className={`w-3 h-3 text-text-secondary transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 right-0 w-48 bg-white border border-border rounded-lg shadow-lg overflow-hidden">
          {/* All option */}
          <button
            type="button"
            onClick={() => toggle('__all__')}
            className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-bg transition-colors ${isAll ? 'bg-accent/5 font-medium' : ''}`}
          >
            <input type="checkbox" checked={isAll} readOnly className="w-3 h-3 rounded border-border text-accent pointer-events-none" />
            <span>All Ad Sets</span>
          </button>
          <div className="border-t border-border" />
          {adSets.map((as) => (
            <button
              key={as._id}
              type="button"
              onClick={() => toggle(as._id)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-bg transition-colors ${isSelected(as._id) && !isAll ? 'bg-accent/5' : ''}`}
            >
              <input type="checkbox" checked={isSelected(as._id)} readOnly className="w-3 h-3 rounded border-border text-accent pointer-events-none" />
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: as._color }} />
              <span className="truncate">{as.name || '(unnamed)'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

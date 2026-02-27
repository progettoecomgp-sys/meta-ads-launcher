import { useState, useRef, useEffect } from 'react';
import { COUNTRIES } from '../utils/constants';

export default function CountryPicker({ selected, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = COUNTRIES.filter((c) => {
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
  });

  const toggle = (code) => {
    if (selected.includes(code)) {
      onChange(selected.filter((c) => c !== code));
    } else {
      onChange([...selected, code]);
    }
  };

  const remove = (code) => {
    onChange(selected.filter((c) => c !== code));
  };

  return (
    <div ref={ref} className="relative">
      {/* Selected tags + input */}
      <div
        className="w-full border border-border rounded-lg px-2 py-1.5 text-sm focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent bg-white flex flex-wrap gap-1 cursor-text min-h-[38px]"
        onClick={() => setOpen(true)}
      >
        {selected.map((code) => {
          const country = COUNTRIES.find((c) => c.code === code);
          return (
            <span key={code} className="inline-flex items-center gap-1 bg-accent/10 text-accent text-xs font-medium px-2 py-0.5 rounded-md">
              {code}
              <button type="button" onClick={(e) => { e.stopPropagation(); remove(code); }}
                className="hover:text-danger">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          );
        })}
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="flex-1 min-w-[80px] outline-none text-sm bg-transparent py-0.5"
          placeholder={selected.length === 0 ? 'Search countries...' : ''}
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-border rounded-lg shadow-lg max-h-[240px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-text-secondary">No countries found</div>
          ) : (
            filtered.map((c) => {
              const isSelected = selected.includes(c.code);
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => toggle(c.code)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-bg transition-colors ${isSelected ? 'bg-accent/5' : ''}`}
                >
                  <input type="checkbox" checked={isSelected} readOnly
                    className="w-3.5 h-3.5 rounded border-border text-accent focus:ring-0 pointer-events-none" />
                  <span className="font-mono text-xs text-text-secondary w-6">{c.code}</span>
                  <span>{c.name}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

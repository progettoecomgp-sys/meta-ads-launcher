import { useState, useRef, useEffect } from 'react';

export default function PagePicker({ pages, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selectedPage = pages.find((p) => p.id === selected);

  const getPicUrl = (page) =>
    page?.picture?.data?.url || `https://graph.facebook.com/${page.id}/picture?type=small`;

  return (
    <div ref={ref} className="relative">
      {/* Selected display */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent bg-white flex items-center gap-2.5 min-h-[38px] text-left"
      >
        {selectedPage ? (
          <>
            {getPicUrl(selectedPage) ? (
              <img src={getPicUrl(selectedPage)} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                <span className="text-accent text-[10px] font-bold">{selectedPage.name[0]?.toUpperCase()}</span>
              </div>
            )}
            <span className="flex-1 truncate">{selectedPage.name}</span>
            <span className="text-xs text-text-secondary">{selectedPage.id}</span>
          </>
        ) : (
          <span className="text-text-secondary flex-1">Seleziona una pagina...</span>
        )}
        <svg className={`w-4 h-4 text-text-secondary transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-border rounded-lg shadow-lg max-h-[240px] overflow-y-auto">
          {pages.length === 0 ? (
            <div className="px-3 py-2 text-xs text-text-secondary">Nessuna pagina trovata</div>
          ) : (
            pages.map((page) => {
              const isSelected = page.id === selected;
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => { onChange(page.id); setOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-bg transition-colors ${isSelected ? 'bg-accent/5' : ''}`}
                >
                  {getPicUrl(page) ? (
                    <img src={getPicUrl(page)} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-accent text-xs font-bold">{page.name[0]?.toUpperCase()}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`truncate ${isSelected ? 'font-medium text-accent' : ''}`}>{page.name}</p>
                    <p className="text-[10px] text-text-secondary">{page.id}</p>
                  </div>
                  {isSelected && (
                    <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

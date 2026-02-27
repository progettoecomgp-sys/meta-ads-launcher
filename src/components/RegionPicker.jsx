import { useState, useRef, useEffect, useCallback } from 'react';
import { searchRegions } from '../utils/metaApi';

export default function RegionPicker({ selected, onChange, accessToken, countries }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const debounceRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Debounced search — filter results by included countries
  const doSearch = useCallback((query) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.length < 2 || !accessToken) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchRegions(accessToken, query);
        // Filter to only show regions from included countries
        const countryCodes = countries || [];
        const filtered = countryCodes.length > 0
          ? data.filter((r) => countryCodes.includes(r.country_code))
          : data;
        setResults(filtered);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  }, [accessToken, countries]);

  useEffect(() => {
    doSearch(search);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search, doSearch]);

  const toggle = (region) => {
    setSearch('');
    const exists = selected.find((r) => r.key === region.key);
    if (exists) {
      onChange(selected.filter((r) => r.key !== region.key));
    } else {
      onChange([...selected, { key: region.key, name: region.name, countryCode: region.country_code }]);
    }
  };

  const remove = (key) => {
    onChange(selected.filter((r) => r.key !== key));
  };

  const hasCountries = countries && countries.length > 0;

  return (
    <div ref={ref} className="relative">
      {/* Selected tags + input */}
      <div
        className="w-full border border-border rounded-lg px-2 py-1.5 text-sm focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent bg-white flex flex-wrap gap-1 cursor-text min-h-[38px]"
        onClick={() => setOpen(true)}
      >
        {selected.map((region) => (
          <span key={region.key} className="inline-flex items-center gap-1 bg-danger/10 text-danger text-xs font-medium px-2 py-0.5 rounded-md">
            {region.name} ({region.countryCode})
            <button type="button" onClick={(e) => { e.stopPropagation(); remove(region.key); }}
              className="hover:text-danger/70">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="flex-1 min-w-[80px] outline-none text-sm bg-transparent py-0.5"
          placeholder={selected.length === 0 ? 'Cerca regioni...' : ''}
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-border rounded-lg shadow-lg max-h-[240px] overflow-y-auto">
          {!accessToken ? (
            <div className="px-3 py-2 text-xs text-text-secondary">Configura l'access token per cercare regioni</div>
          ) : !hasCountries ? (
            <div className="px-3 py-2 text-xs text-text-secondary">Aggiungi almeno un paese incluso per cercare regioni</div>
          ) : search.length < 2 ? (
            <div className="px-3 py-2 text-xs text-text-secondary">Digita almeno 2 caratteri per cercare...</div>
          ) : loading ? (
            <div className="px-3 py-3 flex items-center justify-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-text-secondary">Ricerca...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 text-xs text-text-secondary">Nessuna regione trovata per {countries.join(', ')}</div>
          ) : (
            results.map((r) => {
              const isSelected = selected.some((s) => s.key === r.key);
              return (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => toggle(r)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-bg transition-colors ${isSelected ? 'bg-danger/5' : ''}`}
                >
                  <input type="checkbox" checked={isSelected} readOnly
                    className="w-3.5 h-3.5 rounded border-border text-danger focus:ring-0 pointer-events-none" />
                  <span>{r.name}</span>
                  <span className="text-xs text-text-secondary ml-auto">{r.country_name || r.country_code}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

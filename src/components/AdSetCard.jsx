import { useState, useRef, useEffect } from 'react';
import Select from './Select';
import CountryPicker from './CountryPicker';
import RegionPicker from './RegionPicker';
import DateTimePicker from './DateTimePicker';
import { OPTIMIZATION_GOALS, CONVERSION_EVENTS, ATTRIBUTION_SETTINGS, DSA_COUNTRIES, ACCEPTED_FILE_TYPES } from '../utils/constants';

export default function AdSetCard({
  adSet, index, total, pixels, accessToken,
  countryPresets, hiddenFields = {},
  onUpdate, onDuplicate, onRemove, isCBO, bidStrategy,
  creativeCount, onUploadForAdSet, onFolderForAdSet,
  isSelected, onToggleSelect, onFilter, isFiltered,
}) {
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const uploadMenuRef = useRef(null);
  const [collapsed, setCollapsed] = useState(adSet._collapsed ?? false);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const inputCls = "w-full border border-border rounded-md px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-accent/[0.15] focus:border-accent bg-white";

  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '');
      folderInputRef.current.setAttribute('directory', '');
    }
  }, []);

  useEffect(() => {
    if (!showUploadMenu) return;
    const handler = (e) => { if (uploadMenuRef.current && !uploadMenuRef.current.contains(e.target)) setShowUploadMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showUploadMenu]);

  const handleFolderInput = (e) => {
    const fileList = Array.from(e.target.files || []);
    e.target.value = '';
    if (fileList.length === 0) return;
    const valid = fileList.filter((f) => !f.name.startsWith('.') && f.size > 0 && ACCEPTED_FILE_TYPES.includes(f.type));
    if (valid.length === 0) return;
    const firstPath = valid[0].webkitRelativePath || '';
    const folderName = firstPath.includes('/') ? firstPath.split('/')[0] : '';
    if (onFolderForAdSet) onFolderForAdSet(adSet._id, valid, folderName);
    setShowUploadMenu(false);
  };

  const set = (field, value) => onUpdate(adSet._id, field, value);

  const needsBidAmount = bidStrategy === 'BID_CAP' || bidStrategy === 'COST_CAP';
  const needsRoas = bidStrategy === 'LOWEST_COST_WITH_MIN_ROAS';
  const needsDsa = (adSet.countries || []).some((c) => DSA_COUNTRIES.has(c));

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    onUpdate(adSet._id, '_collapsed', next);
  };

  // ── Derived tags ──
  const audienceType = adSet.gender === 'all' ? 'Broad' : adSet.gender === 'male' ? 'Male' : 'Female';
  const countryCodes = (adSet.countries || []).join(', ');
  const ageRange = `${adSet.ageMin || '18'}-${adSet.ageMax || '65'}`;

  // ── Existing adset (read-only) ──
  if (adSet._type === 'existing') {
    return (
      <div className={`rounded-xl border bg-accent/[0.03] ${isSelected ? 'border-accent ring-2 ring-accent/20' : 'border-accent/10'}`}>
        <div className="flex items-center gap-2 px-3.5 py-2.5">
          {onToggleSelect && (
            <input type="checkbox" checked={isSelected} onChange={() => onToggleSelect(adSet._id)}
              className="w-3.5 h-3.5 rounded border-border text-accent focus:ring-accent/30 cursor-pointer flex-shrink-0" />
          )}
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: adSet._color }} />
          <svg className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <span className="text-sm font-medium flex-1 truncate">{adSet.name}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-semibold">existing</span>
          {total > 1 && (
            <button onClick={() => onRemove(adSet._id)} title="Remove"
              className="w-6 h-6 rounded-lg text-text-tertiary hover:bg-danger/10 hover:text-danger transition-colors flex items-center justify-center">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border ${isSelected ? 'border-accent ring-2 ring-accent/20' : 'border-accent/10'} bg-accent/[0.03]`}>
      {/* ── Compact Header ── */}
      <div className="flex items-center gap-2 px-3.5 py-2.5 cursor-pointer select-none" onClick={toggleCollapse}>
        {onToggleSelect && (
          <input type="checkbox" checked={isSelected} onChange={(e) => { e.stopPropagation(); onToggleSelect(adSet._id); }}
            onClick={(e) => e.stopPropagation()}
            className="w-3.5 h-3.5 rounded border-border text-accent focus:ring-accent/30 cursor-pointer flex-shrink-0" />
        )}

        {/* Chevron */}
        <svg className={`w-3.5 h-3.5 text-text-tertiary transition-transform duration-200 flex-shrink-0 ${collapsed ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>

        {/* Color dot */}
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: adSet._color }} />

        {/* Folder icon + Name */}
        <svg className="w-3.5 h-3.5 text-text-tertiary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        <input
          type="text"
          value={adSet.name}
          onChange={(e) => set('name', e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
          placeholder={`Ad Set ${index + 1}`}
          className="text-sm font-medium truncate min-w-0 bg-transparent border-0 border-b border-transparent hover:border-border/50 focus:border-accent outline-none px-0 py-0 focus:ring-0 flex-shrink"
          style={{ width: Math.max(80, Math.min(180, (adSet.name || `Ad Set ${index + 1}`).length * 7.5)) }}
        />

        {/* ── Tags/Pills ── */}
        <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
          {/* Audience type */}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-success/10 text-success whitespace-nowrap">
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            {audienceType}
          </span>

          {/* Countries */}
          {countryCodes && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-info/10 text-info whitespace-nowrap max-w-[120px] truncate">
              <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              {countryCodes}
            </span>
          )}

          {/* Budget (ABO only) */}
          {!isCBO && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-bg text-text-secondary whitespace-nowrap">
              ${adSet.dailyBudget || '0'}/day
            </span>
          )}

          {/* Age */}
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-bg text-text-secondary whitespace-nowrap">
            {ageRange}
          </span>
        </div>

        {/* Creative count */}
        {creativeCount != null && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-bold flex-shrink-0">
            {creativeCount} creative{creativeCount !== 1 ? 's' : ''}
          </span>
        )}

        {/* ── Actions ── */}
        <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {onFilter && (
            <button type="button" onClick={() => onFilter(adSet._id)} title="Filter creatives"
              className={`w-6 h-6 rounded-lg transition-colors flex items-center justify-center ${isFiltered ? 'bg-accent text-white' : 'text-text-tertiary hover:bg-accent/10 hover:text-accent'}`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
          )}
          {onUploadForAdSet && (
            <div className="relative" ref={uploadMenuRef}>
              <input ref={fileInputRef} type="file" multiple accept=".jpg,.jpeg,.png,.gif,.mp4,.mov" className="hidden"
                onChange={(e) => { if (e.target.files.length > 0) onUploadForAdSet(adSet._id, e.target.files); e.target.value = ''; setShowUploadMenu(false); }} />
              <input ref={folderInputRef} type="file" multiple accept=".jpg,.jpeg,.png,.gif,.mp4,.mov" className="hidden" onChange={handleFolderInput} />
              <button type="button" onClick={() => setShowUploadMenu(!showUploadMenu)} title="Upload for this ad set"
                className="w-6 h-6 rounded-lg text-text-tertiary hover:bg-accent/10 hover:text-accent transition-colors flex items-center justify-center">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </button>
              {showUploadMenu && (
                <div className="absolute right-0 top-8 z-20 bg-white border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
                  <button type="button" onClick={() => { fileInputRef.current?.click(); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-bg transition-colors text-left">
                    <svg className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Files
                  </button>
                  <button type="button" onClick={() => { folderInputRef.current?.click(); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-bg transition-colors text-left">
                    <svg className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    Folder
                  </button>
                </div>
              )}
            </div>
          )}
          <button type="button" onClick={() => onDuplicate(adSet._id)} title="Duplicate"
            className="w-6 h-6 rounded-lg text-text-tertiary hover:bg-accent/10 hover:text-accent transition-colors flex items-center justify-center">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          {total > 1 && (
            <button type="button" onClick={() => onRemove(adSet._id)} title="Remove"
              className="w-6 h-6 rounded-lg text-text-tertiary hover:bg-danger/10 hover:text-danger transition-colors flex items-center justify-center">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ── Body (accordion) ── */}
      <div className={`accordion-body ${collapsed ? '' : 'open'}`}>
        <div>
          <div className="px-4 pb-4 pt-3 space-y-4 border-t border-accent/10">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Ad Set Name</label>
              <input type="text" value={adSet.name} onChange={(e) => set('name', e.target.value)} className={inputCls} placeholder="es. Italy 18-65 All" />
            </div>

            {!isCBO && !hiddenFields.dailyBudget && (
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Daily Budget ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-secondary">$</span>
                  <input type="number" step="0.01" min="1" value={adSet.dailyBudget} onChange={(e) => set('dailyBudget', e.target.value)} className={`${inputCls} pl-7`} />
                </div>
              </div>
            )}

            {!hiddenFields.optimizationGoal && (
              <Select label="Optimization Goal" value={adSet.optimizationGoal} onChange={(v) => set('optimizationGoal', v)} options={OPTIMIZATION_GOALS} />
            )}

            {!hiddenFields.selectedPixel && (
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Dataset (Pixel)</label>
                <select value={adSet.selectedPixel} onChange={(e) => set('selectedPixel', e.target.value)} className={inputCls}>
                  <option value="">No pixel</option>
                  {pixels.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
                </select>
              </div>
            )}

            {adSet.selectedPixel && !hiddenFields.conversionEvent && (
              <Select label="Conversion Event" value={adSet.conversionEvent} onChange={(v) => set('conversionEvent', v)} options={CONVERSION_EVENTS} />
            )}

            {!hiddenFields.attributionSetting && (
              <Select label="Attribution Model" value={adSet.attributionSetting} onChange={(v) => set('attributionSetting', v)} options={ATTRIBUTION_SETTINGS} />
            )}

            {needsBidAmount && !hiddenFields.bidAmount && (
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  {bidStrategy === 'COST_CAP' ? 'Cost Cap ($)' : 'Bid Cap ($)'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-secondary">$</span>
                  <input type="number" step="0.01" min="0.01" value={adSet.bidAmount ?? ''} onChange={(e) => set('bidAmount', e.target.value)} className={`${inputCls} pl-7`} placeholder="5.00" />
                </div>
              </div>
            )}
            {needsRoas && !hiddenFields.bidAmount && (
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Minimum ROAS</label>
                <input type="number" step="0.01" min="0.01" value={adSet.bidAmount ?? ''} onChange={(e) => set('bidAmount', e.target.value)} className={inputCls} placeholder="2.00" />
              </div>
            )}

            {!hiddenFields.startDate && (
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Start Date</label>
                <DateTimePicker value={adSet.startDate} onChange={(v) => set('startDate', v)} placeholder="Start immediately" />
                <p className="text-xs text-text-secondary mt-1">Leave empty to start immediately</p>
              </div>
            )}

            {!hiddenFields.countries && (
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Countries & Regions</label>

                {countryPresets.length > 0 && (
                  <div className="flex items-center flex-wrap gap-1.5 mb-2">
                    {countryPresets.map((p) => (
                      <div key={p.name} className="group relative">
                        <button type="button" onClick={() => {
                          set('countries', p.countries || []);
                          set('excludedCountries', p.excludedCountries || []);
                          set('excludedRegions', p.excludedRegions || []);
                          if ((p.excludedCountries?.length > 0) || (p.excludedRegions?.length > 0)) set('showExclusions', true);
                        }}
                          className="px-3 py-1.5 text-xs font-medium bg-accent/10 text-accent rounded-lg hover:bg-accent hover:text-white hover:shadow-md hover:scale-[1.04] transition-all duration-150 cursor-pointer">
                          {p.name}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <CountryPicker selected={adSet.countries} onChange={(v) => set('countries', v)} />

                <button type="button" onClick={() => {
                  const next = !adSet.showExclusions;
                  set('showExclusions', next);
                  if (!next) { set('excludedCountries', []); set('excludedRegions', []); }
                }}
                  className={`mt-2 flex items-center gap-1.5 text-xs font-medium transition-colors ${adSet.showExclusions ? 'text-danger' : 'text-text-secondary hover:text-danger'}`}>
                  <svg className={`w-3.5 h-3.5 transition-transform duration-150 ${adSet.showExclusions ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  {adSet.showExclusions ? 'Exclusions active' : 'Add exclusions'}
                </button>

                {adSet.showExclusions && (
                  <div className="mt-2 space-y-2 pl-3 border-l-2 border-danger/20">
                    <div>
                      <span className="text-xs text-danger font-medium mb-1 block">Exclude countries</span>
                      <CountryPicker selected={adSet.excludedCountries} onChange={(v) => set('excludedCountries', v)} />
                    </div>
                    <div>
                      <span className="text-xs text-danger font-medium mb-1 block">Exclude regions</span>
                      <RegionPicker selected={adSet.excludedRegions} onChange={(v) => set('excludedRegions', v)} accessToken={accessToken} countries={adSet.countries} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {needsDsa && !hiddenFields.dsa && (
              <div className="bg-accent/5 rounded-lg p-3 space-y-2.5">
                <div className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs font-medium text-accent">EU Digital Services Act (DSA)</span>
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Beneficiary</label>
                  <input type="text" value={adSet.dsaBeneficiary ?? ''} onChange={(e) => set('dsaBeneficiary', e.target.value)} className={inputCls} placeholder="Name of the person or organization..." />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1">Payor</label>
                  <input type="text" value={adSet.dsaPayor ?? ''} onChange={(e) => set('dsaPayor', e.target.value)} className={inputCls} placeholder="Who is paying for these ads..." />
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              {!hiddenFields.ageMin && (
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Age Min</label>
                  <input type="number" min="13" max="65" value={adSet.ageMin} onChange={(e) => set('ageMin', e.target.value)} className={inputCls} />
                </div>
              )}
              {!hiddenFields.ageMax && (
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Age Max</label>
                  <input type="number" min="13" max="65" value={adSet.ageMax} onChange={(e) => set('ageMax', e.target.value)} className={inputCls} />
                </div>
              )}
              {!hiddenFields.gender && (
                <Select label="Gender" value={adSet.gender} onChange={(v) => set('gender', v)} options={[{ value: 'all', label: 'All' }, { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} />
              )}
            </div>

            {!isCBO && !hiddenFields.spendLimits && (
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-2">Ad Set Spend Limits</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">Daily Min Spend ($)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-secondary">$</span>
                      <input type="number" step="0.01" min="0" value={adSet.dailyMinSpend ?? ''} onChange={(e) => set('dailyMinSpend', e.target.value)} className={`${inputCls} pl-7`} placeholder="0.00" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">Daily Spend Cap ($)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-secondary">$</span>
                      <input type="number" step="0.01" min="0" value={adSet.dailySpendCap ?? ''} onChange={(e) => set('dailySpendCap', e.target.value)} className={`${inputCls} pl-7`} placeholder="0.00" />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-text-secondary mt-1">Leave empty for no limits</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

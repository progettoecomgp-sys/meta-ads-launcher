import { useState, useRef, useEffect } from 'react';
import Select from './Select';
import CountryPicker from './CountryPicker';
import RegionPicker from './RegionPicker';
import DateTimePicker from './DateTimePicker';
import { OPTIMIZATION_GOALS, CONVERSION_EVENTS, ATTRIBUTION_SETTINGS, DSA_COUNTRIES } from '../utils/constants';

export default function AdSetCard({
  adSet, index, total, pixels, accessToken,
  countryPresets,
  onUpdate, onDuplicate, onRemove, isCBO, bidStrategy,
}) {
  const [collapsed, setCollapsed] = useState(adSet._collapsed ?? false);
  const inputCls = "w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent bg-white";

  const set = (field, value) => onUpdate(adSet._id, field, value);

  const needsBidAmount = bidStrategy === 'BID_CAP' || bidStrategy === 'COST_CAP';
  const needsRoas = bidStrategy === 'LOWEST_COST_WITH_MIN_ROAS';
  const needsDsa = (adSet.countries || []).some((c) => DSA_COUNTRIES.has(c));

  // Summary text when collapsed
  const summary = [
    adSet.countries?.length ? adSet.countries.join(', ') : '',
    !isCBO ? `$${adSet.dailyBudget || '0'}/day` : '',
    `${adSet.ageMin || '18'}-${adSet.ageMax || '65'}`,
    adSet.gender !== 'all' ? adSet.gender : '',
  ].filter(Boolean).join(' · ');

  // Existing adset (read-only)
  if (adSet._type === 'existing') {
    return (
      <div className="rounded-xl border border-border overflow-hidden" style={{ borderLeftWidth: '3px', borderLeftColor: adSet._color }}>
        <div className="flex items-center gap-2.5 px-4 py-3 bg-white">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: adSet._color }} />
          <span className="text-xs font-semibold text-text-secondary">Ad Set {index + 1}</span>
          <span className="text-sm font-medium flex-1 truncate">{adSet.name}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">existing</span>
          {total > 1 && (
            <button onClick={() => onRemove(adSet._id)} title="Remove"
              className="w-6 h-6 rounded-full bg-bg border border-border text-text-secondary hover:bg-danger hover:text-white hover:border-danger transition-colors flex items-center justify-center">
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
    <div className="rounded-xl border border-border overflow-hidden bg-white" style={{ borderLeftWidth: '3px', borderLeftColor: adSet._color }}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-2.5 px-4 py-3 hover:bg-bg/30 transition-colors text-left"
      >
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: adSet._color }} />
        <span className="text-xs font-semibold text-text-secondary whitespace-nowrap">Ad Set {index + 1}</span>
        <span className="text-sm font-medium truncate flex-1">{adSet.name || '(unnamed)'}</span>
        {collapsed && <span className="text-xs text-text-secondary truncate max-w-[200px]">{summary}</span>}

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={() => onDuplicate(adSet._id)} title="Duplicate"
            className="w-6 h-6 rounded bg-bg border border-border text-text-secondary hover:bg-accent hover:text-white hover:border-accent transition-colors flex items-center justify-center">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          {total > 1 && (
            <button type="button" onClick={() => onRemove(adSet._id)} title="Remove"
              className="w-6 h-6 rounded bg-bg border border-border text-text-secondary hover:bg-danger hover:text-white hover:border-danger transition-colors flex items-center justify-center">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Chevron */}
        <svg className={`w-4 h-4 text-text-secondary transition-transform flex-shrink-0 ${collapsed ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Body */}
      {!collapsed && (
        <div className="px-4 pb-4 pt-1 space-y-4 border-t border-border">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Ad Set Name</label>
            <input type="text" value={adSet.name} onChange={(e) => set('name', e.target.value)} className={inputCls} placeholder="es. Italy 18-65 All" />
          </div>

          {!isCBO && (
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Daily Budget ($)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-secondary">$</span>
                <input type="number" step="0.01" min="1" value={adSet.dailyBudget} onChange={(e) => set('dailyBudget', e.target.value)} className={`${inputCls} pl-7`} />
              </div>
            </div>
          )}

          <Select label="Optimization Goal" value={adSet.optimizationGoal} onChange={(v) => set('optimizationGoal', v)} options={OPTIMIZATION_GOALS} />

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Dataset (Pixel)</label>
            <select value={adSet.selectedPixel} onChange={(e) => set('selectedPixel', e.target.value)} className={inputCls}>
              <option value="">No pixel</option>
              {pixels.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
            </select>
          </div>

          {adSet.selectedPixel && (
            <Select label="Conversion Event" value={adSet.conversionEvent} onChange={(v) => set('conversionEvent', v)} options={CONVERSION_EVENTS} />
          )}

          <Select label="Attribution Model" value={adSet.attributionSetting} onChange={(v) => set('attributionSetting', v)} options={ATTRIBUTION_SETTINGS} />

          {needsBidAmount && (
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
          {needsRoas && (
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Minimum ROAS</label>
              <input type="number" step="0.01" min="0.01" value={adSet.bidAmount ?? ''} onChange={(e) => set('bidAmount', e.target.value)} className={inputCls} placeholder="2.00" />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Start Date</label>
            <DateTimePicker value={adSet.startDate} onChange={(v) => set('startDate', v)} placeholder="Start immediately" />
            <p className="text-xs text-text-secondary mt-1">Leave empty to start immediately</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">Countries & Regions</label>

            {/* Preset bar */}
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

          {/* DSA */}
          {needsDsa && (
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
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Age Min</label>
              <input type="number" min="13" max="65" value={adSet.ageMin} onChange={(e) => set('ageMin', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Age Max</label>
              <input type="number" min="13" max="65" value={adSet.ageMax} onChange={(e) => set('ageMax', e.target.value)} className={inputCls} />
            </div>
            <Select label="Gender" value={adSet.gender} onChange={(v) => set('gender', v)} options={[{ value: 'all', label: 'All' }, { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} />
          </div>

          {!isCBO && (
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
      )}
    </div>
  );
}

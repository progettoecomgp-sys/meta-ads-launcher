import { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ENHANCEMENT_CONFIGS, CAMPAIGN_OBJECTIVES, BID_STRATEGIES, OPTIMIZATION_GOALS, CONVERSION_EVENTS, ATTRIBUTION_SETTINGS, CTA_OPTIONS } from '../utils/constants';
import Select from '../components/Select';
import CountryPicker from '../components/CountryPicker';

// ── Field definitions for visibility toggles ──
const FIELD_GROUPS = [
  {
    group: 'Campaign',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>,
    fields: [
      { key: 'objective', label: 'Objective', example: 'Traffic', type: 'select' },
      { key: 'budgetType', label: 'Budget Type', example: 'ABO / CBO', type: 'toggle' },
      { key: 'bidStrategy', label: 'Bid Strategy', example: 'Lowest cost', type: 'select' },
      { key: 'budgetSharing', label: 'Budget Sharing', example: 'Share budget across ad sets', type: 'check' },
    ],
  },
  {
    group: 'Ad Set',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>,
    fields: [
      { key: 'dailyBudget', label: 'Daily Budget', example: '$ 20.00', type: 'money' },
      { key: 'optimizationGoal', label: 'Optimization Goal', example: 'Link Clicks', type: 'select' },
      { key: 'selectedPixel', label: 'Pixel', example: 'My Pixel (8291034...)', type: 'select' },
      { key: 'conversionEvent', label: 'Conversion Event', example: 'Purchase', type: 'select' },
      { key: 'attributionSetting', label: 'Attribution Model', example: '7-day click, 1-day view', type: 'select' },
      { key: 'bidAmount', label: 'Bid / Cost Cap', example: '$ 5.00', type: 'money' },
      { key: 'startDate', label: 'Start Date', example: '2026-03-20', type: 'date' },
      { key: 'countries', label: 'Countries', example: 'IT, US, UK', type: 'tags' },
      { key: 'ageMin', label: 'Age Min', example: '18', type: 'number' },
      { key: 'ageMax', label: 'Age Max', example: '65', type: 'number' },
      { key: 'gender', label: 'Gender', example: 'All', type: 'select' },
      { key: 'dsa', label: 'DSA (Digital Services Act)', example: 'Beneficiary & payer info', type: 'check' },
      { key: 'spendLimits', label: 'Spend Limits', example: 'Min / Max daily spend', type: 'range' },
    ],
  },
  {
    group: 'Ad Copy',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
    fields: [
      { key: 'primaryText', label: 'Primary Text', example: 'Check out our latest offer...', type: 'textarea' },
      { key: 'headline', label: 'Headline', example: 'Shop Now & Save 20%' },
      { key: 'description', label: 'Description', example: 'Free shipping on all orders' },
      { key: 'cta', label: 'Call to Action', example: 'Learn More', type: 'select' },
    ],
  },
  {
    group: 'Other',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>,
    fields: [
      { key: 'websiteUrl', label: 'Website URL', example: 'https://example.com/shop' },
      { key: 'creativeType', label: 'Creative Type', example: 'Image / Video / Carousel', type: 'toggle' },
    ],
  },
];

const TABS = [
  { key: 'url', label: 'URL Parameters', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg> },
  { key: 'creative', label: 'Advantage+', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg> },
  { key: 'visibility', label: 'Field Visibility', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg> },
  { key: 'defaults', label: 'Default Values', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg> },
];

function MockField({ type, example }) {
  if (type === 'textarea') {
    return (
      <div className="h-9 bg-bg rounded-md border border-border px-2.5 py-1 text-[11px] text-text-tertiary leading-relaxed overflow-hidden">{example}</div>
    );
  }
  if (type === 'tags') {
    return (
      <div className="h-7 bg-bg rounded-md border border-border flex items-center gap-1 px-2">
        {(example || '').split(', ').map((t) => (
          <span key={t} className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded font-medium">{t}</span>
        ))}
      </div>
    );
  }
  if (type === 'toggle') {
    const parts = (example || '').split(' / ');
    return (
      <div className="flex gap-1">
        {parts.map((p, i) => (
          <div key={p} className={`h-7 flex-1 rounded-md flex items-center justify-center text-[11px] font-medium border ${i === 0 ? 'bg-accent/10 border-accent/30 text-accent' : 'bg-bg border-border text-text-tertiary'}`}>{p}</div>
        ))}
      </div>
    );
  }
  if (type === 'check') {
    return (
      <div className="flex items-center gap-2 h-7">
        <div className="w-3.5 h-3.5 rounded border border-border bg-bg flex-shrink-0" />
        <span className="text-[11px] text-text-tertiary">{example}</span>
      </div>
    );
  }
  // Default: input-like box with example text
  return (
    <div className="h-7 bg-bg rounded-md border border-border flex items-center px-2.5 text-[11px] text-text-tertiary">{example}</div>
  );
}

function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex items-center flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-accent' : 'bg-gray-300'}`}
    >
      <span
        className="inline-block w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200"
        style={{ transform: checked ? 'translateX(22px)' : 'translateX(2px)' }}
      />
    </button>
  );
}

export default function Settings() {
  const { settings, setSettings, addToast } = useApp();
  const [activeTab, setActiveTab] = useState('url');
  const contentRef = useRef(null);

  const hiddenFields = settings.hiddenFields || {};
  const uploadDefaults = settings.uploadDefaults || {};

  const updateHiddenField = (key, hidden) => {
    const next = { ...hiddenFields, [key]: hidden };
    if (!hidden) delete next[key];
    setSettings({ hiddenFields: next });
  };

  const resetVisibility = () => {
    setSettings({ hiddenFields: {} });
    addToast('All fields are now visible');
  };

  const updateDefault = (key, value) => {
    setSettings({ uploadDefaults: { ...uploadDefaults, [key]: value } });
  };

  const resetDefaults = () => {
    setSettings({
      uploadDefaults: {
        objective: 'OUTCOME_TRAFFIC',
        budgetType: 'ABO',
        bidStrategy: 'LOWEST_COST_WITHOUT_CAP',
        adStatus: 'PAUSED',
        dailyBudget: '20',
        optimizationGoal: 'LINK_CLICKS',
        countries: ['IT'],
        ageMin: '18',
        ageMax: '65',
        gender: 'all',
        cta: 'LEARN_MORE',
        websiteUrl: '',
        attributionSetting: '7d_click_1d_view',
        conversionEvent: 'PURCHASE',
      },
    });
    addToast('Defaults reset');
  };

  const hiddenCount = Object.values(hiddenFields).filter(Boolean).length;
  const inputCls = "w-full border border-border rounded-md px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-accent/[0.15] focus:border-accent";

  return (
    <div className="px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-text-secondary text-sm mt-1">Campaign preferences and upload defaults</p>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex gap-1 bg-bg/80 rounded-xl p-1 mb-6 sticky top-0 z-10 backdrop-blur-sm">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => { setActiveTab(tab.key); contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-medium transition-all flex-1 justify-center ${
              activeTab === tab.key
                ? 'bg-white shadow-sm text-accent'
                : 'text-text-secondary hover:text-text hover:bg-white/50'
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.key === 'visibility' && hiddenCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-accent/10 text-accent text-[10px] font-bold flex items-center justify-center">{hiddenCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div ref={contentRef}>

        {/* ── URL Parameters ── */}
        {activeTab === 'url' && (
          <div className="glass-card rounded-xl p-6 space-y-4 max-w-2xl">
            <div>
              <h2 className="text-sm font-semibold">URL Parameters</h2>
              <p className="text-xs text-text-secondary mt-0.5">
                Automatically added to every ad link. Same format as Facebook Ads Manager.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">URL Parameters</label>
              <p className="text-xs text-text-secondary mb-2">Add your UTM parameters here</p>
              <textarea
                rows={3}
                value={settings.utmTemplate || ''}
                onChange={(e) => setSettings({ utmTemplate: e.target.value })}
                className={`${inputCls} font-mono resize-none`}
                placeholder="key1=value1&key2=value2"
              />
              <p className="text-xs text-text-secondary mt-1.5">
                Available macros: <code className="bg-bg px-1 rounded">{'{{campaign.name}}'}</code> <code className="bg-bg px-1 rounded">{'{{adset.name}}'}</code> <code className="bg-bg px-1 rounded">{'{{ad.name}}'}</code> <code className="bg-bg px-1 rounded">{'{{campaign.id}}'}</code> <code className="bg-bg px-1 rounded">{'{{adset.id}}'}</code> <code className="bg-bg px-1 rounded">{'{{ad.id}}'}</code>
              </p>
            </div>
            {settings.utmTemplate && (
              <div className="bg-bg rounded-lg p-3">
                <p className="text-xs font-medium text-text-secondary mb-1">Preview:</p>
                <p className="text-xs text-text break-all font-mono">
                  https://example.com?{settings.utmTemplate}
                </p>
              </div>
            )}

            {/* DSA — EU Digital Services Act */}
            <div className="border-t border-border pt-4 mt-2">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                </svg>
                <div>
                  <h3 className="text-sm font-semibold">EU Digital Services Act (DSA)</h3>
                  <p className="text-xs text-text-secondary">Auto-filled on every ad set targeting EU countries</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Beneficiary</label>
                  <input
                    type="text"
                    value={settings.dsaBeneficiary || ''}
                    onChange={(e) => setSettings({ dsaBeneficiary: e.target.value })}
                    className={inputCls}
                    placeholder="Company or person name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Payor</label>
                  <input
                    type="text"
                    value={settings.dsaPayor || ''}
                    onChange={(e) => setSettings({ dsaPayor: e.target.value })}
                    className={inputCls}
                    placeholder="Who pays for the ads"
                  />
                </div>
              </div>
              <p className="text-xs text-text-tertiary mt-2">Required by EU law for ads targeting EEA countries. Set once, applied to every launch.</p>
            </div>
          </div>
        )}

        {/* ── Creative Settings / Advantage+ ── */}
        {activeTab === 'creative' && (
          <div className="glass-card rounded-xl p-6 max-w-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-[16px] font-semibold">Creative Settings</h2>
                <p className="text-xs text-text-secondary">Configure Advantage+ enhancements per creative type</p>
              </div>
              <button
                type="button"
                onClick={() => setSettings({ enhancements: { image: {}, video: {}, carousel: {} } })}
                className="text-xs text-danger hover:text-danger/80 font-medium"
              >
                Disable all
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { key: 'image', label: 'Images', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
                { key: 'video', label: 'Videos', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> },
                { key: 'carousel', label: 'Carousel', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg> },
              ].map((type) => {
                const enhancements = settings.enhancements || {};
                const typeSettings = enhancements[type.key] || {};
                const config = ENHANCEMENT_CONFIGS[type.key] || [];
                const enabledCount = config.filter((item) => typeSettings[item.key]).length;

                return (
                  <div key={type.key} className="border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-accent">{type.icon}</span>
                      <h3 className="text-sm font-bold">{type.label}</h3>
                      <span className="ml-auto text-[10px] text-text-secondary">{enabledCount}/{config.length}</span>
                    </div>
                    <div className="space-y-0">
                      {config.map((item) => {
                        const isOn = typeSettings[item.key] || false;
                        return (
                          <label key={item.key} className="flex items-center justify-between py-2 cursor-pointer select-none">
                            <span className={`text-sm ${isOn ? 'text-text font-medium' : 'text-text-secondary'}`}>{item.label}</span>
                            <ToggleSwitch
                              checked={isOn}
                              onChange={(val) => {
                                const updated = { ...enhancements, [type.key]: { ...typeSettings, [item.key]: val } };
                                setSettings({ enhancements: updated });
                              }}
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Field Visibility ── */}
        {activeTab === 'visibility' && (() => {
          const leftGroups = FIELD_GROUPS.filter(g => g.group === 'Campaign' || g.group === 'Ad Set');
          const rightGroups = FIELD_GROUPS.filter(g => g.group === 'Ad Copy' || g.group === 'Other');

          const renderGroup = (group) => (
            <div key={group.group} className="glass-card rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-bg/50">
                <span className="text-accent">{group.icon}</span>
                <p className="text-[13px] font-semibold">{group.group}</p>
                <span className="text-[11px] text-text-tertiary ml-auto">
                  {group.fields.filter((f) => !hiddenFields[f.key]).length}/{group.fields.length} visible
                </span>
              </div>
              <div className="divide-y divide-border">
                {group.fields.map((field) => {
                  const isVisible = !hiddenFields[field.key];
                  return (
                    <div key={field.key} className="flex items-center gap-3 px-4 py-1.5">
                      <div className={`flex-1 min-w-0 transition-all duration-200 ${isVisible ? 'opacity-100' : 'opacity-30'}`}>
                        <p className={`text-[11px] font-medium mb-0.5 transition-all ${isVisible ? 'text-text' : 'text-text-tertiary line-through'}`}>{field.label}</p>
                        <MockField type={field.type} example={field.example} />
                      </div>
                      <div className="flex-shrink-0">
                        <ToggleSwitch checked={isVisible} onChange={(val) => updateHiddenField(field.key, !val)} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );

          return (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-[16px] font-semibold">Field Visibility</h2>
                  <p className="text-xs text-text-secondary">Toggle off the fields you don't use — they'll be hidden on the Upload page</p>
                </div>
                <div className="flex items-center gap-3">
                  {hiddenCount > 0 && (
                    <span className="text-xs text-text-secondary bg-bg px-2.5 py-1 rounded-full">{hiddenCount} hidden</span>
                  )}
                  <button type="button" onClick={resetVisibility}
                    className="text-xs text-accent hover:text-accent-hover font-medium">
                    Show all
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 items-start">
                <div className="space-y-4">
                  {leftGroups.map(renderGroup)}
                </div>
                <div className="space-y-4">
                  {rightGroups.map(renderGroup)}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Default Values ── */}
        {activeTab === 'defaults' && (
          <div className="glass-card rounded-xl p-6 max-w-4xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-[16px] font-semibold">Default Values</h2>
                <p className="text-xs text-text-secondary">Pre-fill values when creating a new campaign</p>
              </div>
              <button type="button" onClick={resetDefaults}
                className="text-xs text-accent hover:text-accent-hover font-medium">
                Reset defaults
              </button>
            </div>

            <div className="space-y-4">
              {/* Campaign defaults */}
              <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">Campaign</p>
              <div className="grid grid-cols-2 gap-4">
                <Select label="Objective" value={uploadDefaults.objective || 'OUTCOME_TRAFFIC'}
                  onChange={(v) => updateDefault('objective', v)} options={CAMPAIGN_OBJECTIVES} />

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Budget Type</label>
                  <div className="flex gap-2">
                    {['ABO', 'CBO'].map((t) => (
                      <button key={t} type="button"
                        onClick={() => updateDefault('budgetType', t)}
                        className={`flex-1 py-2 text-sm font-medium rounded-md border transition-colors ${
                          (uploadDefaults.budgetType || 'ABO') === t
                            ? 'border-accent bg-accent/10 text-accent'
                            : 'border-border text-text-secondary hover:bg-bg'
                        }`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <Select label="Bid Strategy" value={uploadDefaults.bidStrategy || 'LOWEST_COST_WITHOUT_CAP'}
                  onChange={(v) => updateDefault('bidStrategy', v)} options={BID_STRATEGIES} />

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Ad Status</label>
                  <div className="flex gap-2">
                    {[{ v: 'PAUSED', l: 'Paused' }, { v: 'ACTIVE', l: 'Active' }].map((t) => (
                      <button key={t.v} type="button"
                        onClick={() => updateDefault('adStatus', t.v)}
                        className={`flex-1 py-2 text-sm font-medium rounded-md border transition-colors ${
                          (uploadDefaults.adStatus || 'PAUSED') === t.v
                            ? 'border-accent bg-accent/10 text-accent'
                            : 'border-border text-text-secondary hover:bg-bg'
                        }`}>
                        {t.l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Ad Set defaults */}
              <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mt-4">Ad Set</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Daily Budget ($)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-secondary">$</span>
                    <input type="number" step="1" min="1" value={uploadDefaults.dailyBudget || '20'}
                      onChange={(e) => updateDefault('dailyBudget', e.target.value)}
                      className={`${inputCls} pl-7`} />
                  </div>
                </div>

                <Select label="Optimization Goal" value={uploadDefaults.optimizationGoal || 'LINK_CLICKS'}
                  onChange={(v) => updateDefault('optimizationGoal', v)} options={OPTIMIZATION_GOALS} />

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Countries</label>
                  <CountryPicker
                    selected={uploadDefaults.countries || ['IT']}
                    onChange={(v) => updateDefault('countries', v)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Age Range</label>
                  <div className="flex items-center gap-2">
                    <input type="number" min="13" max="65" value={uploadDefaults.ageMin || '18'}
                      onChange={(e) => updateDefault('ageMin', e.target.value)}
                      className={inputCls} />
                    <span className="text-text-secondary text-sm">to</span>
                    <input type="number" min="13" max="65" value={uploadDefaults.ageMax || '65'}
                      onChange={(e) => updateDefault('ageMax', e.target.value)}
                      className={inputCls} />
                  </div>
                </div>

                <Select label="Gender" value={uploadDefaults.gender || 'all'}
                  onChange={(v) => updateDefault('gender', v)}
                  options={[{ value: 'all', label: 'All' }, { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} />

                <Select label="Call to Action" value={uploadDefaults.cta || 'LEARN_MORE'}
                  onChange={(v) => updateDefault('cta', v)} options={CTA_OPTIONS} />

                <Select label="Attribution Model" value={uploadDefaults.attributionSetting || '7d_click_1d_view'}
                  onChange={(v) => updateDefault('attributionSetting', v)} options={ATTRIBUTION_SETTINGS} />

                <Select label="Conversion Event" value={uploadDefaults.conversionEvent || 'PURCHASE'}
                  onChange={(v) => updateDefault('conversionEvent', v)} options={CONVERSION_EVENTS} />
              </div>

              {/* Other defaults */}
              <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary mt-4">Other</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Website URL</label>
                  <input type="url" value={uploadDefaults.websiteUrl || ''}
                    onChange={(e) => updateDefault('websiteUrl', e.target.value)}
                    className={inputCls} placeholder="https://example.com" />
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

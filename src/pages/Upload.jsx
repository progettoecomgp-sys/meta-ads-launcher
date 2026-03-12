import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import DropZone from '../components/DropZone';
import CreativeCard from '../components/CreativeCard';
import AdPreview from '../components/AdPreview';
import Modal from '../components/Modal';
import Select from '../components/Select';
import { CAMPAIGN_OBJECTIVES, CTA_OPTIONS, ACCEPTED_IMAGE_TYPES, BID_STRATEGIES, DSA_COUNTRIES, buildDegreesOfFreedomSpec } from '../utils/constants';
import PagePicker from '../components/PagePicker';
import AdSetCard from '../components/AdSetCard';
import * as api from '../utils/metaApi';
import { getApiLog, onApiLogChange } from '../utils/metaApi';

const ADSET_COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#ef4444', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#e879f9', '#fb923c', '#38bdf8', '#a3e635',
  '#f43f5e', '#22d3ee', '#a78bfa', '#fbbf24', '#34d399',
];

let nextAdSetId = 1;

function makeDefaultAdSet(overrides = {}) {
  return {
    _id: `as_${nextAdSetId++}`,
    _type: 'new',
    _color: ADSET_COLORS[(nextAdSetId - 2) % ADSET_COLORS.length],
    _collapsed: false,
    name: '', dailyBudget: '20', optimizationGoal: 'LINK_CLICKS',
    countries: ['IT'], excludedCountries: [], excludedRegions: [],
    showExclusions: false, ageMin: '18', ageMax: '65', gender: 'all',
    startDate: '', selectedPixel: '', conversionEvent: 'PURCHASE',
    bidAmount: '', attributionSetting: '7d_click_1d_view',
    dailyMinSpend: '', dailySpendCap: '', dsaBeneficiary: '', dsaPayor: '',
    ...overrides,
  };
}

let nextId = 1;

const FORM_KEY = 'meta-ads-upload-form';

function loadForm() {
  try {
    const raw = sessionStorage.getItem(FORM_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

const STATUS_LABELS = { 1: 'Active', 2: 'Disabled', 3: 'Unsettled', 7: 'Pending Review', 8: 'Pending Closure', 9: 'In Grace Period', 100: 'Temporarily Unavailable', 101: 'Closed' };

function IgAccountPicker({ igAccounts, selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selectedIg = igAccounts.find((ig) => ig.id === selected);
  const hasRealAccounts = igAccounts.some((ig) => !ig.pageBacked);

  const getPicUrl = (ig) =>
    ig?.profile_picture_url || ig?.profile_pic || `https://graph.facebook.com/${ig.id}/picture?type=small`;

  const getDisplayName = (ig) => {
    if (ig.pageBacked) return ig.name || 'Pagina Facebook';
    return ig?.username ? `@${ig.username}` : (ig?.name || ig?.id);
  };

  const getSubLabel = (ig) => {
    if (ig.pageBacked) return 'Usa la pagina Facebook come identità IG';
    return ig.id;
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent bg-white flex items-center gap-2.5 min-h-[38px] text-left"
      >
        {selectedIg ? (
          <>
            <img src={getPicUrl(selectedIg)} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" onError={(e) => { e.target.style.display = 'none'; }} />
            <span className="flex-1 truncate">
              {getDisplayName(selectedIg)}
              {selectedIg.pageBacked && <span className="text-xs text-text-secondary ml-1">(pagina FB)</span>}
            </span>
            {!selectedIg.pageBacked && <span className="text-xs text-text-secondary">{selectedIg.id}</span>}
          </>
        ) : (
          <span className="text-text-secondary flex-1">No Instagram account</span>
        )}
        <svg className={`w-4 h-4 text-text-secondary transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-border rounded-lg shadow-lg max-h-[240px] overflow-y-auto">
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false); }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-bg transition-colors ${!selected ? 'bg-accent/5' : ''}`}
          >
            <span className="text-text-secondary">Nessun account Instagram</span>
          </button>
          {/* Separator between real and page-backed */}
          {igAccounts.map((ig, i) => {
            const isSelected = ig.id === selected;
            const prevIsReal = i > 0 && !igAccounts[i - 1].pageBacked;
            const showSeparator = ig.pageBacked && prevIsReal;
            return (
              <React.Fragment key={ig.id}>
                {showSeparator && (
                  <div className="px-3 py-1.5 text-[10px] font-medium text-text-secondary uppercase tracking-wide bg-bg/50 border-t border-border">
                    Nessun account IG collegato — usa la pagina
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => { onChange(ig.id); setOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-bg transition-colors ${isSelected ? 'bg-accent/5' : ''}`}
                >
                  <img src={getPicUrl(ig)} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" onError={(e) => { e.target.onerror = null; e.target.src = ''; e.target.style.display = 'none'; }} />
                  <div className="flex-1 min-w-0">
                    <p className={`truncate ${isSelected ? 'font-medium text-accent' : ''}`}>
                      {getDisplayName(ig)}
                      {ig.pageBacked && <span className="text-xs text-text-secondary ml-1">(pagina FB)</span>}
                    </p>
                    <p className="text-[10px] text-text-secondary">{getSubLabel(ig)}</p>
                  </div>
                  {isSelected && (
                    <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* Info badge when only page-backed account is available */}
      {!hasRealAccounts && igAccounts.length > 0 && selected && (
        <p className="text-[10px] text-warning mt-1 flex items-center gap-1">
          <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Nessun account IG reale collegato — le inserzioni useranno la pagina Facebook
        </p>
      )}
    </div>
  );
}

function AdAccountBar({ adAccounts, settings, setSettings, inputCls }) {
  const selectedAcc = adAccounts.find((a) => a.id === `act_${settings.adAccountId}`);
  const accStatus = selectedAcc?.account_status;
  const isActive = accStatus === 1;
  const statusLabel = STATUS_LABELS[accStatus] || '';

  return (
    <div className="mb-6 bg-white rounded-xl border border-border p-3 flex items-center gap-3 max-w-xl">
      <svg className="w-4 h-4 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
      <select
        value={settings.adAccountId ? `act_${settings.adAccountId}` : ''}
        onChange={(e) => setSettings({ adAccountId: e.target.value.replace('act_', '') })}
        className="flex-1 border border-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent bg-white"
      >
        <option value="">Seleziona un ad account...</option>
        {(() => {
          const sorted = [...adAccounts].sort((a, b) => (a.account_status === 1 ? 0 : 1) - (b.account_status === 1 ? 0 : 1));
          const firstInactiveIdx = sorted.findIndex((a) => a.account_status !== 1);
          return sorted.map((acc, i) => (
            <React.Fragment key={acc.id}>
              {i === firstInactiveIdx && firstInactiveIdx > 0 && <option disabled>{'─'.repeat(30)}</option>}
              <option value={acc.id}>{acc.name} ({acc.id}) — {STATUS_LABELS[acc.account_status] || 'Unknown'}</option>
            </React.Fragment>
          ));
        })()}
      </select>
      {selectedAcc && (
        <span className={`flex items-center gap-1.5 text-xs font-medium flex-shrink-0 px-2 py-1 rounded-full ${isActive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-success' : 'bg-danger'}`} />
          {statusLabel}
        </span>
      )}
    </div>
  );
}

export default function Upload() {
  const { settings, setSettings, isConfigured, addToast, addHistory, addCreatives } = useApp();
  const saved = useRef(loadForm());
  const s = saved.current;

  // ---- Prevent accidental file drops outside DropZone (causes page reload) ----
  useEffect(() => {
    const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };
    window.addEventListener('dragover', prevent);
    window.addEventListener('drop', prevent);
    return () => {
      window.removeEventListener('dragover', prevent);
      window.removeEventListener('drop', prevent);
    };
  }, []);

  // Mode
  const [mode, setMode] = useState(s.mode || 'new');
  const [creativeType, setCreativeType] = useState(s.creativeType || 'single');

  // Existing campaign/adset (API-fetched)
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [apiAdSets, setApiAdSets] = useState([]);

  // Campaign fields
  const [campaignName, setCampaignName] = useState(s.campaignName || '');
  const [objective, setObjective] = useState(s.objective || 'OUTCOME_TRAFFIC');
  const [budgetType, setBudgetType] = useState(s.budgetType || 'ABO');
  const [bidStrategy, setBidStrategy] = useState(s.bidStrategy || 'LOWEST_COST_WITHOUT_CAP');
  const [budgetSharing, setBudgetSharing] = useState(s.budgetSharing ?? false);

  // Multi-AdSet state
  const [adSetsState, setAdSetsState] = useState(() => {
    // Migration: if old flat format exists, convert to array
    if (s.adSetsState && Array.isArray(s.adSetsState)) {
      // Restore from saved array — reassign IDs to avoid collision
      return s.adSetsState.map((as, i) => {
        const id = `as_${nextAdSetId++}`;
        return { ...as, _id: id, _color: ADSET_COLORS[i % ADSET_COLORS.length] };
      });
    }
    if (s.adSetName !== undefined) {
      // Old flat format — migrate to single-element array
      return [makeDefaultAdSet({
        name: s.adSetName || '', dailyBudget: s.dailyBudget || '20',
        optimizationGoal: s.optimizationGoal || 'LINK_CLICKS',
        countries: Array.isArray(s.countries) ? s.countries : ['IT'],
        excludedCountries: Array.isArray(s.excludedCountries) ? s.excludedCountries : [],
        excludedRegions: Array.isArray(s.excludedRegions) ? s.excludedRegions : [],
        showExclusions: s.showExclusions || false,
        ageMin: s.ageMin || '18', ageMax: s.ageMax || '65', gender: s.gender || 'all',
        startDate: s.startDate || '', selectedPixel: s.selectedPixel || '',
        conversionEvent: s.conversionEvent || 'PURCHASE',
        bidAmount: s.bidAmount || '', attributionSetting: s.attributionSetting || '7d_click_1d_view',
        dailyMinSpend: s.dailyMinSpend || '', dailySpendCap: s.dailySpendCap || '',
        dsaBeneficiary: s.dsaBeneficiary || '', dsaPayor: s.dsaPayor || '',
      })];
    }
    return [makeDefaultAdSet()];
  });

  // Pixel list (used by AdSetCard)
  const [pixels, setPixels] = useState([]);

  // AdSet handlers
  const updateAdSet = useCallback((id, field, value) => {
    setAdSetsState((prev) => prev.map((as) => as._id === id ? { ...as, [field]: value } : as));
  }, []);

  const addAdSet = useCallback((overrides = {}) => {
    setAdSetsState((prev) => [...prev, makeDefaultAdSet(overrides)]);
  }, []);

  const duplicateAdSet = useCallback((id) => {
    setAdSetsState((prev) => {
      const source = prev.find((as) => as._id === id);
      if (!source) return prev;
      const newId = `as_${nextAdSetId++}`;
      const idx = prev.findIndex((as) => as._id === id);
      const copy = {
        ...source,
        _id: newId,
        _color: ADSET_COLORS[(nextAdSetId - 2) % ADSET_COLORS.length],
        _collapsed: false,
        name: source.name ? `${source.name} (copy)` : '',
        existingId: '',
        _type: 'new',
      };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });
  }, []);

  const removeAdSet = useCallback((id) => {
    setAdSetsState((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((as) => as._id !== id);
    });
    // Clean up creative assignments that reference the removed adset
    setFiles((prev) => prev.map((f) => {
      if (!f.adSetIds || f.adSetIds.includes('__all__')) return f;
      const cleaned = f.adSetIds.filter((asId) => asId !== id);
      return { ...f, adSetIds: cleaned.length > 0 ? cleaned : ['__all__'] };
    }));
  }, []);

  const duplicateFirst = useCallback((count) => {
    setAdSetsState((prev) => {
      if (prev.length === 0) return prev;
      const source = prev[0];
      const copies = [];
      for (let i = 0; i < count; i++) {
        const newId = `as_${nextAdSetId++}`;
        copies.push({
          ...source,
          _id: newId,
          _color: ADSET_COLORS[(nextAdSetId - 2) % ADSET_COLORS.length],
          _collapsed: true,
          name: source.name ? `${source.name} (${i + 2})` : '',
          existingId: '',
          _type: 'new',
        });
      }
      return [...prev, ...copies];
    });
  }, []);

  const handleAdSetAssignment = useCallback((creativeId, newAdSetIds) => {
    setFiles((prev) => prev.map((f) => f.id === creativeId ? { ...f, adSetIds: newAdSetIds } : f));
  }, []);

  // Page & IG (loaded from API + manual fallback)
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(s.selectedPage || '');
  const [igAccounts, setIgAccounts] = useState([]);
  const [selectedIgAccount, setSelectedIgAccount] = useState(s.selectedIgAccount || '');

  // Website URL
  const [websiteUrl, setWebsiteUrl] = useState(s.websiteUrl || '');

  // Global ad copy
  const [globalCopy, setGlobalCopy] = useState(s.globalCopy || {
    primaryText: '', headline: '', description: '', cta: 'LEARN_MORE',
  });

  // Creatives (file objects can't be saved to sessionStorage)
  const [files, setFiles] = useState([]);
  const [selectedCreativeIds, setSelectedCreativeIds] = useState(new Set());

  // Bulk assignment: assign selected creatives to adsets
  const handleBulkAssign = useCallback((newAdSetIds) => {
    setFiles((prev) => prev.map((f) => selectedCreativeIds.has(f.id) ? { ...f, adSetIds: newAdSetIds } : f));
  }, [selectedCreativeIds]);

  const toggleCreativeSelection = useCallback((id, shiftKey) => {
    setSelectedCreativeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAllCreatives = useCallback(() => {
    setSelectedCreativeIds(new Set(files.map((f) => f.id)));
  }, [files]);

  const deselectAllCreatives = useCallback(() => {
    setSelectedCreativeIds(new Set());
  }, []);

  // Launch
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const [bgLaunches, setBgLaunches] = useState([]);
  const [adStatus, setAdStatus] = useState(s.adStatus || 'PAUSED');
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showLog, setShowLog] = useState(false);
  const [logEntries, setLogEntries] = useState([]);
  const logEndRef = useRef(null);

  // Subscribe to API log changes
  useEffect(() => {
    onApiLogChange(() => setLogEntries([...getApiLog()]));
    return () => onApiLogChange(null);
  }, []);

  // Country presets (localStorage)
  const PRESETS_KEY = 'meta-ads-country-presets';
  const [countryPresets, setCountryPresets] = useState(() => {
    try { return JSON.parse(localStorage.getItem(PRESETS_KEY)) || []; } catch { return []; }
  });
  const savePreset = (name) => {
    if (!name.trim()) return;
    // Use first adset's countries for the preset
    const first = adSetsState[0] || {};
    const preset = { name: name.trim(), countries: first.countries || [], excludedCountries: first.excludedCountries || [], excludedRegions: first.excludedRegions || [] };
    const updated = [...countryPresets.filter((p) => p.name !== name.trim()), preset];
    setCountryPresets(updated);
    localStorage.setItem(PRESETS_KEY, JSON.stringify(updated));
    addToast(`Preset "${name.trim()}" salvato`);
  };

  const loadPreset = () => {
    // No-op: AdSetCard applies presets directly via onUpdate
  };

  const deletePreset = (name) => {
    const updated = countryPresets.filter((p) => p.name !== name);
    setCountryPresets(updated);
    localStorage.setItem(PRESETS_KEY, JSON.stringify(updated));
  };

  const needsBidAmount = bidStrategy === 'BID_CAP' || bidStrategy === 'COST_CAP';
  const needsRoas = bidStrategy === 'LOWEST_COST_WITH_MIN_ROAS';

  // ---- Save form state to sessionStorage ----
  useEffect(() => {
    sessionStorage.setItem(FORM_KEY, JSON.stringify({
      mode, creativeType, campaignName, objective, budgetType, bidStrategy, budgetSharing,
      adSetsState: adSetsState.map((as) => ({ ...as })),
      selectedPage, selectedIgAccount, websiteUrl, globalCopy, adStatus,
    }));
  }, [mode, creativeType, campaignName, objective, budgetType, bidStrategy, budgetSharing,
    adSetsState, selectedPage, selectedIgAccount, websiteUrl, globalCopy, adStatus]);

  // ---- API: Load ad accounts ----
  const [adAccounts, setAdAccounts] = useState([]);
  useEffect(() => {
    if (!settings.accessToken) { setAdAccounts([]); return; }
    api.getAdAccounts(settings.accessToken)
      .then(setAdAccounts)
      .catch(() => setAdAccounts([]));
  }, [settings.accessToken]);

  // ---- API: Load pages ----
  useEffect(() => {
    if (!settings.accessToken) return;
    api.getPages(settings.accessToken, settings.adAccountId)
      .then((data) => {
        setPages(data);
        if (data.length > 0 && !selectedPage) setSelectedPage(data[0].id);
      })
      .catch(() => {});
  }, [settings.accessToken, settings.adAccountId]);

  // ---- API: Load IG accounts ----
  useEffect(() => {
    if (!settings.accessToken || !selectedPage) { setIgAccounts([]); return; }
    const pageObj = pages.find((p) => p.id === selectedPage);
    api.getInstagramAccounts(settings.accessToken, selectedPage, {
      pageToken: pageObj?.access_token,
      accountId: settings.adAccountId,
    })
      .then((data) => {
        // Enrich IG accounts with page name/picture as fallback
        const pagePic = pageObj?.picture?.data?.url;
        const enriched = data.map((ig) => ({
          ...ig,
          name: ig.name || pageObj?.name || undefined,
          profile_picture_url: ig.profile_picture_url || ig.profile_pic || pagePic || undefined,
        }));
        setIgAccounts(enriched);
        setSelectedIgAccount(enriched.length > 0 ? enriched[0].id : '');
      })
      .catch(() => { setIgAccounts([]); setSelectedIgAccount(''); });
  }, [settings.accessToken, settings.adAccountId, selectedPage, pages]);

  // ---- API: Load pixels ----
  useEffect(() => {
    if (!isConfigured) return;
    api.getPixels(settings.accessToken, settings.adAccountId)
      .then((data) => {
        setPixels(data);
        // Pre-fill pixel on adsets that don't have one yet
        if (data.length > 0) {
          setAdSetsState((prev) => prev.map((as) =>
            as.selectedPixel ? as : { ...as, selectedPixel: data[0].id }
          ));
        }
      })
      .catch(() => {});
  }, [isConfigured, settings.accessToken, settings.adAccountId]);

  // ---- API: Load existing campaigns ----
  useEffect(() => {
    if (!isConfigured || mode !== 'existing') return;
    api.getCampaigns(settings.accessToken, settings.adAccountId)
      .then(setCampaigns)
      .catch(() => {});
  }, [isConfigured, settings.accessToken, settings.adAccountId, mode]);

  // ---- API: Load adsets for existing campaign ----
  useEffect(() => {
    if (!selectedCampaign) { setApiAdSets([]); return; }
    api.getAdSets(settings.accessToken, selectedCampaign)
      .then(setApiAdSets)
      .catch(() => {});
  }, [selectedCampaign, settings.accessToken]);

  // ---- Detect CBO from selected campaign ----
  const selectedCampaignObj = campaigns.find((c) => c.id === selectedCampaign);
  const isCBO = mode === 'existing'
    ? !!(selectedCampaignObj?.daily_budget || selectedCampaignObj?.lifetime_budget)
    : budgetType === 'CBO';

  // ---- Auto-add existing ad sets when campaign is selected ----
  useEffect(() => {
    if (!apiAdSets.length || mode !== 'existing') return;
    const ref = apiAdSets.find((a) => a.status === 'ACTIVE') || apiAdSets[0];
    setAdSetsState((prev) => {
      // If we already have existing adsets from this campaign, skip
      if (prev.some((as) => as._type === 'existing')) return prev;
      // Auto-add all existing adsets + keep one new adset pre-filled
      const existingEntries = apiAdSets.map((apiAs) => makeDefaultAdSet({
        _type: 'existing',
        existingId: apiAs.id,
        name: apiAs.name,
      }));
      // Pre-fill the first "new" adset with values from existing
      const firstNew = prev[0] || makeDefaultAdSet();
      const prefilledNew = {
        ...firstNew,
        optimizationGoal: ref.optimization_goal || firstNew.optimizationGoal,
        selectedPixel: ref.promoted_object?.pixel_id || firstNew.selectedPixel,
        conversionEvent: ref.promoted_object?.custom_event_type || firstNew.conversionEvent,
      };
      return [...existingEntries, prefilledNew, ...prev.slice(1)];
    });
  }, [apiAdSets, mode]);

  // ---- Handlers ----
  const handleFilesSelected = useCallback((newFiles) => {
    const creatives = newFiles.map((file) => ({
      id: nextId++,
      file,
      adSetIds: ['__all__'],
      useCustomCopy: false,
      primaryText: '',
      headline: '',
      description: '',
      linkUrl: '',
      cta: 'LEARN_MORE',
    }));
    setFiles((prev) => [...prev, ...creatives]);
  }, []);

  const handleRemove = useCallback((id) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleToggleCustom = useCallback((id) => {
    setFiles((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const enabling = !f.useCustomCopy;
        if (enabling) {
          // Pre-fill with global values so user sees what they're inheriting
          return {
            ...f,
            useCustomCopy: true,
            primaryText: f.primaryText || globalCopy.primaryText,
            headline: f.headline || globalCopy.headline,
            description: f.description || globalCopy.description,
            cta: globalCopy.cta,
          };
        }
        // Turning off: clear custom fields back to empty
        return { ...f, useCustomCopy: false, primaryText: '', headline: '', description: '', linkUrl: '', cta: 'LEARN_MORE' };
      })
    );
  }, [globalCopy]);

  const handleUpdateField = useCallback((id, field, value) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
  }, []);

  const handleMove = useCallback((id, direction) => {
    setFiles((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      if (idx < 0) return prev;
      const target = idx + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }, []);

  const buildUrlWithUtm = useCallback((baseUrl) => {
    if (!baseUrl) return '';
    let url = baseUrl.trim();
    if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
    return url;
  }, []);

  const getCreativeCopy = useCallback((creative) => {
    const rawUrl = creative.useCustomCopy ? (creative.linkUrl || websiteUrl) : websiteUrl;
    const finalUrl = buildUrlWithUtm(rawUrl);
    if (creative.useCustomCopy) {
      return {
        primaryText: creative.primaryText || globalCopy.primaryText,
        headline: creative.headline || globalCopy.headline,
        description: creative.description || globalCopy.description,
        linkUrl: finalUrl,
        cta: creative.cta || globalCopy.cta,
      };
    }
    return {
      primaryText: globalCopy.primaryText,
      headline: globalCopy.headline,
      description: globalCopy.description,
      linkUrl: finalUrl,
      cta: globalCopy.cta,
    };
  }, [globalCopy, websiteUrl, buildUrlWithUtm]);

  const handleLaunch = () => {
    if (mode === 'new') {
      if (!campaignName.trim()) { addToast('Enter a campaign name', 'error'); return; }
    } else {
      if (!selectedCampaign) { addToast('Select a campaign', 'error'); return; }
    }
    if (files.length === 0) { addToast('Upload at least one creative', 'error'); return; }
    if (!websiteUrl.trim()) { addToast('Enter a website URL', 'error'); return; }
    if (!selectedPage) { addToast('Select or enter a Facebook Page ID', 'error'); return; }
    if (creativeType === 'carousel' && files.length < 2) { addToast('Carousel needs at least 2 images', 'error'); return; }

    // Validate each ad set
    const newAdSets = adSetsState.filter((as) => as._type !== 'existing');
    if (adSetsState.length === 0) { addToast('Add at least one ad set', 'error'); return; }

    for (const as of newAdSets) {
      if (!as.name.trim()) { addToast(`Ad set "${as.name || '(unnamed)'}" needs a name`, 'error'); return; }
      if (!isCBO) {
        const budget = Number(as.dailyBudget);
        if (!budget || budget <= 0) { addToast(`Ad set "${as.name}" needs a budget > 0`, 'error'); return; }
      }
      if (Number(as.ageMin) > Number(as.ageMax)) { addToast(`Ad set "${as.name}": min age > max age`, 'error'); return; }
      if (needsBidAmount && (!as.bidAmount || Number(as.bidAmount) <= 0)) { addToast(`Ad set "${as.name}": enter a valid bid amount`, 'error'); return; }
      if (needsRoas && (!as.bidAmount || Number(as.bidAmount) <= 0)) { addToast(`Ad set "${as.name}": enter a valid ROAS target`, 'error'); return; }
      const asDsa = (as.countries || []).some((c) => DSA_COUNTRIES.has(c));
      if (asDsa && (!as.dsaBeneficiary?.trim() || !as.dsaPayor?.trim())) { addToast(`Ad set "${as.name}": DSA fields required for EU`, 'error'); return; }
    }

    // Validate that every creative is assigned to at least 1 adset (single ads)
    if (creativeType === 'single') {
      for (const f of files) {
        const ids = f.adSetIds || ['__all__'];
        if (!ids.includes('__all__')) {
          const validIds = ids.filter((id) => adSetsState.some((as) => as._id === id));
          if (validIds.length === 0) { addToast(`Creative "${f.file.name}" is not assigned to any ad set`, 'error'); return; }
        }
      }
    }

    setShowLaunchModal(true);
  };

  // Helper: get which adSetIds a creative belongs to (resolved to actual IDs)
  const resolveCreativeAdSets = (creative, allAdSets) => {
    const ids = creative.adSetIds || ['__all__'];
    if (ids.includes('__all__')) return allAdSets.map((as) => as._id);
    return ids.filter((id) => allAdSets.some((as) => as._id === id));
  };

  const confirmLaunch = () => {
    // --- Snapshot ALL form values before closing the modal ---
    const snap = {
      files: files.map((f) => ({ ...f })),
      adSets: adSetsState.map((as) => ({ ...as })),
      mode,
      creativeType,
      campaignName,
      selectedCampaign,
      selectedCampaignObj: campaigns.find((c) => c.id === selectedCampaign),
      objective,
      adStatus,
      budgetType,
      bidStrategy,
      budgetSharing,
      needsBidAmount,
      isCBO,
      pageId: selectedPage,
      igId: (() => {
        if (!selectedIgAccount) return undefined;
        const ig = igAccounts.find((a) => a.id === selectedIgAccount);
        return ig?.pageBacked ? undefined : selectedIgAccount;
      })(),
      pages: pages.map((p) => ({ ...p })),
      websiteUrl,
      globalCopy: { ...globalCopy },
      accessToken: settings.accessToken,
      adAccountId: settings.adAccountId,
      enhancements: settings.enhancements,
      utmTemplate: settings.utmTemplate,
    };

    const launchId = Date.now();
    const launchName = snap.mode === 'new' ? snap.campaignName : (snap.selectedCampaignObj?.name || 'Campaign');

    // Close modal immediately
    setShowLaunchModal(false);

    // Add background launch entry (pct = continuous 0-100 percentage)
    setBgLaunches((prev) => [...prev, { id: launchId, name: launchName, step: 'Starting...', pct: 0, status: 'running' }]);

    // Helper to update this launch's progress
    const updateLaunch = (patch) => setBgLaunches((prev) => prev.map((l) => l.id === launchId ? { ...l, ...patch } : l));

    // Helper to build URL with UTM from snapshot
    const snapBuildUrl = (baseUrl) => {
      if (!baseUrl) return '';
      let url = baseUrl.trim();
      if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
      return url;
    };
    const snapUrlTags = snap.utmTemplate?.trim().replace(/[\r\n]+/g, '') || '';

    // Helper to get creative copy from snapshot (empty fields fall back to global)
    const snapGetCopy = (creative) => {
      const rawUrl = creative.useCustomCopy ? (creative.linkUrl || snap.websiteUrl) : snap.websiteUrl;
      const finalUrl = snapBuildUrl(rawUrl);
      if (creative.useCustomCopy) {
        return {
          primaryText: creative.primaryText || snap.globalCopy.primaryText,
          headline: creative.headline || snap.globalCopy.headline,
          description: creative.description || snap.globalCopy.description,
          linkUrl: finalUrl,
          cta: creative.cta || snap.globalCopy.cta,
        };
      }
      return { primaryText: snap.globalCopy.primaryText, headline: snap.globalCopy.headline, description: snap.globalCopy.description, linkUrl: finalUrl, cta: snap.globalCopy.cta };
    };

    // Run launch in background (async IIFE) — 5-phase algorithm
    (async () => {
      const total = snap.files.length;
      const results = [];
      const adSetIdMap = {}; // _id → Meta API ID

      try {
        // ── PHASE 1: Create campaign (if new mode) ──
        let campaignId;
        if (snap.mode === 'new') {
          const firstAs = snap.adSets[0];
          const budgetCents = String(Math.round(Number(firstAs.dailyBudget) * 100));

          updateLaunch({ step: 'Creating campaign...', pct: 2 });
          const camp = await api.createCampaign(snap.accessToken, snap.adAccountId, {
            name: snap.campaignName, objective: snap.objective, status: snap.adStatus, budgetType: snap.budgetType,
            dailyBudget: budgetCents, bidStrategy: snap.bidStrategy, budgetSharing: snap.budgetSharing,
          });
          campaignId = camp.id;
        } else {
          campaignId = snap.selectedCampaign;
        }

        // ── PHASE 2: Create ad sets (sequentially to avoid rate limits) ──
        const totalAdSets = snap.adSets.length;
        for (let i = 0; i < totalAdSets; i++) {
          const as = snap.adSets[i];

          if (as._type === 'existing') {
            adSetIdMap[as._id] = as.existingId;
            continue;
          }

          const pct = 3 + Math.round((i / totalAdSets) * 12);
          updateLaunch({ step: `Creating ad set ${i + 1}/${totalAdSets}...`, pct });

          const asIsCBO = snap.isCBO;
          const budgetCents = !asIsCBO ? String(Math.round(Number(as.dailyBudget) * 100)) : undefined;
          const bidAmountCents = as.bidAmount ? String(Math.round(Number(as.bidAmount) * 100)) : undefined;
          const minSpendCents = (!asIsCBO && as.dailyMinSpend) ? String(Math.round(Number(as.dailyMinSpend) * 100)) : undefined;
          const spendCapCents = (!asIsCBO && as.dailySpendCap) ? String(Math.round(Number(as.dailySpendCap) * 100)) : undefined;
          const asDsa = (as.countries || []).some((c) => DSA_COUNTRIES.has(c));

          const aset = await api.createAdSet(snap.accessToken, snap.adAccountId, {
            name: as.name, campaignId, dailyBudget: budgetCents, optimizationGoal: as.optimizationGoal,
            billingEvent: 'IMPRESSIONS',
            countries: as.countries, excludedCountries: as.excludedCountries, excludedRegions: as.excludedRegions,
            ageMin: as.ageMin, ageMax: as.ageMax, gender: as.gender, status: snap.adStatus,
            startTime: as.startDate || undefined,
            budgetType: snap.mode === 'new' ? snap.budgetType : (asIsCBO ? 'CBO' : 'ABO'),
            bidStrategy: snap.mode === 'new' ? snap.bidStrategy : (snap.selectedCampaignObj?.bid_strategy || 'LOWEST_COST_WITHOUT_CAP'),
            budgetSharing: snap.mode === 'new' ? snap.budgetSharing : undefined,
            pixelId: as.selectedPixel || undefined,
            conversionEvent: as.selectedPixel ? as.conversionEvent : undefined,
            bidAmount: snap.needsBidAmount ? bidAmountCents : undefined,
            attributionSetting: as.selectedPixel ? as.attributionSetting : undefined,
            dailyMinSpend: minSpendCents, dailySpendCap: spendCapCents,
            dsaBeneficiary: asDsa ? (as.dsaBeneficiary || snap.pages.find((p) => p.id === snap.pageId)?.name || snap.pageId) : undefined,
            dsaPayor: asDsa ? (as.dsaPayor || snap.pages.find((p) => p.id === snap.pageId)?.name || snap.pageId) : undefined,
          });
          adSetIdMap[as._id] = aset.id;
        }

        if (snap.creativeType === 'carousel') {
          // ── CAROUSEL: upload → creative → 1 ad per adset ──
          updateLaunch({ step: 'Uploading carousel images...', pct: 15 });
          let uploadCount = 0;
          const carouselFileProgress = new Array(total).fill(0);
          const updateCarouselPct = () => {
            const avg = carouselFileProgress.reduce((a, b) => a + b, 0) / total;
            updateLaunch({ pct: 15 + Math.round(avg * 45) });
          };
          const uploads = await Promise.all(snap.files.map(async (creative, idx) => {
            const copy = snapGetCopy(creative);
            const isImage = ACCEPTED_IMAGE_TYPES.includes(creative.file.type);
            const upload = isImage
              ? await api.uploadImage(snap.accessToken, snap.adAccountId, creative.file)
              : await api.uploadVideo(snap.accessToken, snap.adAccountId, creative.file, (pct) => {
                  carouselFileProgress[idx] = pct;
                  updateCarouselPct();
                });
            uploadCount++;
            carouselFileProgress[idx] = 1;
            updateLaunch({ step: `Uploaded ${uploadCount}/${total}`, pct: 15 + Math.round((uploadCount / total) * 45) });
            return { upload, copy, isImage };
          }));

          const cards = uploads.map(({ upload, copy }) => ({
            imageHash: upload.hash, headline: copy.headline, description: copy.description,
            linkUrl: copy.linkUrl, cta: copy.cta,
          }));

          updateLaunch({ step: 'Creating carousel creative...', pct: 65 });
          const globalUrl = snapBuildUrl(snap.websiteUrl);
          const carouselSpec = buildDegreesOfFreedomSpec(snap.enhancements, 'carousel');
          let creativeResult;
          try {
            creativeResult = await api.createCarouselCreative(snap.accessToken, snap.adAccountId, {
              name: `Carousel - ${snap.campaignName || 'Ad'}`, pageId: snap.pageId, cards,
              message: snap.globalCopy.primaryText, linkUrl: globalUrl, cta: snap.globalCopy.cta,
              instagramAccountId: snap.igId, degreesOfFreedomSpec: carouselSpec, urlTags: snapUrlTags,
            });
          } catch (igErr) {
            if (snap.igId && igErr.message.includes('instagram_actor_id')) {
              addToast('Account IG non valido per questo ad account — lancio senza IG', 'error');
              creativeResult = await api.createCarouselCreative(snap.accessToken, snap.adAccountId, {
                name: `Carousel - ${snap.campaignName || 'Ad'}`, pageId: snap.pageId, cards,
                message: snap.globalCopy.primaryText, linkUrl: globalUrl, cta: snap.globalCopy.cta,
                degreesOfFreedomSpec: carouselSpec, urlTags: snapUrlTags,
              });
            } else {
              throw igErr;
            }
          }

          // Create 1 ad per adset (carousel = all adsets, no picker)
          updateLaunch({ step: 'Creating ads...', pct: 75 });
          let adCount = 0;
          const adSetEntries = Object.entries(adSetIdMap);
          const adResults = await Promise.all(adSetEntries.map(async ([localId, metaId]) => {
            const asName = snap.adSets.find((a) => a._id === localId)?.name || '';
            const ad = await api.createAd(snap.accessToken, snap.adAccountId, {
              name: `Ad - Carousel${adSetEntries.length > 1 ? ` (${asName})` : ''}`, adSetId: metaId, creativeId: creativeResult.id, status: snap.adStatus,
            });
            adCount++;
            updateLaunch({ step: `Creating ads... ${adCount}/${adSetEntries.length}`, pct: 75 + Math.round((adCount / adSetEntries.length) * 25) });
            return { fileName: 'Carousel', adId: ad.id, creativeId: creativeResult.id, adSetName: asName };
          }));
          results.push(...adResults);
        } else {
          // ── SINGLE ADS: 5-phase ──
          // Phase 3: Upload media (parallel, once per file)
          updateLaunch({ step: 'Uploading creatives...', pct: 15 });
          let uploadCount = 0;
          const fileProgress = new Array(total).fill(0);
          const updateUploadPct = () => {
            const avg = fileProgress.reduce((a, b) => a + b, 0) / total;
            updateLaunch({ pct: 15 + Math.round(avg * 30) });
          };
          const uploads = await Promise.all(snap.files.map(async (creative, idx) => {
            const isImage = ACCEPTED_IMAGE_TYPES.includes(creative.file.type);
            const upload = isImage
              ? await api.uploadImage(snap.accessToken, snap.adAccountId, creative.file)
              : await api.uploadVideo(snap.accessToken, snap.adAccountId, creative.file, (pct) => {
                  fileProgress[idx] = pct;
                  updateUploadPct();
                  updateLaunch({ step: `Uploading ${creative.file.name} (${Math.round(pct * 100)}%)` });
                });
            uploadCount++;
            fileProgress[idx] = 1;
            updateLaunch({ step: `Uploaded ${uploadCount}/${total}`, pct: 15 + Math.round((uploadCount / total) * 30) });
            return { creative, upload, isImage };
          }));

          // Process video thumbnails
          const videoUploads = uploads.filter((u) => !u.isImage);
          if (videoUploads.length > 0) {
            updateLaunch({ step: `Processing ${videoUploads.length} video thumbnail${videoUploads.length > 1 ? 's' : ''}...`, pct: 48 });
            await Promise.all(videoUploads.map(async (u) => {
              u.thumbnailUrl = await api.getVideoThumbnail(snap.accessToken, u.upload.id);
            }));
          }

          // Phase 4: Create creatives (1 per file, account-level)
          updateLaunch({ step: 'Creating creatives...', pct: 50 });
          let creativeCount = 0;
          const creativeResults = await Promise.all(uploads.map(async (u) => {
            const copy = snapGetCopy(u.creative);
            let creativeResult;
            if (u.isImage) {
              const imgSpec = buildDegreesOfFreedomSpec(snap.enhancements, 'image');
              creativeResult = await api.createImageCreative(snap.accessToken, snap.adAccountId, {
                name: u.creative.file.name, pageId: snap.pageId, imageHash: u.upload.hash,
                message: copy.primaryText, headline: copy.headline, description: copy.description,
                linkUrl: copy.linkUrl, cta: copy.cta, instagramAccountId: snap.igId,
                degreesOfFreedomSpec: imgSpec, urlTags: snapUrlTags,
              });
            } else {
              const vidSpec = buildDegreesOfFreedomSpec(snap.enhancements, 'video');
              creativeResult = await api.createVideoCreative(snap.accessToken, snap.adAccountId, {
                name: u.creative.file.name, pageId: snap.pageId, videoId: u.upload.id,
                message: copy.primaryText, headline: copy.headline, description: copy.description,
                linkUrl: copy.linkUrl, cta: copy.cta, imageUrl: u.thumbnailUrl || undefined,
                instagramAccountId: snap.igId, degreesOfFreedomSpec: vidSpec, urlTags: snapUrlTags,
              });
            }
            creativeCount++;
            updateLaunch({ step: `Creating creatives... ${creativeCount}/${total}`, pct: 50 + Math.round((creativeCount / total) * 20) });
            return { creative: u.creative, creativeResult };
          }));

          // Phase 5: Create ads for each (creative, adset) pair
          updateLaunch({ step: 'Creating ads...', pct: 70 });

          // Build pairs: for each creative, determine which adsets it belongs to
          const pairs = [];
          for (const cr of creativeResults) {
            const targetAdSetIds = resolveCreativeAdSets(cr.creative, snap.adSets);
            for (const localId of targetAdSetIds) {
              const metaId = adSetIdMap[localId];
              if (metaId) {
                pairs.push({
                  creative: cr.creative,
                  creativeResult: cr.creativeResult,
                  adSetLocalId: localId,
                  adSetMetaId: metaId,
                  adSetName: snap.adSets.find((a) => a._id === localId)?.name || '',
                });
              }
            }
          }

          let adCount = 0;
          const adResults = await Promise.all(pairs.map(async (pair) => {
            const adNameSuffix = snap.adSets.length > 1 ? ` (${pair.adSetName})` : '';
            const ad = await api.createAd(snap.accessToken, snap.adAccountId, {
              name: `Ad - ${pair.creative.file.name}${adNameSuffix}`, adSetId: pair.adSetMetaId, creativeId: pair.creativeResult.id, status: snap.adStatus,
            });
            adCount++;
            updateLaunch({ step: `Creating ads... ${adCount}/${pairs.length}`, pct: 70 + Math.round((adCount / pairs.length) * 30) });
            return { fileName: pair.creative.file.name, adId: ad.id, creativeId: pair.creativeResult.id, adSetName: pair.adSetName };
          }));
          results.push(...adResults);
        }

        const firstAdSetMetaId = Object.values(adSetIdMap)[0];
        addHistory({ campaignId, adSetId: firstAdSetMetaId, campaignName: launchName, adsCount: results.length, status: snap.adStatus, results });
        addCreatives(snap.files.map((f) => ({ name: f.file.name, size: f.file.size, type: f.file.type, date: new Date().toISOString() })));
        addToast(`${results.length} ad${results.length !== 1 ? 's' : ''} launched across ${snap.adSets.length} ad set${snap.adSets.length !== 1 ? 's' : ''}!`);
        setTimeout(() => setBgLaunches((prev) => prev.filter((l) => l.id !== launchId)), 1000);
      } catch (err) {
        addToast(`Launch failed: ${err.message}`, 'error');
        updateLaunch({ status: 'error', step: err.message });
        setTimeout(() => setBgLaunches((prev) => prev.filter((l) => l.id !== launchId)), 5000);
      }
    })();
  };

  const inputCls = "w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent bg-white";

  return (
    <div className="p-6">
      {!isConfigured && (
        <div className="mb-4 px-4 py-3 bg-warning/10 border border-warning/20 rounded-lg flex items-center gap-3 text-sm">
          <svg className="w-5 h-5 text-warning flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="text-text-secondary">API not configured — you can explore the UI, but launching requires credentials.</span>
        </div>
      )}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Upload Ad Creatives</h1>
        <p className="text-text-secondary text-sm mt-1">Configure everything and launch in one click</p>
      </div>

      {/* Ad Account Selector */}
      {adAccounts.length > 0 && (
        <AdAccountBar adAccounts={adAccounts} settings={settings} setSettings={setSettings} inputCls={inputCls} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ============ LEFT COLUMN ============ */}
        <div className="space-y-5">

          {/* Mode toggle */}
          <div className="flex gap-1 bg-bg rounded-lg p-1 w-fit">
            <button onClick={() => setMode('new')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'new' ? 'bg-white shadow-sm text-text' : 'text-text-secondary hover:text-text'}`}>
              New Campaign
            </button>
            <button onClick={() => setMode('existing')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'existing' ? 'bg-white shadow-sm text-text' : 'text-text-secondary hover:text-text'}`}>
              Existing Campaign
            </button>
          </div>

          {/* Campaign config */}
          <div className="bg-white rounded-xl border border-border p-5 space-y-4">
            <h2 className="text-sm font-semibold">Campaign</h2>

            {mode === 'new' ? (
              <>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Campaign Name</label>
                  <input type="text" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} className={inputCls} placeholder="es. Summer Sale 2026" />
                </div>
                <Select label="Objective" value={objective} onChange={setObjective} options={CAMPAIGN_OBJECTIVES} />

                {/* CBO / ABO */}
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Budget Type</label>
                  <div className="flex gap-1 bg-bg rounded-lg p-1">
                    <button type="button" onClick={() => setBudgetType('ABO')}
                      className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${budgetType === 'ABO' ? 'bg-white shadow-sm text-text' : 'text-text-secondary hover:text-text'}`}>
                      ABO (Ad Set Budget)
                    </button>
                    <button type="button" onClick={() => setBudgetType('CBO')}
                      className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${budgetType === 'CBO' ? 'bg-white shadow-sm text-text' : 'text-text-secondary hover:text-text'}`}>
                      CBO (Campaign Budget)
                    </button>
                  </div>
                </div>

                {budgetType === 'CBO' && (
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Daily Budget ($) — Campaign level
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-secondary">$</span>
                      <input type="number" step="0.01" min="1" value={adSetsState[0]?.dailyBudget || '20'} onChange={(e) => {
                        if (adSetsState.length > 0) updateAdSet(adSetsState[0]._id, 'dailyBudget', e.target.value);
                      }} className={`${inputCls} pl-7`} />
                    </div>
                  </div>
                )}

                {/* Budget sharing (ABO only) */}
                {budgetType === 'ABO' && (
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input type="checkbox" checked={budgetSharing} onChange={(e) => setBudgetSharing(e.target.checked)}
                      className="w-4 h-4 rounded border-border text-accent focus:ring-accent/30 cursor-pointer" />
                    <div>
                      <span className="text-xs font-medium">Advantage Budget Sharing</span>
                      <p className="text-xs text-text-secondary">I gruppi di inserzioni possono condividere fino al 20% del loro budget per ottimizzare le prestazioni.</p>
                    </div>
                  </label>
                )}

                <Select label="Bid Strategy" value={bidStrategy} onChange={setBidStrategy} options={BID_STRATEGIES} />

                {/* Bid amount / ROAS are now configured per ad set */}
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Campaign</label>
                  <select value={selectedCampaign} onChange={(e) => { setSelectedCampaign(e.target.value); setAdSetsState([makeDefaultAdSet()]); }} className={inputCls}>
                    <option value="">Select a campaign...</option>
                    {(() => {
                      const sorted = [...campaigns].sort((a, b) => (a.status === 'ACTIVE' ? 0 : 1) - (b.status === 'ACTIVE' ? 0 : 1));
                      const firstInactiveIdx = sorted.findIndex((c) => c.status !== 'ACTIVE');
                      return sorted.map((c, i) => (
                        <React.Fragment key={c.id}>
                          {i === firstInactiveIdx && firstInactiveIdx > 0 && <option disabled>{'─'.repeat(30)}</option>}
                          <option value={c.id}>{c.name} — {c.status}</option>
                        </React.Fragment>
                      ));
                    })()}
                  </select>
                </div>
                {selectedCampaignObj && (
                  <p className="text-xs text-text-secondary">
                    {isCBO ? 'CBO — budget at campaign level' : 'ABO — budget at ad set level'}
                    {selectedCampaignObj.bid_strategy && ` · ${BID_STRATEGIES.find((b) => b.value === selectedCampaignObj.bid_strategy)?.label || selectedCampaignObj.bid_strategy}`}
                  </p>
                )}
              </>
            )}
          </div>

          {/* Ad Sets */}
          <div className="space-y-3">
            {/* Toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold">Ad Sets</span>
              <span className="px-2 py-0.5 text-xs font-bold bg-accent/10 text-accent rounded-full">{adSetsState.length}</span>
              <div className="flex-1" />
              {/* Quick add N copies */}
              <div className="flex items-center gap-1">
                <input
                  type="number" min="1" max="50" defaultValue="5"
                  id="adset-count-input"
                  className="w-14 border border-border rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-accent/30"
                />
                <button type="button" onClick={() => {
                  const count = Number(document.getElementById('adset-count-input')?.value) || 1;
                  duplicateFirst(count);
                }}
                  className="px-2.5 py-1.5 text-xs font-medium bg-bg border border-border rounded-lg hover:bg-accent hover:text-white hover:border-accent transition-colors whitespace-nowrap">
                  Duplicate first
                </button>
              </div>
              <button type="button" onClick={() => addAdSet()}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Ad Set
              </button>
              {/* In existing mode: add from existing campaign adsets */}
              {mode === 'existing' && apiAdSets.length > 0 && (
                <select
                  value=""
                  onChange={(e) => {
                    const apiAs = apiAdSets.find((a) => a.id === e.target.value);
                    if (!apiAs) return;
                    // Check if already added
                    if (adSetsState.some((as) => as.existingId === apiAs.id)) {
                      addToast('Ad set already added', 'error');
                      return;
                    }
                    setAdSetsState((prev) => [...prev, makeDefaultAdSet({
                      _type: 'existing',
                      existingId: apiAs.id,
                      name: apiAs.name,
                    })]);
                  }}
                  className="border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent/30 bg-white"
                >
                  <option value="">+ Add existing...</option>
                  {apiAdSets.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} — {a.status}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Ad Set Cards */}
            {adSetsState.map((as, i) => (
              <AdSetCard
                key={as._id}
                adSet={as}
                index={i}
                total={adSetsState.length}
                pixels={pixels}
                accessToken={settings.accessToken}
                countryPresets={countryPresets}
                onLoadPreset={loadPreset}
                onSavePreset={savePreset}
                onDeletePreset={deletePreset}
                onUpdate={updateAdSet}
                onDuplicate={duplicateAdSet}
                onRemove={removeAdSet}
                isCBO={isCBO}
                budgetType={budgetType}
                bidStrategy={bidStrategy}
              />
            ))}
          </div>

          {/* Page & Instagram Account */}
          <div className="bg-white rounded-xl border border-border p-5 space-y-4">
            <h2 className="text-sm font-semibold">Page & Identity</h2>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">Facebook Page</label>
              {pages.length > 0 ? (
                <PagePicker pages={pages} selected={selectedPage} onChange={setSelectedPage} />
              ) : (
                <input type="text" value={selectedPage} onChange={(e) => setSelectedPage(e.target.value)} className={inputCls} placeholder="Page ID (es. 123456789)" />
              )}
              {pages.length > 0 && (
                <details className="mt-1.5">
                  <summary className="text-xs text-text-secondary cursor-pointer hover:text-text">Or enter Page ID manually</summary>
                  <input type="text" value={selectedPage} onChange={(e) => setSelectedPage(e.target.value)} className={`${inputCls} mt-1`} placeholder="Page ID..." />
                </details>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Instagram Account <span className="font-normal">(optional)</span>
              </label>
              {igAccounts.length > 0 ? (
                <IgAccountPicker igAccounts={igAccounts} selected={selectedIgAccount} onChange={setSelectedIgAccount} />
              ) : (
                <input type="text" value={selectedIgAccount} onChange={(e) => setSelectedIgAccount(e.target.value)} className={inputCls} placeholder="Instagram Account ID (optional)" />
              )}
              <details className="mt-1.5">
                <summary className="text-xs text-text-secondary cursor-pointer hover:text-text">Inserisci ID Instagram manualmente</summary>
                <input
                  type="text"
                  value={selectedIgAccount}
                  onChange={(e) => setSelectedIgAccount(e.target.value)}
                  className={`${inputCls} mt-1`}
                  placeholder="Instagram Account ID (es. 17841400000000)"
                />
                <p className="text-[10px] text-text-secondary mt-1">
                  Se l'account non viene trovato automaticamente, puoi inserire l'ID manualmente.
                  Lo trovi su Business Manager &gt; Account Instagram.
                </p>
              </details>
            </div>
          </div>

          {/* Website URL */}
          <div className="bg-white rounded-xl border border-border p-5">
            <label className="block text-xs font-medium text-text-secondary mb-1">Website URL</label>
            <input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} className={inputCls} placeholder="https://example.com" />
          </div>

          {/* Global Ad Copy */}
          <div className="bg-white rounded-xl border border-border p-5">
            <div className="mb-3">
              <h2 className="text-sm font-semibold">Ad Copy</h2>
              <p className="text-xs text-text-secondary mt-0.5">Applies to all creatives. Check "Custom" on a creative to override.</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Primary Text</label>
                <textarea rows={5} value={globalCopy.primaryText} onChange={(e) => setGlobalCopy({ ...globalCopy, primaryText: e.target.value })} className={`${inputCls} resize-y`} placeholder="Write your ad text..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Headline</label>
                  <input type="text" value={globalCopy.headline} onChange={(e) => setGlobalCopy({ ...globalCopy, headline: e.target.value })} className={inputCls} placeholder="Headline..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Description</label>
                  <input type="text" value={globalCopy.description} onChange={(e) => setGlobalCopy({ ...globalCopy, description: e.target.value })} className={inputCls} placeholder="Description..." />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">CTA Button</label>
                <select value={globalCopy.cta} onChange={(e) => setGlobalCopy({ ...globalCopy, cta: e.target.value })} className={inputCls}>
                  {CTA_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Upload area */}
          <div className="bg-white rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium">Upload Creatives</label>
              <div className="flex gap-1 bg-bg rounded-lg p-0.5">
                <button type="button" onClick={() => setCreativeType('single')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${creativeType === 'single' ? 'bg-white shadow-sm text-text' : 'text-text-secondary hover:text-text'}`}>
                  Single Ads
                </button>
                <button type="button" onClick={() => setCreativeType('carousel')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${creativeType === 'carousel' ? 'bg-white shadow-sm text-text' : 'text-text-secondary hover:text-text'}`}>
                  Carousel
                </button>
              </div>
            </div>
            {creativeType === 'carousel' && (
              <p className="text-xs text-text-secondary mb-3">Upload 2-10 images. They'll be combined into a single carousel ad.</p>
            )}
            <DropZone onFilesSelected={handleFilesSelected} />
          </div>
        </div>

        {/* ============ RIGHT COLUMN ============ */}
        <div className="space-y-5">

            {/* Creative list + launch button */}
            <div className="bg-white rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold">
                  {creativeType === 'carousel'
                    ? `Carousel — ${files.length} card${files.length !== 1 ? 's' : ''}`
                    : `${files.length} creative${files.length !== 1 ? 's' : ''}`}
                </h2>
                <button
                  onClick={handleLaunch}
                  disabled={files.length === 0}
                  className="px-5 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {'\uD83D\uDE80'} Launch Ads
                </button>
              </div>

              {files.length > 0 && creativeType === 'single' && (
                <div className="mb-3 px-3 py-2 bg-accent/5 rounded-lg text-xs text-text-secondary">
                  Usa <span className="font-medium text-text">Custom</span> per testo diverso su ogni creative.
                </div>
              )}
              {files.length > 0 && creativeType === 'carousel' && (
                <div className="mb-3 px-3 py-2 bg-accent/5 rounded-lg text-xs text-text-secondary">
                  Usa <span className="font-medium text-text">Custom</span> per headline/CTA diversi su ogni card.
                </div>
              )}

              {/* Bulk assign toolbar — visible when 2+ adsets and single mode */}
              {files.length > 0 && adSetsState.length > 1 && creativeType === 'single' && (
                <div className="mb-3 flex items-center gap-2 flex-wrap px-1">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedCreativeIds.size === files.length && files.length > 0}
                      ref={(el) => { if (el) el.indeterminate = selectedCreativeIds.size > 0 && selectedCreativeIds.size < files.length; }}
                      onChange={() => selectedCreativeIds.size === files.length ? deselectAllCreatives() : selectAllCreatives()}
                      className="w-3.5 h-3.5 rounded border-border text-accent focus:ring-accent/30 cursor-pointer"
                    />
                    <span className="text-xs text-text-secondary">
                      {selectedCreativeIds.size > 0 ? `${selectedCreativeIds.size} selected` : 'Select all'}
                    </span>
                  </label>

                  {selectedCreativeIds.size > 0 && (
                    <>
                      <span className="text-xs text-text-secondary">→</span>
                      <span className="text-xs font-medium text-text-secondary">Assign to:</span>
                      {adSetsState.map((as) => {
                        // Check if all selected creatives are assigned to this adset
                        const selectedFiles = files.filter((f) => selectedCreativeIds.has(f.id));
                        const allAssigned = selectedFiles.every((f) => {
                          const ids = f.adSetIds || ['__all__'];
                          return ids.includes('__all__') || ids.includes(as._id);
                        });
                        const noneAssigned = selectedFiles.every((f) => {
                          const ids = f.adSetIds || ['__all__'];
                          return !ids.includes('__all__') && !ids.includes(as._id);
                        });
                        return (
                          <button
                            key={as._id}
                            type="button"
                            onClick={() => {
                              setFiles((prev) => prev.map((f) => {
                                if (!selectedCreativeIds.has(f.id)) return f;
                                const ids = f.adSetIds || ['__all__'];
                                if (allAssigned) {
                                  // Remove this adset (but if was __all__, switch to all-except-this)
                                  if (ids.includes('__all__')) {
                                    const allOther = adSetsState.filter((a) => a._id !== as._id).map((a) => a._id);
                                    return { ...f, adSetIds: allOther.length > 0 ? allOther : ['__all__'] };
                                  }
                                  const without = ids.filter((id) => id !== as._id);
                                  return { ...f, adSetIds: without.length > 0 ? without : ['__all__'] };
                                } else {
                                  // Add this adset
                                  if (ids.includes('__all__')) return f; // already included
                                  const with_ = [...ids, as._id];
                                  if (with_.length >= adSetsState.length) return { ...f, adSetIds: ['__all__'] };
                                  return { ...f, adSetIds: with_ };
                                }
                              }));
                            }}
                            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                              allAssigned
                                ? 'border-accent bg-accent/10 text-accent'
                                : noneAssigned
                                  ? 'border-border bg-white text-text-secondary hover:border-accent hover:text-accent'
                                  : 'border-accent/40 bg-accent/5 text-accent/70'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: as._color }} />
                            {as.name || '(unnamed)'}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => handleBulkAssign(['__all__'])}
                        className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${
                          files.filter((f) => selectedCreativeIds.has(f.id)).every((f) => (f.adSetIds || ['__all__']).includes('__all__'))
                            ? 'border-accent bg-accent/10 text-accent'
                            : 'border-border bg-white text-text-secondary hover:border-accent hover:text-accent'
                        }`}
                      >
                        All
                      </button>
                    </>
                  )}
                </div>
              )}

              <div className="space-y-2">
                {files.length === 0 ? (
                  <div className="text-center py-12 text-text-secondary text-sm">
                    Upload creatives to see preview
                  </div>
                ) : (
                  files.map((creative, index) => (
                    <CreativeCard key={creative.id} creative={creative} index={index}
                      onToggleCustom={handleToggleCustom} onUpdateField={handleUpdateField} onRemove={handleRemove}
                      isCarousel={creativeType === 'carousel'} isFirst={index === 0} isLast={index === files.length - 1} onMove={handleMove}
                      globalCopy={globalCopy} adSets={adSetsState} onAdSetAssignment={handleAdSetAssignment}
                      isSelected={selectedCreativeIds.has(creative.id)}
                      onToggleSelect={adSetsState.length > 1 && creativeType === 'single' ? toggleCreativeSelection : undefined} />
                  ))
                )}
              </div>
            </div>

            {/* Ad Preview */}
            {files.length > 0 && (
              <div className="bg-white rounded-xl border border-border p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold">Anteprima</h2>
                  {/* Creative selector for single ads */}
                  {creativeType === 'single' && files.length > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPreviewIndex(Math.max(0, previewIndex - 1))}
                        disabled={previewIndex === 0}
                        className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-bg disabled:opacity-30 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                      </button>
                      <span className="text-xs text-text-secondary font-medium min-w-[3ch] text-center">{previewIndex + 1}/{files.length}</span>
                      <button
                        type="button"
                        onClick={() => setPreviewIndex(Math.min(files.length - 1, previewIndex + 1))}
                        disabled={previewIndex >= files.length - 1}
                        className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-bg disabled:opacity-30 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </div>
                  )}
                </div>
                {(() => {
                  const idx = creativeType === 'single' ? Math.min(previewIndex, files.length - 1) : 0;
                  const previewFile = files[idx];
                  return (
                    <AdPreview
                      file={creativeType !== 'carousel' ? previewFile?.file : undefined}
                      files={creativeType === 'carousel' ? files.map((f) => f.file) : undefined}
                      isCarousel={creativeType === 'carousel'}
                      cards={creativeType === 'carousel' ? files.map((f) => ({
                        file: f.file,
                        headline: (f.useCustomCopy && f.headline) ? f.headline : globalCopy.headline,
                        description: (f.useCustomCopy && f.description) ? f.description : globalCopy.description,
                        cta: (f.useCustomCopy && f.cta) ? f.cta : globalCopy.cta,
                      })) : undefined}
                      primaryText={(previewFile?.useCustomCopy && previewFile.primaryText) ? previewFile.primaryText : globalCopy.primaryText}
                      headline={(previewFile?.useCustomCopy && previewFile.headline) ? previewFile.headline : globalCopy.headline}
                      description={(previewFile?.useCustomCopy && previewFile.description) ? previewFile.description : globalCopy.description}
                      cta={(previewFile?.useCustomCopy && previewFile.cta) ? previewFile.cta : globalCopy.cta}
                      pageName={pages.find((p) => p.id === selectedPage)?.name || 'Your Page'}
                      websiteUrl={websiteUrl}
                    />
                  );
                })()}
              </div>
            )}
        </div>
      </div>

      {/* Launch Modal */}
      <Modal open={showLaunchModal} onClose={() => setShowLaunchModal(false)} title="Launch Ads" maxWidth="max-w-lg">
        <div className="space-y-4">
          <div className="bg-bg rounded-lg p-4 space-y-2 text-sm">
            {mode === 'new' ? (
              <>
                <div className="flex justify-between"><span className="text-text-secondary">Campaign (new)</span><span className="font-medium">{campaignName}</span></div>
                <div className="flex justify-between"><span className="text-text-secondary">Objective</span><span className="font-medium">{CAMPAIGN_OBJECTIVES.find((o) => o.value === objective)?.label}</span></div>
                <div className="flex justify-between"><span className="text-text-secondary">Bid Strategy</span><span className="font-medium">{BID_STRATEGIES.find((b) => b.value === bidStrategy)?.label}</span></div>
              </>
            ) : (
              <div className="flex justify-between"><span className="text-text-secondary">Campaign</span><span className="font-medium">{campaigns.find((c) => c.id === selectedCampaign)?.name}</span></div>
            )}

            <hr className="border-border" />

            {/* Per-adset summary */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-text-secondary">Ad Sets ({adSetsState.length})</span>
              {adSetsState.map((as) => {
                const assignedCount = creativeType === 'carousel'
                  ? files.length
                  : files.filter((f) => {
                      const ids = f.adSetIds || ['__all__'];
                      return ids.includes('__all__') || ids.includes(as._id);
                    }).length;
                return (
                  <div key={as._id} className="flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: as._color }} />
                    <span className="font-medium flex-1 truncate">{as.name || '(unnamed)'}</span>
                    {as._type === 'existing' && <span className="text-text-secondary">existing</span>}
                    {as._type !== 'existing' && !isCBO && <span className="text-text-secondary">${Number(as.dailyBudget || 0).toFixed(2)}/day</span>}
                    <span className="text-text-secondary">{assignedCount} creative{assignedCount !== 1 ? 's' : ''}</span>
                  </div>
                );
              })}
            </div>

            <hr className="border-border" />
            <div className="flex justify-between"><span className="text-text-secondary">Type</span><span className="font-medium">{creativeType === 'carousel' ? 'Carousel' : 'Single Ads'}</span></div>
            <div className="flex justify-between"><span className="text-text-secondary">Creatives</span><span className="font-medium">{files.length}</span></div>
            {(() => {
              // Count total ads to be created
              let totalAds = 0;
              if (creativeType === 'carousel') {
                totalAds = adSetsState.length;
              } else {
                for (const f of files) {
                  const ids = f.adSetIds || ['__all__'];
                  totalAds += ids.includes('__all__') ? adSetsState.length : ids.filter((id) => adSetsState.some((as) => as._id === id)).length;
                }
              }
              return (
                <div className="flex justify-between font-medium">
                  <span className="text-text-secondary">Total ads</span>
                  <span className="text-accent">{totalAds}</span>
                </div>
              );
            })()}
            <div className="flex justify-between"><span className="text-text-secondary">Page</span><span className="font-medium">{pages.find((p) => p.id === selectedPage)?.name || selectedPage}</span></div>
          </div>

          <Select label="Ad Status" value={adStatus} onChange={setAdStatus} options={[{ value: 'PAUSED', label: 'Paused' }, { value: 'ACTIVE', label: 'Active' }]} />

          <div className="bg-danger/10 text-danger text-xs font-medium px-3 py-2 rounded-lg text-center">
            All Advantage+ Enhancements: OFF
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={() => setShowLaunchModal(false)} className="flex-1 px-4 py-2 border border-border rounded-lg text-sm hover:bg-bg transition-colors">Cancel</button>
            <button onClick={confirmLaunch} className="flex-1 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors">
              {'\uD83D\uDE80'} Confirm Launch
            </button>
          </div>
        </div>
      </Modal>

      {/* Background launch progress bars */}
      {/* Background launch progress bars */}
      {bgLaunches.filter((l) => l.status === 'running' || l.status === 'error').map((launch, i) => (
        <div key={launch.id} className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 w-80 border border-border z-50" style={{ bottom: `${1 + i * 5.5}rem` }}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium truncate flex-1">{launch.name}</p>
            {launch.status === 'error' && (
              <button onClick={() => setBgLaunches((prev) => prev.filter((l) => l.id !== launch.id))} className="ml-2 text-text-secondary hover:text-text flex-shrink-0">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
          <p className={`text-xs truncate ${launch.status === 'error' ? 'text-danger' : 'text-text-secondary'}`}>{launch.step}</p>
          {launch.status === 'running' && (
            <div className="w-full bg-bg rounded-full h-2 mt-2">
              <div className="bg-accent h-2 rounded-full transition-all duration-300" style={{ width: `${launch.pct || 2}%` }} />
            </div>
          )}
        </div>
      ))}

      {/* API Log Panel */}
      <div className="mt-6 bg-white rounded-xl border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => setShowLog(!showLog)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-bg/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-sm font-semibold">API Log</span>
            {logEntries.filter((e) => e.type === 'error').length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-danger text-white rounded-full">
                {logEntries.filter((e) => e.type === 'error').length}
              </span>
            )}
          </div>
          <svg className={`w-4 h-4 text-text-secondary transition-transform ${showLog ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showLog && (
          <div className="border-t border-border">
            <div className="flex items-center justify-between px-5 py-2 bg-bg/30">
              <span className="text-xs text-text-secondary">{logEntries.length} entries</span>
              <button
                type="button"
                onClick={() => { getApiLog().length = 0; setLogEntries([]); }}
                className="text-xs text-text-secondary hover:text-danger transition-colors"
              >
                Cancella log
              </button>
            </div>
            <div className="max-h-[400px] overflow-y-auto font-mono text-xs divide-y divide-border/30">
              {logEntries.length === 0 ? (
                <div className="px-5 py-8 text-center text-text-secondary text-xs">Nessun log — le chiamate API appariranno qui</div>
              ) : (
                logEntries.map((entry, i) => (
                  <div key={i} className={`px-5 py-2 ${entry.type === 'error' ? 'bg-danger/5' : ''}`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${entry.type === 'error' ? 'bg-danger' : 'bg-success'}`} />
                      <span className="text-text-secondary">{entry.ts}</span>
                      <span className="font-semibold">{entry.method}</span>
                      <span className="truncate flex-1">{entry.endpoint}</span>
                      {entry.status && <span className={`flex-shrink-0 ${entry.type === 'error' ? 'text-danger font-bold' : 'text-success'}`}>{entry.status}</span>}
                    </div>
                    {entry.errorMsg && (
                      <p className="mt-1 text-danger pl-4 break-all">{entry.errorMsg}</p>
                    )}
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

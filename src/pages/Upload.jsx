import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import DropZone from '../components/DropZone';
import CreativeCard from '../components/CreativeCard';
import AdPreview from '../components/AdPreview';
import Modal from '../components/Modal';
import Select from '../components/Select';
import { CAMPAIGN_OBJECTIVES, OPTIMIZATION_GOALS, CTA_OPTIONS, ACCEPTED_IMAGE_TYPES, BID_STRATEGIES, CONVERSION_EVENTS, ATTRIBUTION_SETTINGS, DSA_COUNTRIES, buildDegreesOfFreedomSpec } from '../utils/constants';
import CountryPicker from '../components/CountryPicker';
import RegionPicker from '../components/RegionPicker';
import DateTimePicker from '../components/DateTimePicker';
import PagePicker from '../components/PagePicker';
import * as api from '../utils/metaApi';
import { getApiLog, onApiLogChange } from '../utils/metaApi';

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

  // Existing campaign/adset
  const [campaigns, setCampaigns] = useState([]);
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [adSets, setAdSets] = useState([]);
  const [selectedAdSet, setSelectedAdSet] = useState('');
  const [newAdSetMode, setNewAdSetMode] = useState(false);

  // Campaign fields
  const [campaignName, setCampaignName] = useState(s.campaignName || '');
  const [objective, setObjective] = useState(s.objective || 'OUTCOME_TRAFFIC');
  const [budgetType, setBudgetType] = useState(s.budgetType || 'ABO');
  const [bidStrategy, setBidStrategy] = useState(s.bidStrategy || 'LOWEST_COST_WITHOUT_CAP');

  // Ad set fields
  const [adSetName, setAdSetName] = useState(s.adSetName || '');
  const [dailyBudget, setDailyBudget] = useState(s.dailyBudget || '20');
  const [optimizationGoal, setOptimizationGoal] = useState(s.optimizationGoal || 'LINK_CLICKS');
  const [countries, setCountries] = useState(Array.isArray(s.countries) ? s.countries : ['IT']);
  const [excludedCountries, setExcludedCountries] = useState(Array.isArray(s.excludedCountries) ? s.excludedCountries : []);
  const [excludedRegions, setExcludedRegions] = useState(Array.isArray(s.excludedRegions) ? s.excludedRegions : []);
  const [showExclusions, setShowExclusions] = useState(s.showExclusions || false);
  const [ageMin, setAgeMin] = useState(s.ageMin || '18');
  const [ageMax, setAgeMax] = useState(s.ageMax || '65');
  const [gender, setGender] = useState(s.gender || 'all');
  const [startDate, setStartDate] = useState(s.startDate || '');

  // Pixel + Conversion
  const [pixels, setPixels] = useState([]);
  const [selectedPixel, setSelectedPixel] = useState(s.selectedPixel || '');
  const [conversionEvent, setConversionEvent] = useState(s.conversionEvent || 'PURCHASE');
  const [bidAmount, setBidAmount] = useState(s.bidAmount || '');
  const [attributionSetting, setAttributionSetting] = useState(s.attributionSetting || '7d_click_1d_view');

  // Spend limits
  const [dailyMinSpend, setDailyMinSpend] = useState(s.dailyMinSpend || '');
  const [dailySpendCap, setDailySpendCap] = useState(s.dailySpendCap || '');
  const [budgetSharing, setBudgetSharing] = useState(s.budgetSharing ?? false);
  const [dsaBeneficiary, setDsaBeneficiary] = useState(s.dsaBeneficiary || '');
  const [dsaPayor, setDsaPayor] = useState(s.dsaPayor || '');

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
  const [presetName, setPresetName] = useState('');
  const [showSavePreset, setShowSavePreset] = useState(false);

  const savePreset = (name) => {
    if (!name.trim()) return;
    const preset = { name: name.trim(), countries, excludedCountries, excludedRegions };
    const updated = [...countryPresets.filter((p) => p.name !== name.trim()), preset];
    setCountryPresets(updated);
    localStorage.setItem(PRESETS_KEY, JSON.stringify(updated));
    setPresetName('');
    setShowSavePreset(false);
    addToast(`Preset "${name.trim()}" salvato`);
  };

  const loadPreset = (preset) => {
    setCountries(preset.countries || []);
    setExcludedCountries(preset.excludedCountries || []);
    setExcludedRegions(preset.excludedRegions || []);
    const hasExclusions = (preset.excludedCountries?.length > 0) || (preset.excludedRegions?.length > 0);
    setShowExclusions(hasExclusions);
  };

  const deletePreset = (name) => {
    const updated = countryPresets.filter((p) => p.name !== name);
    setCountryPresets(updated);
    localStorage.setItem(PRESETS_KEY, JSON.stringify(updated));
  };

  const needsBidAmount = bidStrategy === 'BID_CAP' || bidStrategy === 'COST_CAP';
  const needsDsa = countries.some((c) => DSA_COUNTRIES.has(c));
  const needsRoas = bidStrategy === 'LOWEST_COST_WITH_MIN_ROAS';

  // ---- Save form state to sessionStorage ----
  useEffect(() => {
    sessionStorage.setItem(FORM_KEY, JSON.stringify({
      mode, creativeType, campaignName, objective, budgetType, bidStrategy,
      adSetName, dailyBudget, optimizationGoal, countries, excludedCountries, excludedRegions, showExclusions, ageMin, ageMax, gender, startDate,
      selectedPixel, conversionEvent, bidAmount, attributionSetting,
      dailyMinSpend, dailySpendCap, budgetSharing, dsaBeneficiary, dsaPayor,
      selectedPage, selectedIgAccount, websiteUrl, globalCopy, adStatus,
    }));
  }, [mode, creativeType, campaignName, objective, budgetType, bidStrategy,
    adSetName, dailyBudget, optimizationGoal, countries, excludedCountries, excludedRegions, showExclusions, ageMin, ageMax, gender, startDate,
    selectedPixel, conversionEvent, bidAmount, attributionSetting,
    dailyMinSpend, dailySpendCap, budgetSharing, dsaBeneficiary, dsaPayor,
    selectedPage, selectedIgAccount, websiteUrl, globalCopy, adStatus]);

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
        if (data.length > 0 && !selectedPixel) setSelectedPixel(data[0].id);
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

  // ---- API: Load adsets ----
  useEffect(() => {
    if (!selectedCampaign) { setAdSets([]); return; }
    api.getAdSets(settings.accessToken, selectedCampaign)
      .then(setAdSets)
      .catch(() => {});
  }, [selectedCampaign, settings.accessToken]);

  // ---- Detect CBO from selected campaign ----
  const selectedCampaignObj = campaigns.find((c) => c.id === selectedCampaign);
  const isCBO = !!(selectedCampaignObj?.daily_budget || selectedCampaignObj?.lifetime_budget);

  // ---- Pre-fill new ad set form from existing ad sets ----
  useEffect(() => {
    if (!adSets.length || mode !== 'existing') return;
    const ref = adSets.find((a) => a.status === 'ACTIVE') || adSets[0];
    if (ref.optimization_goal) setOptimizationGoal(ref.optimization_goal);
    if (ref.promoted_object?.pixel_id) setSelectedPixel(ref.promoted_object.pixel_id);
    if (ref.promoted_object?.custom_event_type) setConversionEvent(ref.promoted_object.custom_event_type);
  }, [adSets, mode]);

  // ---- Handlers ----
  const handleFilesSelected = useCallback((newFiles) => {
    const creatives = newFiles.map((file) => ({
      id: nextId++,
      file,
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
      if (!adSetName.trim()) { addToast('Enter an ad set name', 'error'); return; }
    } else {
      if (!selectedCampaign) { addToast('Select a campaign', 'error'); return; }
      if (selectedAdSet === '__new__') {
        if (!adSetName.trim()) { addToast('Enter a name for the new ad set', 'error'); return; }
      } else if (!selectedAdSet) { addToast('Select an ad set', 'error'); return; }
    }
    if (files.length === 0) { addToast('Upload at least one creative', 'error'); return; }
    if (!websiteUrl.trim()) { addToast('Enter a website URL', 'error'); return; }
    if (!selectedPage) { addToast('Select or enter a Facebook Page ID', 'error'); return; }
    if (creativeType === 'carousel' && files.length < 2) { addToast('Carousel needs at least 2 images', 'error'); return; }
    if (mode === 'new' || selectedAdSet === '__new__') {
      const budget = Number(dailyBudget);
      if (!budget || budget <= 0) { addToast('Daily budget must be greater than 0', 'error'); return; }
      if (Number(ageMin) > Number(ageMax)) { addToast('Min age cannot be greater than max age', 'error'); return; }
      if (needsBidAmount && (!bidAmount || Number(bidAmount) <= 0)) { addToast('Enter a valid bid amount for the selected bid strategy', 'error'); return; }
      if (needsRoas && (!bidAmount || Number(bidAmount) <= 0)) { addToast('Enter a valid ROAS target', 'error'); return; }
      if (needsDsa && (!dsaBeneficiary.trim() || !dsaPayor.trim())) { addToast('DSA beneficiary and payor are required for EU targeting', 'error'); return; }
    }
    setShowLaunchModal(true);
  };

  const confirmLaunch = () => {
    // --- Snapshot ALL form values before closing the modal ---
    const snap = {
      files: files.map((f) => ({ ...f })),
      mode,
      creativeType,
      campaignName,
      selectedCampaign,
      selectedCampaignObj: campaigns.find((c) => c.id === selectedCampaign),
      selectedAdSet,
      adSetName,
      dailyBudget,
      objective,
      adStatus,
      budgetType,
      bidStrategy,
      budgetSharing,
      optimizationGoal,
      countries: [...countries],
      excludedCountries: [...excludedCountries],
      excludedRegions: [...excludedRegions],
      ageMin,
      ageMax,
      gender,
      startDate,
      selectedPixel,
      conversionEvent,
      bidAmount,
      attributionSetting,
      dailyMinSpend,
      dailySpendCap,
      needsBidAmount,
      needsDsa,
      dsaBeneficiary,
      dsaPayor,
      pageId: selectedPage,
      // Don't pass page-backed IG IDs — they're not valid as instagram_actor_id
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

    // Run launch in background (async IIFE)
    (async () => {
      const total = snap.files.length;
      let campaignId, adSetId;
      const results = [];

      try {
        if (snap.mode === 'new') {
          const budgetCents = String(Math.round(Number(snap.dailyBudget) * 100));
          const bidAmountCents = snap.bidAmount ? String(Math.round(Number(snap.bidAmount) * 100)) : undefined;
          const minSpendCents = snap.dailyMinSpend ? String(Math.round(Number(snap.dailyMinSpend) * 100)) : undefined;
          const spendCapCents = snap.dailySpendCap ? String(Math.round(Number(snap.dailySpendCap) * 100)) : undefined;

          updateLaunch({ step: 'Creating campaign...', pct: 3 });
          const camp = await api.createCampaign(snap.accessToken, snap.adAccountId, {
            name: snap.campaignName, objective: snap.objective, status: snap.adStatus, budgetType: snap.budgetType,
            dailyBudget: budgetCents, bidStrategy: snap.bidStrategy, budgetSharing: snap.budgetSharing,
          });
          campaignId = camp.id;

          updateLaunch({ step: 'Creating ad set...', pct: 5 });
          const aset = await api.createAdSet(snap.accessToken, snap.adAccountId, {
            name: snap.adSetName, campaignId, dailyBudget: budgetCents, optimizationGoal: snap.optimizationGoal,
            billingEvent: 'IMPRESSIONS',
            countries: snap.countries, excludedCountries: snap.excludedCountries, excludedRegions: snap.excludedRegions,
            ageMin: snap.ageMin, ageMax: snap.ageMax, gender: snap.gender, status: snap.adStatus,
            startTime: snap.startDate || undefined,
            budgetType: snap.budgetType, bidStrategy: snap.bidStrategy, budgetSharing: snap.budgetSharing,
            pixelId: snap.selectedPixel || undefined,
            conversionEvent: snap.selectedPixel ? snap.conversionEvent : undefined,
            bidAmount: snap.needsBidAmount ? bidAmountCents : undefined,
            attributionSetting: snap.selectedPixel ? snap.attributionSetting : undefined,
            dailyMinSpend: minSpendCents, dailySpendCap: spendCapCents,
            dsaBeneficiary: snap.needsDsa ? (snap.dsaBeneficiary || snap.pages.find((p) => p.id === snap.pageId)?.name || snap.pageId) : undefined,
            dsaPayor: snap.needsDsa ? (snap.dsaPayor || snap.pages.find((p) => p.id === snap.pageId)?.name || snap.pageId) : undefined,
          });
          adSetId = aset.id;
        } else if (snap.selectedAdSet === '__new__') {
          campaignId = snap.selectedCampaign;
          const snapIsCBO = !!(snap.selectedCampaignObj?.daily_budget || snap.selectedCampaignObj?.lifetime_budget);
          const budgetCents = !snapIsCBO ? String(Math.round(Number(snap.dailyBudget) * 100)) : undefined;
          const bidAmountCents = snap.bidAmount ? String(Math.round(Number(snap.bidAmount) * 100)) : undefined;
          const minSpendCents = (!snapIsCBO && snap.dailyMinSpend) ? String(Math.round(Number(snap.dailyMinSpend) * 100)) : undefined;
          const spendCapCents = (!snapIsCBO && snap.dailySpendCap) ? String(Math.round(Number(snap.dailySpendCap) * 100)) : undefined;

          updateLaunch({ step: 'Creating new ad set...', pct: 5 });
          const aset = await api.createAdSet(snap.accessToken, snap.adAccountId, {
            name: snap.adSetName, campaignId, dailyBudget: budgetCents, optimizationGoal: snap.optimizationGoal,
            billingEvent: 'IMPRESSIONS',
            countries: snap.countries, excludedCountries: snap.excludedCountries, excludedRegions: snap.excludedRegions,
            ageMin: snap.ageMin, ageMax: snap.ageMax, gender: snap.gender, status: snap.adStatus,
            startTime: snap.startDate || undefined,
            budgetType: snapIsCBO ? 'CBO' : 'ABO',
            bidStrategy: snap.selectedCampaignObj?.bid_strategy || 'LOWEST_COST_WITHOUT_CAP',
            pixelId: snap.selectedPixel || undefined,
            conversionEvent: snap.selectedPixel ? snap.conversionEvent : undefined,
            bidAmount: snap.needsBidAmount ? bidAmountCents : undefined,
            attributionSetting: snap.selectedPixel ? snap.attributionSetting : undefined,
            dailyMinSpend: minSpendCents, dailySpendCap: spendCapCents,
            dsaBeneficiary: snap.needsDsa ? (snap.dsaBeneficiary || snap.pages.find((p) => p.id === snap.pageId)?.name || snap.pageId) : undefined,
            dsaPayor: snap.needsDsa ? (snap.dsaPayor || snap.pages.find((p) => p.id === snap.pageId)?.name || snap.pageId) : undefined,
          });
          adSetId = aset.id;
        } else {
          campaignId = snap.selectedCampaign;
          adSetId = snap.selectedAdSet;
        }

        if (snap.creativeType === 'carousel') {
          // Progress: upload 0-70%, creative 70-90%, ad 90-100%
          updateLaunch({ step: 'Uploading carousel images...', pct: 2 });
          let uploadCount = 0;
          const carouselFileProgress = new Array(snap.files.length).fill(0);
          const updateCarouselPct = () => {
            const avg = carouselFileProgress.reduce((a, b) => a + b, 0) / snap.files.length;
            updateLaunch({ pct: Math.round(avg * 70) });
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
            updateLaunch({ step: `Uploaded ${uploadCount}/${total}`, pct: Math.round((uploadCount / total) * 70) });
            return { upload, copy, isImage };
          }));

          const cards = uploads.map(({ upload, copy }) => ({
            imageHash: upload.hash, headline: copy.headline, description: copy.description,
            linkUrl: copy.linkUrl, cta: copy.cta,
          }));

          updateLaunch({ step: 'Creating carousel creative...', pct: 75 });
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

          const ad = await api.createAd(snap.accessToken, snap.adAccountId, {
            name: 'Ad - Carousel', adSetId, creativeId: creativeResult.id, status: snap.adStatus,
          });
          results.push({ fileName: 'Carousel', adId: ad.id, creativeId: creativeResult.id });
        } else {
          // Progress: upload 0-50%, thumbnails 50-60%, ads 60-100%
          updateLaunch({ step: 'Uploading creatives...', pct: 2 });
          let uploadCount = 0;
          // Track per-file progress for smooth bar (especially for large videos)
          const fileProgress = new Array(snap.files.length).fill(0);
          const updateUploadPct = () => {
            const avg = fileProgress.reduce((a, b) => a + b, 0) / snap.files.length;
            updateLaunch({ pct: Math.round(avg * 50) });
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
            updateLaunch({ step: `Uploaded ${uploadCount}/${total}`, pct: Math.round((uploadCount / total) * 50) });
            return { creative, upload, isImage };
          }));

          const videoUploads = uploads.filter((u) => !u.isImage);
          if (videoUploads.length > 0) {
            updateLaunch({ step: `Processing ${videoUploads.length} video thumbnail${videoUploads.length > 1 ? 's' : ''}...`, pct: 55 });
            await Promise.all(videoUploads.map(async (u) => {
              u.thumbnailUrl = await api.getVideoThumbnail(snap.accessToken, u.upload.id);
            }));
          }

          updateLaunch({ step: 'Creating ads...', pct: 60 });
          let adCount = 0;
          const adResults = await Promise.all(uploads.map(async (u) => {
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
            const ad = await api.createAd(snap.accessToken, snap.adAccountId, {
              name: `Ad - ${u.creative.file.name}`, adSetId, creativeId: creativeResult.id, status: snap.adStatus,
            });
            adCount++;
            updateLaunch({ step: `Creating ads... ${adCount}/${total}`, pct: 60 + Math.round((adCount / total) * 40) });
            return { fileName: u.creative.file.name, adId: ad.id, creativeId: creativeResult.id };
          }));
          results.push(...adResults);
        }

        addHistory({ campaignId, adSetId, campaignName: launchName, adsCount: results.length, status: snap.adStatus, results });
        addCreatives(snap.files.map((f) => ({ name: f.file.name, size: f.file.size, type: f.file.type, date: new Date().toISOString() })));
        addToast(`${results.length} ad${results.length !== 1 ? 's' : ''} launched successfully!`);
        // Remove from bgLaunches after a brief delay so user sees the toast
        setTimeout(() => setBgLaunches((prev) => prev.filter((l) => l.id !== launchId)), 1000);
      } catch (err) {
        addToast(`Launch failed: ${err.message}`, 'error');
        updateLaunch({ status: 'error', step: err.message });
        // Auto-remove error after 5s
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

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Daily Budget ($) — {budgetType === 'CBO' ? 'Campaign level' : 'Ad Set level'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-secondary">$</span>
                    <input type="number" step="0.01" min="1" value={dailyBudget} onChange={(e) => setDailyBudget(e.target.value)} className={`${inputCls} pl-7`} />
                  </div>
                </div>

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

                {needsBidAmount && (
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      {bidStrategy === 'COST_CAP' ? 'Cost Cap ($)' : 'Bid Cap ($)'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-secondary">$</span>
                      <input type="number" step="0.01" min="0.01" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} className={`${inputCls} pl-7`} placeholder="5.00" />
                    </div>
                  </div>
                )}
                {needsRoas && (
                  <div>
                    <label className="block text-xs font-medium text-text-secondary mb-1">Minimum ROAS</label>
                    <input type="number" step="0.01" min="0.01" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} className={inputCls} placeholder="2.00" />
                  </div>
                )}
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Campaign</label>
                  <select value={selectedCampaign} onChange={(e) => { setSelectedCampaign(e.target.value); setSelectedAdSet(''); setNewAdSetMode(false); }} className={inputCls}>
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
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Ad Set</label>
                  <select value={selectedAdSet} onChange={(e) => {
                    const val = e.target.value;
                    setSelectedAdSet(val);
                    setNewAdSetMode(val === '__new__');
                  }} className={inputCls}>
                    <option value="">Select an ad set...</option>
                    {(() => {
                      const sorted = [...adSets].sort((a, b) => (a.status === 'ACTIVE' ? 0 : 1) - (b.status === 'ACTIVE' ? 0 : 1));
                      const firstInactiveIdx = sorted.findIndex((a) => a.status !== 'ACTIVE');
                      return sorted.map((a, i) => (
                        <React.Fragment key={a.id}>
                          {i === firstInactiveIdx && firstInactiveIdx > 0 && <option disabled>{'─'.repeat(30)}</option>}
                          <option value={a.id}>{a.name} — {a.status}</option>
                        </React.Fragment>
                      ));
                    })()}
                    <option value="__new__">+ Create new ad set</option>
                  </select>
                </div>
                {newAdSetMode && (
                  <div className="bg-accent/5 rounded-lg p-4 space-y-3 border border-accent/20">
                    <h3 className="text-xs font-semibold text-accent">New Ad Set {isCBO && <span className="font-normal text-text-secondary">(CBO — budget at campaign level)</span>}</h3>
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">Ad Set Name</label>
                      <input type="text" value={adSetName} onChange={(e) => setAdSetName(e.target.value)} className={inputCls} placeholder="es. Italy 18-65 All" />
                    </div>

                    {!isCBO && (
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">Daily Budget ($)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-secondary">$</span>
                          <input type="number" step="0.01" min="1" value={dailyBudget} onChange={(e) => setDailyBudget(e.target.value)} className={`${inputCls} pl-7`} />
                        </div>
                      </div>
                    )}

                    <Select label="Optimization Goal" value={optimizationGoal} onChange={setOptimizationGoal} options={OPTIMIZATION_GOALS} />

                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">Dataset (Pixel)</label>
                      <select value={selectedPixel} onChange={(e) => setSelectedPixel(e.target.value)} className={inputCls}>
                        <option value="">No pixel</option>
                        {pixels.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
                      </select>
                    </div>
                    {selectedPixel && (
                      <Select label="Conversion Event" value={conversionEvent} onChange={setConversionEvent} options={CONVERSION_EVENTS} />
                    )}

                    <Select label="Attribution Model" value={attributionSetting} onChange={setAttributionSetting} options={ATTRIBUTION_SETTINGS} />

                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">Data di inizio</label>
                      <DateTimePicker value={startDate} onChange={setStartDate} placeholder="Inizia subito" />
                      <p className="text-xs text-text-secondary mt-1">Lascia vuoto per iniziare subito</p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1">Countries & Regions</label>
                      <CountryPicker selected={countries} onChange={setCountries} />

                      <button
                        type="button"
                        onClick={() => {
                          const next = !showExclusions;
                          setShowExclusions(next);
                          if (!next) { setExcludedCountries([]); setExcludedRegions([]); }
                        }}
                        className={`mt-2 flex items-center gap-1.5 text-xs font-medium transition-colors ${showExclusions ? 'text-danger' : 'text-text-secondary hover:text-danger'}`}
                      >
                        <svg className={`w-3.5 h-3.5 transition-transform duration-150 ${showExclusions ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        {showExclusions ? 'Esclusioni attive' : 'Aggiungi esclusioni'}
                      </button>
                      {showExclusions && (
                        <div className="mt-2 space-y-2 pl-3 border-l-2 border-danger/20">
                          <div>
                            <span className="text-xs text-danger font-medium mb-1 block">Escludi stati</span>
                            <CountryPicker selected={excludedCountries} onChange={setExcludedCountries} />
                          </div>
                          <div>
                            <span className="text-xs text-danger font-medium mb-1 block">Escludi regioni</span>
                            <RegionPicker selected={excludedRegions} onChange={setExcludedRegions} accessToken={settings.accessToken} countries={countries} />
                          </div>
                        </div>
                      )}
                    </div>

                    {needsDsa && (
                      <div className="bg-white/60 rounded-lg p-3 space-y-2.5">
                        <div className="flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-accent flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs font-medium text-accent">EU Digital Services Act (DSA)</span>
                        </div>
                        <div>
                          <label className="block text-xs text-text-secondary mb-1">Beneficiary</label>
                          <input type="text" value={dsaBeneficiary} onChange={(e) => setDsaBeneficiary(e.target.value)} className={inputCls} placeholder="Name of the person or organization..." />
                        </div>
                        <div>
                          <label className="block text-xs text-text-secondary mb-1">Payor</label>
                          <input type="text" value={dsaPayor} onChange={(e) => setDsaPayor(e.target.value)} className={inputCls} placeholder="Who is paying for these ads..." />
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">Age Min</label>
                        <input type="number" min="13" max="65" value={ageMin} onChange={(e) => setAgeMin(e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1">Age Max</label>
                        <input type="number" min="13" max="65" value={ageMax} onChange={(e) => setAgeMax(e.target.value)} className={inputCls} />
                      </div>
                      <Select label="Gender" value={gender} onChange={setGender} options={[{ value: 'all', label: 'All' }, { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} />
                    </div>

                    {!isCBO && (
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-2">Ad Set Spend Limits</label>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-text-secondary mb-1">Daily Min Spend ($)</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-secondary">$</span>
                              <input type="number" step="0.01" min="0" value={dailyMinSpend} onChange={(e) => setDailyMinSpend(e.target.value)} className={`${inputCls} pl-7`} placeholder="0.00" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-text-secondary mb-1">Daily Spend Cap ($)</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-secondary">$</span>
                              <input type="number" step="0.01" min="0" value={dailySpendCap} onChange={(e) => setDailySpendCap(e.target.value)} className={`${inputCls} pl-7`} placeholder="0.00" />
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-text-secondary mt-1">Leave empty for no limits</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Ad Set config */}
          {mode === 'new' && (
            <div className="bg-white rounded-xl border border-border p-5 space-y-4">
              <h2 className="text-sm font-semibold">Ad Set</h2>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Ad Set Name</label>
                <input type="text" value={adSetName} onChange={(e) => setAdSetName(e.target.value)} className={inputCls} placeholder="es. Italy 18-65 All" />
              </div>

              <Select label="Optimization Goal" value={optimizationGoal} onChange={setOptimizationGoal} options={OPTIMIZATION_GOALS} />

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Dataset (Pixel)</label>
                <select value={selectedPixel} onChange={(e) => setSelectedPixel(e.target.value)} className={inputCls}>
                  <option value="">No pixel</option>
                  {pixels.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
                </select>
              </div>

              {selectedPixel && (
                <Select label="Conversion Event" value={conversionEvent} onChange={setConversionEvent} options={CONVERSION_EVENTS} />
              )}

              <Select label="Attribution Model" value={attributionSetting} onChange={setAttributionSetting} options={ATTRIBUTION_SETTINGS} />

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Data di inizio</label>
                <DateTimePicker value={startDate} onChange={setStartDate} placeholder="Inizia subito" />
                <p className="text-xs text-text-secondary mt-1">Lascia vuoto per iniziare subito</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">Countries & Regions</label>

                {/* Preset bar */}
                <div className="flex items-center flex-wrap gap-1.5 mb-2">
                  {countryPresets.map((p) => (
                    <div key={p.name} className="group relative">
                      <button
                        type="button"
                        onClick={() => loadPreset(p)}
                        className="px-3 py-1.5 text-xs font-medium bg-accent/10 text-accent rounded-lg hover:bg-accent hover:text-white hover:shadow-md hover:scale-[1.04] transition-all duration-150 cursor-pointer"
                      >
                        {p.name}
                      </button>
                      {/* Delete badge — only visible on hover */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); deletePreset(p.name); }}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-danger text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-150 shadow-sm"
                        title="Elimina preset"
                      >
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      {/* Tooltip on hover */}
                      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <div className="bg-gray-900 text-white text-[10px] leading-relaxed rounded-lg px-3 py-2 shadow-lg whitespace-nowrap">
                          <div><span className="text-gray-400">Include:</span> {p.countries?.join(', ') || 'nessuno'}</div>
                          {p.excludedCountries?.length > 0 && (
                            <div><span className="text-gray-400">Esclusi:</span> {p.excludedCountries.join(', ')}</div>
                          )}
                          {p.excludedRegions?.length > 0 && (
                            <div><span className="text-gray-400">Regioni escluse:</span> {p.excludedRegions.map((r) => r.name).join(', ')}</div>
                          )}
                          <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                        </div>
                      </div>
                    </div>
                  ))}
                  {!showSavePreset ? (
                    <button
                      type="button"
                      onClick={() => setShowSavePreset(true)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-text-secondary hover:text-accent border border-dashed border-border hover:border-accent rounded-lg transition-all duration-150 whitespace-nowrap"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Salva preset
                    </button>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={presetName}
                        onChange={(e) => setPresetName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && savePreset(presetName)}
                        placeholder="Nome..."
                        className="w-24 border border-border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-accent/30"
                        autoFocus
                      />
                      <button type="button" onClick={() => savePreset(presetName)} className="px-2 py-1 text-xs font-medium text-accent hover:text-accent-hover">
                        Salva
                      </button>
                      <button type="button" onClick={() => { setShowSavePreset(false); setPresetName(''); }} className="px-1 py-1 text-xs text-text-secondary hover:text-text">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                {/* Include countries */}
                <CountryPicker selected={countries} onChange={setCountries} />

                {/* Exclusion toggle */}
                <button
                  type="button"
                  onClick={() => {
                    const next = !showExclusions;
                    setShowExclusions(next);
                    if (!next) { setExcludedCountries([]); setExcludedRegions([]); }
                  }}
                  className={`mt-2 flex items-center gap-1.5 text-xs font-medium transition-colors ${showExclusions ? 'text-danger' : 'text-text-secondary hover:text-danger'}`}
                >
                  <svg className={`w-3.5 h-3.5 transition-transform duration-150 ${showExclusions ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  {showExclusions ? 'Esclusioni attive' : 'Aggiungi esclusioni'}
                </button>

                {/* Exclusion fields — only when enabled */}
                {showExclusions && (
                  <div className="mt-2 space-y-2 pl-3 border-l-2 border-danger/20">
                    {/* Exclude countries */}
                    <div>
                      <span className="text-xs text-danger font-medium mb-1 block">Escludi stati</span>
                      <CountryPicker selected={excludedCountries} onChange={setExcludedCountries} />
                    </div>

                    {/* Exclude regions */}
                    <div>
                      <span className="text-xs text-danger font-medium mb-1 block">Escludi regioni</span>
                      <RegionPicker selected={excludedRegions} onChange={setExcludedRegions} accessToken={settings.accessToken} countries={countries} />
                    </div>
                  </div>
                )}
              </div>

              {/* DSA fields (EU/EEA only) */}
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
                    <input type="text" value={dsaBeneficiary} onChange={(e) => setDsaBeneficiary(e.target.value)} className={inputCls} placeholder="Name of the person or organization..." />
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">Payor</label>
                    <input type="text" value={dsaPayor} onChange={(e) => setDsaPayor(e.target.value)} className={inputCls} placeholder="Who is paying for these ads..." />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Age Min</label>
                  <input type="number" min="13" max="65" value={ageMin} onChange={(e) => setAgeMin(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Age Max</label>
                  <input type="number" min="13" max="65" value={ageMax} onChange={(e) => setAgeMax(e.target.value)} className={inputCls} />
                </div>
                <Select label="Gender" value={gender} onChange={setGender} options={[{ value: 'all', label: 'All' }, { value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]} />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-2">Ad Set Spend Limits</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">Daily Min Spend ($)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-secondary">$</span>
                      <input type="number" step="0.01" min="0" value={dailyMinSpend} onChange={(e) => setDailyMinSpend(e.target.value)} className={`${inputCls} pl-7`} placeholder="0.00" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">Daily Spend Cap ($)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-secondary">$</span>
                      <input type="number" step="0.01" min="0" value={dailySpendCap} onChange={(e) => setDailySpendCap(e.target.value)} className={`${inputCls} pl-7`} placeholder="0.00" />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-text-secondary mt-1">Leave empty for no limits</p>
              </div>
            </div>
          )}

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

              <div className="space-y-2">
                {files.length === 0 ? (
                  <div className="text-center py-12 text-text-secondary text-sm">
                    Upload creatives to see preview
                  </div>
                ) : (
                  files.map((creative, index) => (
                    <CreativeCard key={creative.id} creative={creative} index={index}
                      onToggleCustom={handleToggleCustom} onUpdateField={handleUpdateField} onRemove={handleRemove}
                      isCarousel isFirst={index === 0} isLast={index === files.length - 1} onMove={handleMove}
                      globalCopy={globalCopy} />
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
      <Modal open={showLaunchModal} onClose={() => setShowLaunchModal(false)} title="Launch Ads" maxWidth="max-w-md">
        <div className="space-y-4">
          <div className="bg-bg rounded-lg p-4 space-y-2 text-sm">
            {mode === 'new' ? (
              <>
                <div className="flex justify-between"><span className="text-text-secondary">Campaign (new)</span><span className="font-medium">{campaignName}</span></div>
                <div className="flex justify-between"><span className="text-text-secondary">Objective</span><span className="font-medium">{CAMPAIGN_OBJECTIVES.find((o) => o.value === objective)?.label}</span></div>
                <div className="flex justify-between"><span className="text-text-secondary">Bid Strategy</span><span className="font-medium">{BID_STRATEGIES.find((b) => b.value === bidStrategy)?.label}</span></div>
                {needsBidAmount && bidAmount && (
                  <div className="flex justify-between"><span className="text-text-secondary">{bidStrategy === 'COST_CAP' ? 'Cost Cap' : 'Bid Cap'}</span><span className="font-medium">${Number(bidAmount).toFixed(2)}</span></div>
                )}
                <div className="flex justify-between"><span className="text-text-secondary">Ad Set (new)</span><span className="font-medium">{adSetName}</span></div>
                <div className="flex justify-between"><span className="text-text-secondary">Budget</span><span className="font-medium">${Number(dailyBudget).toFixed(2)}/day ({budgetType})</span></div>
                {selectedPixel && (
                  <div className="flex justify-between"><span className="text-text-secondary">Conversion</span><span className="font-medium">{CONVERSION_EVENTS.find((e) => e.value === conversionEvent)?.label}</span></div>
                )}
                <div className="flex justify-between"><span className="text-text-secondary">Targeting</span><span className="font-medium">{countries.join(', ')}{excludedCountries.length > 0 ? ` (excl: ${excludedCountries.join(', ')})` : ''}{excludedRegions.length > 0 ? ` (reg. excl: ${excludedRegions.map((r) => r.name).join(', ')})` : ''} / {ageMin}-{ageMax} / {gender}</span></div>
                {startDate && (
                  <div className="flex justify-between"><span className="text-text-secondary">Start</span><span className="font-medium">{new Date(startDate).toLocaleString()}</span></div>
                )}
              </>
            ) : (
              <>
                <div className="flex justify-between"><span className="text-text-secondary">Campaign</span><span className="font-medium">{campaigns.find((c) => c.id === selectedCampaign)?.name}</span></div>
                <div className="flex justify-between"><span className="text-text-secondary">Ad Set{selectedAdSet === '__new__' ? ' (new)' : ''}</span><span className="font-medium">{selectedAdSet === '__new__' ? adSetName : adSets.find((a) => a.id === selectedAdSet)?.name}</span></div>
                {selectedAdSet === '__new__' && !isCBO && (
                  <div className="flex justify-between"><span className="text-text-secondary">Budget</span><span className="font-medium">${Number(dailyBudget).toFixed(2)}/day</span></div>
                )}
              </>
            )}
            <hr className="border-border" />
            <div className="flex justify-between"><span className="text-text-secondary">Type</span><span className="font-medium">{creativeType === 'carousel' ? 'Carousel' : 'Single Ads'}</span></div>
            <div className="flex justify-between"><span className="text-text-secondary">Creatives</span><span className="font-medium">{files.length}</span></div>
            <div className="flex justify-between"><span className="text-text-secondary">Custom copy</span><span className="font-medium">{files.filter((f) => f.useCustomCopy).length} of {files.length}</span></div>
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

import { useState, useEffect, useCallback, useRef } from 'react';
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

let nextId = 1;

const FORM_KEY = 'meta-ads-upload-form';

function loadForm() {
  try {
    const raw = sessionStorage.getItem(FORM_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

const STATUS_LABELS = { 1: 'Active', 2: 'Disabled', 3: 'Unsettled', 7: 'Pending Review', 8: 'Pending Closure', 9: 'In Grace Period', 100: 'Temporarily Unavailable', 101: 'Closed' };

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
        {adAccounts.map((acc) => (
          <option key={acc.id} value={acc.id}>{acc.name} ({acc.id})</option>
        ))}
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
  const [launching, setLaunching] = useState(false);
  const [launchProgress, setLaunchProgress] = useState({ step: '', progress: 0, total: 0 });
  const [adStatus, setAdStatus] = useState('PAUSED');

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
      adSetName, dailyBudget, optimizationGoal, countries, excludedCountries, excludedRegions, ageMin, ageMax, gender, startDate,
      selectedPixel, conversionEvent, bidAmount, attributionSetting,
      dailyMinSpend, dailySpendCap, budgetSharing, dsaBeneficiary, dsaPayor,
      selectedPage, selectedIgAccount, websiteUrl, globalCopy,
    }));
  }, [mode, creativeType, campaignName, objective, budgetType, bidStrategy,
    adSetName, dailyBudget, optimizationGoal, countries, excludedCountries, excludedRegions, ageMin, ageMax, gender, startDate,
    selectedPixel, conversionEvent, bidAmount, attributionSetting,
    dailyMinSpend, dailySpendCap, budgetSharing, dsaBeneficiary, dsaPayor,
    selectedPage, selectedIgAccount, websiteUrl, globalCopy]);

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
    api.getInstagramAccounts(settings.accessToken, selectedPage)
      .then((data) => {
        setIgAccounts(data);
        if (data.length > 0 && !selectedIgAccount) setSelectedIgAccount(data[0].id);
      })
      .catch(() => setIgAccounts([]));
  }, [settings.accessToken, selectedPage]);

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
      prev.map((f) => (f.id === id ? { ...f, useCustomCopy: !f.useCustomCopy } : f))
    );
  }, []);

  const handleUpdateField = useCallback((id, field, value) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
  }, []);

  const buildUrlWithUtm = useCallback((baseUrl) => {
    if (!baseUrl) return '';
    const tmpl = settings.utmTemplate?.trim();
    if (!tmpl) return baseUrl;
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}${tmpl}`;
  }, [settings.utmTemplate]);

  const getCreativeCopy = useCallback((creative) => {
    const rawUrl = creative.useCustomCopy ? (creative.linkUrl || websiteUrl) : websiteUrl;
    const finalUrl = buildUrlWithUtm(rawUrl);
    if (creative.useCustomCopy) {
      return {
        primaryText: creative.primaryText,
        headline: creative.headline,
        description: creative.description,
        linkUrl: finalUrl,
        cta: creative.cta,
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
      if (!selectedAdSet) { addToast('Select an ad set', 'error'); return; }
    }
    if (files.length === 0) { addToast('Upload at least one creative', 'error'); return; }
    if (!websiteUrl.trim()) { addToast('Enter a website URL', 'error'); return; }
    if (!selectedPage) { addToast('Select or enter a Facebook Page ID', 'error'); return; }
    if (creativeType === 'carousel' && files.length < 2) { addToast('Carousel needs at least 2 images', 'error'); return; }
    setShowLaunchModal(true);
  };

  const confirmLaunch = async () => {
    setLaunching(true);
    const total = files.length;
    let campaignId, adSetId;
    const results = [];
    const launchName = mode === 'new' ? campaignName : campaigns.find((c) => c.id === selectedCampaign)?.name;
    const pageId = selectedPage;
    const igId = selectedIgAccount || undefined;

    try {
      if (mode === 'new') {
        const budgetCents = String(Math.round(Number(dailyBudget) * 100));
        const bidAmountCents = bidAmount ? String(Math.round(Number(bidAmount) * 100)) : undefined;
        const minSpendCents = dailyMinSpend ? String(Math.round(Number(dailyMinSpend) * 100)) : undefined;
        const spendCapCents = dailySpendCap ? String(Math.round(Number(dailySpendCap) * 100)) : undefined;

        setLaunchProgress({ step: 'Creating campaign...', progress: 0, total });
        const camp = await api.createCampaign(settings.accessToken, settings.adAccountId, {
          name: campaignName, objective, status: adStatus, budgetType,
          dailyBudget: budgetCents, bidStrategy, budgetSharing,
        });
        campaignId = camp.id;

        setLaunchProgress({ step: 'Creating ad set...', progress: 0, total });
        const aset = await api.createAdSet(settings.accessToken, settings.adAccountId, {
          name: adSetName, campaignId, dailyBudget: budgetCents, optimizationGoal,
          billingEvent: 'IMPRESSIONS',
          countries, excludedCountries, excludedRegions,
          ageMin, ageMax, gender, status: adStatus,
          startTime: startDate || undefined,
          budgetType, bidStrategy, budgetSharing, pixelId: selectedPixel || undefined,
          conversionEvent: selectedPixel ? conversionEvent : undefined,
          bidAmount: needsBidAmount ? bidAmountCents : undefined,
          attributionSetting: selectedPixel ? attributionSetting : undefined,
          dailyMinSpend: minSpendCents, dailySpendCap: spendCapCents,
          dsaBeneficiary: needsDsa ? (dsaBeneficiary || pages.find((p) => p.id === pageId)?.name || pageId) : undefined,
          dsaPayor: needsDsa ? (dsaPayor || pages.find((p) => p.id === pageId)?.name || pageId) : undefined,
        });
        adSetId = aset.id;
      } else {
        campaignId = selectedCampaign;
        adSetId = selectedAdSet;
      }

      if (creativeType === 'carousel') {
        setLaunchProgress({ step: 'Uploading carousel images...', progress: 0, total });
        const cards = [];
        for (let i = 0; i < files.length; i++) {
          const creative = files[i];
          const copy = getCreativeCopy(creative);
          setLaunchProgress({ step: `[${i + 1}/${total}] Uploading ${creative.file.name}...`, progress: i + 1, total });
          const upload = await api.uploadImage(settings.accessToken, settings.adAccountId, creative.file);
          cards.push({ imageHash: upload.hash, headline: copy.headline, description: copy.description, linkUrl: copy.linkUrl, cta: copy.cta });
        }

        setLaunchProgress({ step: 'Creating carousel creative...', progress: total, total });
        const globalUrl = buildUrlWithUtm(websiteUrl);
        const carouselSpec = buildDegreesOfFreedomSpec(settings.enhancements, 'carousel');
        const creativeResult = await api.createCarouselCreative(settings.accessToken, settings.adAccountId, {
          name: `Carousel - ${campaignName || 'Ad'}`, pageId, cards,
          message: globalCopy.primaryText, linkUrl: globalUrl, instagramAccountId: igId,
          degreesOfFreedomSpec: carouselSpec,
        });

        const ad = await api.createAd(settings.accessToken, settings.adAccountId, {
          name: 'Ad - Carousel', adSetId, creativeId: creativeResult.id, status: adStatus,
        });
        results.push({ fileName: 'Carousel', adId: ad.id, creativeId: creativeResult.id });
      } else {
        for (let i = 0; i < files.length; i++) {
          const creative = files[i];
          const copy = getCreativeCopy(creative);
          const isImage = ACCEPTED_IMAGE_TYPES.includes(creative.file.type);

          setLaunchProgress({ step: `[${i + 1}/${total}] Uploading ${creative.file.name}...`, progress: i + 1, total });

          let creativeResult;
          if (isImage) {
            const imgSpec = buildDegreesOfFreedomSpec(settings.enhancements, 'image');
            const upload = await api.uploadImage(settings.accessToken, settings.adAccountId, creative.file);
            creativeResult = await api.createImageCreative(settings.accessToken, settings.adAccountId, {
              name: creative.file.name, pageId, imageHash: upload.hash,
              message: copy.primaryText, headline: copy.headline, description: copy.description,
              linkUrl: copy.linkUrl, cta: copy.cta, instagramAccountId: igId,
              degreesOfFreedomSpec: imgSpec,
            });
          } else {
            const vidSpec = buildDegreesOfFreedomSpec(settings.enhancements, 'video');
            const upload = await api.uploadVideo(settings.accessToken, settings.adAccountId, creative.file);
            creativeResult = await api.createVideoCreative(settings.accessToken, settings.adAccountId, {
              name: creative.file.name, pageId, videoId: upload.id,
              message: copy.primaryText, headline: copy.headline, description: copy.description,
              linkUrl: copy.linkUrl, cta: copy.cta, instagramAccountId: igId,
              degreesOfFreedomSpec: vidSpec,
            });
          }

          const ad = await api.createAd(settings.accessToken, settings.adAccountId, {
            name: `Ad - ${creative.file.name}`, adSetId, creativeId: creativeResult.id, status: adStatus,
          });
          results.push({ fileName: creative.file.name, adId: ad.id, creativeId: creativeResult.id });
        }
      }

      setLaunchProgress({ step: 'All done!', progress: total, total });
      addHistory({ campaignId, adSetId, campaignName: launchName, adsCount: results.length, status: adStatus, results });
      addCreatives(files.map((f) => ({ name: f.file.name, size: f.file.size, type: f.file.type, date: new Date().toISOString() })));
      addToast(`${results.length} ad${results.length !== 1 ? 's' : ''} launched successfully!`);
      setTimeout(() => { setShowLaunchModal(false); setLaunching(false); setFiles([]); }, 2000);
    } catch (err) {
      addToast(`Launch failed: ${err.message}`, 'error');
      setLaunching(false);
    }
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
                  <select value={selectedCampaign} onChange={(e) => { setSelectedCampaign(e.target.value); setSelectedAdSet(''); }} className={inputCls}>
                    <option value="">Select a campaign...</option>
                    {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.status})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">Ad Set</label>
                  <select value={selectedAdSet} onChange={(e) => setSelectedAdSet(e.target.value)} className={inputCls}>
                    <option value="">Select an ad set...</option>
                    {adSets.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.status})</option>)}
                  </select>
                </div>
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
                <div className="mb-2">
                  <span className="text-xs text-success font-medium mb-1 block">Include</span>
                  <CountryPicker selected={countries} onChange={setCountries} />
                </div>

                {/* Exclude countries */}
                <div className="mb-2">
                  <span className="text-xs text-danger font-medium mb-1 block">Escludi stati</span>
                  <CountryPicker selected={excludedCountries} onChange={setExcludedCountries} />
                </div>

                {/* Exclude regions */}
                <div>
                  <span className="text-xs text-danger font-medium mb-1 block">Escludi regioni</span>
                  <RegionPicker selected={excludedRegions} onChange={setExcludedRegions} accessToken={settings.accessToken} />
                </div>
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
                <select value={selectedIgAccount} onChange={(e) => setSelectedIgAccount(e.target.value)} className={inputCls}>
                  <option value="">No Instagram account</option>
                  {igAccounts.map((ig) => <option key={ig.id} value={ig.id}>{ig.username || ig.id}</option>)}
                </select>
              ) : (
                <input type="text" value={selectedIgAccount} onChange={(e) => setSelectedIgAccount(e.target.value)} className={inputCls} placeholder="Instagram Account ID (optional)" />
              )}
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
                <textarea rows={3} value={globalCopy.primaryText} onChange={(e) => setGlobalCopy({ ...globalCopy, primaryText: e.target.value })} className={`${inputCls} resize-none`} placeholder="Write your ad text..." />
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

        {/* ============ RIGHT COLUMN: sticky ============ */}
        <div>
          <div className="sticky top-6 space-y-5 max-h-[calc(100vh-48px)] overflow-y-auto">

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

              <div className="space-y-2 max-h-[280px] overflow-y-auto">
                {files.length === 0 ? (
                  <div className="text-center py-12 text-text-secondary text-sm">
                    Upload creatives to see preview
                  </div>
                ) : (
                  files.map((creative, index) => (
                    <CreativeCard key={creative.id} creative={creative} index={index}
                      onToggleCustom={handleToggleCustom} onUpdateField={handleUpdateField} onRemove={handleRemove} />
                  ))
                )}
              </div>
            </div>

            {/* Ad Preview */}
            {files.length > 0 && (
              <div className="bg-white rounded-xl border border-border p-5">
                <h2 className="text-sm font-semibold mb-4">Anteprima</h2>
                <AdPreview
                  file={creativeType !== 'carousel' ? files[0]?.file : undefined}
                  files={creativeType === 'carousel' ? files.map((f) => f.file) : undefined}
                  isCarousel={creativeType === 'carousel'}
                  cards={creativeType === 'carousel' ? files.map((f) => ({
                    file: f.file,
                    headline: f.useCustomCopy ? f.headline : globalCopy.headline,
                    description: f.useCustomCopy ? f.description : globalCopy.description,
                    cta: f.useCustomCopy ? f.cta : globalCopy.cta,
                  })) : undefined}
                  primaryText={files[0]?.useCustomCopy ? files[0].primaryText : globalCopy.primaryText}
                  headline={files[0]?.useCustomCopy ? files[0].headline : globalCopy.headline}
                  description={files[0]?.useCustomCopy ? files[0].description : globalCopy.description}
                  cta={files[0]?.useCustomCopy ? files[0].cta : globalCopy.cta}
                  pageName={pages.find((p) => p.id === selectedPage)?.name || 'Your Page'}
                  websiteUrl={websiteUrl}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Launch Modal */}
      <Modal open={showLaunchModal} onClose={() => !launching && setShowLaunchModal(false)} title="Launch Ads" maxWidth="max-w-md">
        {!launching ? (
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
                  <div className="flex justify-between"><span className="text-text-secondary">Ad Set</span><span className="font-medium">{adSets.find((a) => a.id === selectedAdSet)?.name}</span></div>
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
        ) : (
          <div className="space-y-4 py-4">
            <p className="text-sm text-center font-medium">{launchProgress.step}</p>
            <div className="w-full bg-bg rounded-full h-2.5">
              <div className="bg-accent h-2.5 rounded-full transition-all duration-500" style={{ width: `${launchProgress.total > 0 ? (launchProgress.progress / launchProgress.total) * 100 : 0}%` }} />
            </div>
            <p className="text-xs text-text-secondary text-center">{launchProgress.progress} / {launchProgress.total} creatives</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

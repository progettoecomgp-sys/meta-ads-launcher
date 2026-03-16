import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { getAdAccounts, getPages, getPixels } from '../utils/metaApi';

const AppContext = createContext(null);

const SETTINGS_KEY = 'meta-ads-settings';
const HISTORY_KEY = 'meta-ads-history';
const CREATIVES_KEY = 'meta-ads-creatives';
const CONNECTION_KEY = 'meta-ads-connection';

const DEFAULT_SETTINGS = {
  accessToken: '',
  adAccountId: '',
  utmTemplate: '',
  enhancements: { image: {}, video: {}, carousel: {} },
  facebookPageId: '',
  facebookPageName: '',
  instagramAccountId: '',
  instagramAccountName: '',
  pixelId: '',
  pixelName: '',
  websiteUrl: '',
  euAdvertising: false,
  onboardingCompleted: false,
  facebookUserName: '',
  tokenExpiresAt: null,
  hiddenFields: {},
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
};

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function AppProvider({ children }) {
  const { user } = useAuth();
  const [settings, setSettingsState] = useState(DEFAULT_SETTINGS);
  const [history, setHistoryState] = useState([]);
  const [creatives, setCreativesState] = useState([]);
  const [connectionStatus, setConnectionStatusState] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const migrated = useRef(false);

  // Pre-fetched Meta API data (pages, ad accounts, pixels)
  const [prefetchedPages, setPrefetchedPages] = useState([]);
  const [prefetchedAdAccounts, setPrefetchedAdAccounts] = useState([]);
  const [prefetchedPixels, setPrefetchedPixels] = useState([]);

  // Impersonation state
  const [impersonatedUser, setImpersonatedUser] = useState(null);

  // Billing / plan state
  const [billingStatus, setBillingStatus] = useState({ plan: 'free', launchesThisMonth: 0, launchLimit: 3, hasStripe: false });

  // Load data from Supabase on mount
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    async function loadData() {
      setDataLoading(true);
      try {
        const [settingsRes, historyRes, creativesRes] = await Promise.all([
          supabase.from('user_settings').select('*').eq('user_id', user.id).single(),
          supabase.from('launch_history').select('*').eq('user_id', user.id).order('launched_at', { ascending: false }),
          supabase.from('creatives').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        ]);

        if (cancelled) return;

        let dbSettings = settingsRes.data;
        const dbHistory = historyRes.data || [];
        const dbCreatives = creativesRes.data || [];

        // Create user_settings row if it doesn't exist
        if (!dbSettings) {
          const { data: newRow } = await supabase.from('user_settings').upsert({
            user_id: user.id,
            access_token: '',
            ad_account_id: '',
            utm_template: '',
            enhancements: DEFAULT_SETTINGS.enhancements,
            onboarding_completed: false,
          }, { onConflict: 'user_id' }).select().single();
          dbSettings = newRow;
        }

        // Check if we should migrate from localStorage
        const shouldMigrate = !migrated.current && dbSettings && !dbSettings.access_token && dbHistory.length === 0 && dbCreatives.length === 0;

        if (shouldMigrate) {
          migrated.current = true;
          const localSettings = loadFromStorage(SETTINGS_KEY, null);
          const localHistory = loadFromStorage(HISTORY_KEY, []);
          const localCreatives = loadFromStorage(CREATIVES_KEY, []);
          const localConnection = loadFromStorage(CONNECTION_KEY, null);

          if (localSettings || localHistory.length > 0 || localCreatives.length > 0) {
            // Migrate settings
            if (localSettings) {
              await supabase.from('user_settings').update({
                access_token: localSettings.accessToken || '',
                ad_account_id: localSettings.adAccountId || '',
                utm_template: localSettings.utmTemplate || '',
                enhancements: localSettings.enhancements || DEFAULT_SETTINGS.enhancements,
                connection_status: localConnection,
              }).eq('user_id', user.id);

              setSettingsState(localSettings);
              setConnectionStatusState(localConnection);
            }

            // Migrate history
            if (localHistory.length > 0) {
              const historyRows = localHistory.map((h) => ({
                user_id: user.id,
                campaign_id: h.campaignId || null,
                ad_set_id: h.adSetId || null,
                campaign_name: h.campaignName || null,
                ads_count: h.adsCount || 0,
                status: h.status || null,
                results: h.results || [],
                launched_at: h.date || new Date().toISOString(),
              }));
              await supabase.from('launch_history').insert(historyRows);
              setHistoryState(localHistory);
            }

            // Migrate creatives
            if (localCreatives.length > 0) {
              const creativeRows = localCreatives.map((c) => ({
                user_id: user.id,
                name: c.name || 'untitled',
                size: c.size || 0,
                type: c.type || '',
                created_at: c.addedAt || new Date().toISOString(),
              }));
              await supabase.from('creatives').insert(creativeRows);
              setCreativesState(localCreatives);
            }

            // Clear localStorage after migration
            localStorage.removeItem(SETTINGS_KEY);
            localStorage.removeItem(HISTORY_KEY);
            localStorage.removeItem(CREATIVES_KEY);
            localStorage.removeItem(CONNECTION_KEY);

            setDataLoading(false);
            return;
          }
        }

        // Map DB data to app state
        if (dbSettings) {
          // Auto-complete onboarding only for legacy users who manually configured token + ad account
          const hasToken = !!dbSettings.access_token;
          const hasAdAccount = !!dbSettings.ad_account_id;
          const onboardingDone = dbSettings.onboarding_completed || (hasToken && hasAdAccount);

          // If legacy user with token+adAccount but onboarding not flagged, mark it
          if (hasToken && hasAdAccount && !dbSettings.onboarding_completed) {
            supabase.from('user_settings').update({ onboarding_completed: true }).eq('user_id', user.id).then(() => {});
          }

          setSettingsState({
            accessToken: dbSettings.access_token || '',
            adAccountId: dbSettings.ad_account_id || '',
            utmTemplate: dbSettings.utm_template || '',
            enhancements: dbSettings.enhancements || DEFAULT_SETTINGS.enhancements,
            facebookPageId: dbSettings.facebook_page_id || '',
            facebookPageName: dbSettings.facebook_page_name || '',
            instagramAccountId: dbSettings.instagram_account_id || '',
            instagramAccountName: dbSettings.instagram_account_name || '',
            pixelId: dbSettings.pixel_id || '',
            pixelName: dbSettings.pixel_name || '',
            websiteUrl: dbSettings.website_url || '',
            euAdvertising: dbSettings.eu_advertising || false,
            onboardingCompleted: onboardingDone,
            facebookUserName: dbSettings.facebook_user_name || '',
            tokenExpiresAt: dbSettings.token_expires_at || null,
            hiddenFields: dbSettings.hidden_fields || {},
            uploadDefaults: dbSettings.upload_defaults || DEFAULT_SETTINGS.uploadDefaults,
          });
          setConnectionStatusState(dbSettings.connection_status || null);
        }

        setHistoryState(dbHistory.map((h) => ({
          campaignId: h.campaign_id,
          adSetId: h.ad_set_id,
          campaignName: h.campaign_name,
          adsCount: h.ads_count,
          status: h.status,
          results: h.results,
          date: h.launched_at,
        })));

        setCreativesState(dbCreatives.map((c) => ({
          id: c.id,
          name: c.name,
          size: c.size,
          type: c.type,
          addedAt: c.created_at,
        })));
      } catch (err) {
        console.error('Failed to load data from Supabase:', err);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [user]);

  // Load billing status
  useEffect(() => {
    if (!user) return;
    supabase.auth.getSession().then(({ data }) => {
      const token = data?.session?.access_token;
      if (!token) return;
      fetch('/api/billing/status', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
        .then(r => r.ok ? r.json() : null)
        .then(result => { if (result) setBillingStatus(result); })
        .catch(() => {});
    });
  }, [user]);

  // Pre-fetch ad accounts when token is available
  useEffect(() => {
    if (!settings.accessToken) { setPrefetchedAdAccounts([]); return; }
    getAdAccounts(settings.accessToken)
      .then(setPrefetchedAdAccounts)
      .catch(() => setPrefetchedAdAccounts([]));
  }, [settings.accessToken]);

  // Pre-fetch pages when token + ad account are available
  useEffect(() => {
    if (!settings.accessToken) { setPrefetchedPages([]); return; }
    let cancelled = false;
    getPages(settings.accessToken, settings.adAccountId)
      .then((data) => { if (!cancelled) setPrefetchedPages(data); })
      .catch(() => { if (!cancelled) setPrefetchedPages([]); });
    return () => { cancelled = true; };
  }, [settings.accessToken, settings.adAccountId]);

  // Pre-fetch pixels when token + ad account are available
  useEffect(() => {
    if (!settings.accessToken || !settings.adAccountId) { setPrefetchedPixels([]); return; }
    getPixels(settings.accessToken, settings.adAccountId)
      .then(setPrefetchedPixels)
      .catch(() => setPrefetchedPixels([]));
  }, [settings.accessToken, settings.adAccountId]);

  // Impersonation helpers
  const startImpersonation = useCallback(async (userId, token) => {
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setImpersonatedUser({
        email: data.email,
        settings: data.settings,
        history: (data.history || []).map(h => ({
          campaignId: h.campaign_id,
          adSetId: h.ad_set_id,
          campaignName: h.campaign_name,
          adsCount: h.ads_count,
          status: h.status,
          results: h.results,
          date: h.launched_at,
        })),
      });
    } catch (err) {
      console.error('Impersonation failed:', err);
    }
  }, []);

  const exitImpersonation = useCallback(() => {
    setImpersonatedUser(null);
  }, []);

  const setSettings = useCallback((update) => {
    setSettingsState((prev) => {
      const next = typeof update === 'function' ? update(prev) : { ...prev, ...update };
      // Schedule Supabase write outside the updater (must be pure)
      if (user) {
        Promise.resolve().then(() => {
          supabase.from('user_settings').update({
            access_token: next.accessToken,
            ad_account_id: next.adAccountId,
            utm_template: next.utmTemplate,
            enhancements: next.enhancements,
            facebook_page_id: next.facebookPageId,
            facebook_page_name: next.facebookPageName,
            instagram_account_id: next.instagramAccountId,
            instagram_account_name: next.instagramAccountName,
            pixel_id: next.pixelId,
            pixel_name: next.pixelName,
            website_url: next.websiteUrl,
            eu_advertising: next.euAdvertising,
            onboarding_completed: next.onboardingCompleted,
            facebook_user_name: next.facebookUserName,
            token_expires_at: next.tokenExpiresAt,
            hidden_fields: next.hiddenFields,
            upload_defaults: next.uploadDefaults,
          }).eq('user_id', user.id).then(({ error }) => {
            if (error) console.error('Failed to save settings:', error);
          });
        });
      }
      return next;
    });
  }, [user]);

  const addHistory = useCallback((entry) => {
    const newEntry = { ...entry, date: new Date().toISOString() };
    setHistoryState((prev) => [newEntry, ...prev]);

    // Async write to Supabase
    if (user) {
      supabase.from('launch_history').insert({
        user_id: user.id,
        campaign_id: entry.campaignId || null,
        ad_set_id: entry.adSetId || null,
        campaign_name: entry.campaignName || null,
        ads_count: entry.adsCount || 0,
        status: entry.status || null,
        results: entry.results || [],
      }).then(({ error }) => {
        if (error) console.error('Failed to save history:', error);
      });
    }
  }, [user]);

  const addCreatives = useCallback((newCreatives) => {
    setCreativesState((prev) => [...newCreatives, ...prev]);

    // Async write to Supabase
    if (user) {
      const rows = newCreatives.map((c) => ({
        user_id: user.id,
        name: c.name || 'untitled',
        size: c.size || 0,
        type: c.type || '',
      }));
      supabase.from('creatives').insert(rows).then(({ error }) => {
        if (error) console.error('Failed to save creatives:', error);
      });
    }
  }, [user]);

  const setConnectionStatus = useCallback((status) => {
    setConnectionStatusState(status);

    // Async write to Supabase
    if (user) {
      supabase.from('user_settings').update({
        connection_status: status,
      }).eq('user_id', user.id).then(({ error }) => {
        if (error) console.error('Failed to save connection status:', error);
      });
    }
  }, [user]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const isConfigured = Boolean(settings.accessToken && settings.adAccountId);

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-text-secondary">Loading your data...</p>
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider
      value={{
        settings,
        setSettings,
        history,
        addHistory,
        creatives,
        addCreatives,
        connectionStatus,
        setConnectionStatus,
        isConfigured,
        toasts,
        addToast,
        removeToast,
        impersonatedUser,
        startImpersonation,
        exitImpersonation,
        billingStatus,
        setBillingStatus,
        prefetchedPages,
        prefetchedAdAccounts,
        prefetchedPixels,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

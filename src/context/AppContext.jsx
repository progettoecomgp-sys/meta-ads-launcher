import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

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

        const dbSettings = settingsRes.data;
        const dbHistory = historyRes.data || [];
        const dbCreatives = creativesRes.data || [];

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
          setSettingsState({
            accessToken: dbSettings.access_token || '',
            adAccountId: dbSettings.ad_account_id || '',
            utmTemplate: dbSettings.utm_template || '',
            enhancements: dbSettings.enhancements || DEFAULT_SETTINGS.enhancements,
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

  const setSettings = useCallback((update) => {
    setSettingsState((prev) => {
      const next = typeof update === 'function' ? update(prev) : { ...prev, ...update };

      // Async write to Supabase
      if (user) {
        supabase.from('user_settings').update({
          access_token: next.accessToken,
          ad_account_id: next.adAccountId,
          utm_template: next.utmTemplate,
          enhancements: next.enhancements,
        }).eq('user_id', user.id).then(({ error }) => {
          if (error) console.error('Failed to save settings:', error);
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

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

const FeatureFlagContext = createContext({ flags: {}, rawFlags: [], loading: true, reloadFlags: () => {} });

export function FeatureFlagProvider({ children }) {
  const { session } = useAuth();
  const [flags, setFlags] = useState({});
  const [rawFlags, setRawFlags] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFlags = useCallback(async () => {
    const token = session?.access_token;
    if (!token) {
      setFlags({});
      setRawFlags([]);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/feature-flags', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load flags');
      const data = await res.json();
      setFlags(data.flags || {});
      setRawFlags(data._raw || []);
    } catch {
      setFlags({});
      setRawFlags([]);
    }
    setLoading(false);
  }, [session?.access_token]);

  useEffect(() => {
    loadFlags();
  }, [loadFlags]);

  return (
    <FeatureFlagContext.Provider value={{ flags, rawFlags, loading, reloadFlags: loadFlags }}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

export function useFeatureFlags() {
  return useContext(FeatureFlagContext);
}

export function useFeatureFlag(key) {
  const { flags } = useContext(FeatureFlagContext);
  return !!flags[key];
}

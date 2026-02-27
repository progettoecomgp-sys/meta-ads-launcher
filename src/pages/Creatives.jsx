import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import * as api from '../utils/metaApi';

export default function Creatives() {
  const { settings, isConfigured, creatives: localCreatives, addToast } = useApp();
  const [remoteCreatives, setRemoteCreatives] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('local');

  useEffect(() => {
    if (!isConfigured || tab !== 'remote') return;
    setLoading(true);
    api.getAdCreatives(settings.accessToken, settings.adAccountId)
      .then(setRemoteCreatives)
      .catch((err) => addToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [isConfigured, settings.accessToken, settings.adAccountId, tab, addToast]);

  return (
    <div className="p-6">
      {!isConfigured && (
        <div className="mb-4 px-4 py-3 bg-warning/10 border border-warning/20 rounded-lg flex items-center gap-3 text-sm">
          <svg className="w-5 h-5 text-warning flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="text-text-secondary">API not configured — remote creatives will load once connected.</span>
        </div>
      )}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Creatives Library</h1>
        <p className="text-text-secondary text-sm mt-1">All your uploaded ad creatives</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-bg rounded-lg p-1 mb-6 w-fit">
        <button
          onClick={() => setTab('local')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'local' ? 'bg-white shadow-sm text-text' : 'text-text-secondary hover:text-text'
          }`}
        >
          Local ({localCreatives.length})
        </button>
        <button
          onClick={() => setTab('remote')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'remote' ? 'bg-white shadow-sm text-text' : 'text-text-secondary hover:text-text'
          }`}
        >
          From Account
        </button>
      </div>

      {tab === 'local' ? (
        localCreatives.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-12 text-center">
            <div className="w-16 h-16 bg-bg rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-text-secondary text-sm">No creatives uploaded yet. Go to Upload to add some.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {localCreatives.map((c, i) => (
              <div key={i} className="bg-white rounded-xl border border-border overflow-hidden">
                <div className="aspect-square bg-bg flex items-center justify-center">
                  {c.type?.startsWith('image') ? (
                    <svg className="w-10 h-10 text-text-secondary/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  ) : (
                    <svg className="w-10 h-10 text-text-secondary/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {(c.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <p className="text-xs text-text-secondary">
                    {new Date(c.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-border overflow-hidden animate-pulse">
                <div className="aspect-square bg-bg" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-bg rounded w-3/4" />
                  <div className="h-3 bg-bg rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : remoteCreatives.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-12 text-center">
            <p className="text-text-secondary text-sm">No creatives found in your account.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {remoteCreatives.map((c) => (
              <div key={c.id} className="bg-white rounded-xl border border-border overflow-hidden">
                <div className="aspect-square bg-bg flex items-center justify-center">
                  {c.thumbnail_url ? (
                    <img src={c.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-10 h-10 text-text-secondary/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-xs text-text-secondary mt-0.5">ID: {c.id}</p>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

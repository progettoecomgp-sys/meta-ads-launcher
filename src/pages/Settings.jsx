import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { testConnection, getAdAccounts } from '../utils/metaApi';
import { ENHANCEMENT_CONFIGS } from '../utils/constants';

const STATUS_LABELS = {
  1: 'Active', 2: 'Disabled', 3: 'Unsettled', 7: 'Pending Review',
  8: 'Pending Closure', 9: 'In Grace Period', 100: 'Temporarily Unavailable', 101: 'Closed',
};

export default function Settings() {
  const { settings, setSettings, connectionStatus, setConnectionStatus, addToast } = useApp();
  const [showToken, setShowToken] = useState(false);
  const [testing, setTesting] = useState(false);
  const [adAccounts, setAdAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // Load ad accounts when token changes
  useEffect(() => {
    if (!settings.accessToken) { setAdAccounts([]); return; }
    setLoadingAccounts(true);
    getAdAccounts(settings.accessToken)
      .then((accounts) => {
        setAdAccounts(accounts);
        // Auto-select first account if none selected
        if (accounts.length > 0 && !settings.adAccountId) {
          const firstId = accounts[0].id.replace('act_', '');
          selectAccount(firstId, accounts);
        }
      })
      .catch(() => setAdAccounts([]))
      .finally(() => setLoadingAccounts(false));
  }, [settings.accessToken]);

  // Auto-test connection on load if credentials exist
  useEffect(() => {
    if (settings.accessToken && settings.adAccountId && !connectionStatus?.connected) {
      testConnection(settings.accessToken, settings.adAccountId)
        .then((result) => {
          setConnectionStatus({ connected: true, name: result.name, status: result.account_status });
        })
        .catch(() => {});
    }
  }, []);

  const selectAccount = async (numericId, accounts) => {
    setSettings({ adAccountId: numericId });
    // Auto-test the selected account
    if (settings.accessToken && numericId) {
      try {
        const result = await testConnection(settings.accessToken, numericId);
        setConnectionStatus({ connected: true, name: result.name, status: result.account_status });
      } catch {
        setConnectionStatus({ connected: false });
      }
    }
  };

  const handleAccountChange = (value) => {
    const numericId = value.replace('act_', '');
    selectAccount(numericId, adAccounts);
  };

  const handleManualTest = async () => {
    if (!settings.accessToken || !settings.adAccountId) {
      addToast('Inserisci Access Token e Ad Account ID', 'error');
      return;
    }
    setTesting(true);
    try {
      const result = await testConnection(settings.accessToken, settings.adAccountId);
      setConnectionStatus({ connected: true, name: result.name, status: result.account_status });
      addToast('Connessione riuscita!');
    } catch (err) {
      setConnectionStatus({ connected: false });
      addToast(err.message, 'error');
    } finally {
      setTesting(false);
    }
  };

  const inputCls = "w-full border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent";

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-text-secondary text-sm mt-1">Configura le credenziali Meta API</p>
      </div>

      {/* Connected account banner */}
      {connectionStatus?.connected && (
        <div className="bg-success/10 border border-success/20 rounded-xl p-4 mb-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-success">Account collegato</p>
            <p className="text-sm font-medium">{connectionStatus.name}</p>
            <p className="text-xs text-text-secondary">act_{settings.adAccountId} &bull; {STATUS_LABELS[connectionStatus.status] || 'Unknown'}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-border p-6 space-y-5">
        {/* Access Token */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Access Token</label>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={settings.accessToken}
              onChange={(e) => {
                setSettings({ accessToken: e.target.value });
                setConnectionStatus(null);
              }}
              className={`${inputCls} pr-20`}
              placeholder="Inserisci il tuo access token..."
            />
            <button
              onClick={() => setShowToken(!showToken)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-accent hover:text-accent-hover px-2 py-1"
            >
              {showToken ? 'Nascondi' : 'Mostra'}
            </button>
          </div>
        </div>

        {/* Ad Account Selector */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Ad Account</label>
          {adAccounts.length > 0 ? (
            <select
              value={settings.adAccountId ? `act_${settings.adAccountId}` : ''}
              onChange={(e) => handleAccountChange(e.target.value)}
              className={inputCls}
            >
              <option value="">Seleziona un ad account...</option>
              {adAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.id}) — {STATUS_LABELS[acc.account_status] || 'Unknown'}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-secondary">act_</span>
              <input
                type="text"
                value={settings.adAccountId}
                onChange={(e) => setSettings({ adAccountId: e.target.value.replace(/\D/g, '') })}
                className={`flex-1 ${inputCls}`}
                placeholder="123456789"
              />
            </div>
          )}
          {loadingAccounts && (
            <p className="text-xs text-text-secondary mt-1">Caricamento ad account...</p>
          )}
          {adAccounts.length > 0 && (
            <details className="mt-1.5">
              <summary className="text-xs text-text-secondary cursor-pointer hover:text-text">Oppure inserisci l'ID manualmente</summary>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-text-secondary">act_</span>
                <input
                  type="text"
                  value={settings.adAccountId}
                  onChange={(e) => setSettings({ adAccountId: e.target.value.replace(/\D/g, '') })}
                  className={`flex-1 ${inputCls}`}
                  placeholder="123456789"
                />
              </div>
            </details>
          )}
        </div>

        {/* Test Connection */}
        <div className="pt-2">
          <button
            onClick={handleManualTest}
            disabled={testing}
            className="px-5 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {testing ? 'Connessione...' : 'Test Connessione'}
          </button>
        </div>
      </div>

      {/* URL Parameters */}
      <div className="bg-white rounded-xl border border-border p-6 mt-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold">Parametri URL</h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Aggiunti automaticamente a ogni link delle inserzioni. Stesso formato di Facebook Ads Manager.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Parametri URL</label>
          <p className="text-xs text-text-secondary mb-2">Gli UTM li devi inserire qui</p>
          <textarea
            rows={3}
            value={settings.utmTemplate || ''}
            onChange={(e) => setSettings({ utmTemplate: e.target.value })}
            className={`${inputCls} font-mono resize-none`}
            placeholder="chiave1=valore1&chiave2=valore2"
          />
          <p className="text-xs text-text-secondary mt-1.5">
            Macro disponibili: <code className="bg-bg px-1 rounded">{'{{campaign.name}}'}</code> <code className="bg-bg px-1 rounded">{'{{adset.name}}'}</code> <code className="bg-bg px-1 rounded">{'{{ad.name}}'}</code> <code className="bg-bg px-1 rounded">{'{{campaign.id}}'}</code> <code className="bg-bg px-1 rounded">{'{{adset.id}}'}</code> <code className="bg-bg px-1 rounded">{'{{ad.id}}'}</code>
          </p>
        </div>
        {settings.utmTemplate && (
          <div className="bg-bg rounded-lg p-3">
            <p className="text-xs font-medium text-text-secondary mb-1">Anteprima:</p>
            <p className="text-xs text-text break-all font-mono">
              https://example.com?{settings.utmTemplate}
            </p>
          </div>
        )}
      </div>

      {/* Creative Settings */}
      <div className="bg-white rounded-xl border border-border p-6 mt-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold">Creative Settings</h2>
            <p className="text-xs text-text-secondary">Configura gli enhancement Advantage+ per ogni tipo di creative</p>
          </div>
          <button
            type="button"
            onClick={() => setSettings({ enhancements: { image: {}, video: {}, carousel: {} } })}
            className="ml-auto text-xs text-danger hover:text-danger/80 font-medium"
          >
            Disattiva tutti
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
              <div key={type.key} className="border border-border rounded-xl p-4">
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
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isOn}
                          onClick={() => {
                            const updated = { ...enhancements, [type.key]: { ...typeSettings, [item.key]: !isOn } };
                            setSettings({ enhancements: updated });
                          }}
                          className={`relative inline-flex items-center flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${isOn ? 'bg-accent' : 'bg-gray-300'}`}
                        >
                          <span
                            className="inline-block w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200"
                            style={{ transform: isOn ? 'translateX(22px)' : 'translateX(2px)' }}
                          />
                        </button>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

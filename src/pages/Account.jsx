import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { logAction } from '../utils/auditLog';
import { testConnection, getAdAccounts } from '../utils/metaApi';
import { facebookLogin, exchangeForLongLivedToken, initFacebookSDK } from '../utils/facebookAuth';
import PlanBadge from '../components/PlanBadge';
import UpgradeModal from '../components/UpgradeModal';

const ACCOUNT_TABS = [
  { key: 'profile', label: 'Profile', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
  { key: 'billing', label: 'Billing', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg> },
  { key: 'privacy', label: 'Privacy', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> },
];

const STATUS_LABELS = {
  1: 'Active', 2: 'Disabled', 3: 'Unsettled', 7: 'Pending Review',
  8: 'Pending Closure', 9: 'In Grace Period', 100: 'Temporarily Unavailable', 101: 'Closed',
};

const PLANS = [
  { key: 'free', name: 'Free', price: '0', period: '14-day trial', limit: '3 launches/month' },
  { key: 'pro', name: 'Pro', price: '49', period: '/month', limit: 'Unlimited launches' },
  { key: 'agency', name: 'Agency', price: '149', period: '/month', limit: 'Multi-account (coming soon)' },
];

export default function Account() {
  const { settings, setSettings, connectionStatus, setConnectionStatus, addToast, billingStatus } = useApp();
  const { user, session, signOut } = useAuth();

  // Data & Privacy state
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Facebook connection state
  const [showToken, setShowToken] = useState(false);
  const [testing, setTesting] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [adAccounts, setAdAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // Billing state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState('profile');
  const contentRef = useRef(null);

  const token = session?.access_token;

  // Preload Facebook SDK
  useEffect(() => { initFacebookSDK().catch(() => {}); }, []);

  // Load ad accounts when token changes
  useEffect(() => {
    if (!settings.accessToken) { setAdAccounts([]); return; }
    setLoadingAccounts(true);
    getAdAccounts(settings.accessToken)
      .then((accounts) => {
        setAdAccounts(accounts);
        if (accounts.length > 0 && !settings.adAccountId) {
          const firstId = accounts[0].id.replace('act_', '');
          selectAccount(firstId);
        }
      })
      .catch(() => setAdAccounts([]))
      .finally(() => setLoadingAccounts(false));
  }, [settings.accessToken]);

  // Auto-test connection on load
  useEffect(() => {
    if (settings.accessToken && settings.adAccountId && !connectionStatus?.connected) {
      testConnection(settings.accessToken, settings.adAccountId)
        .then((result) => setConnectionStatus({ connected: true, name: result.name, status: result.account_status }))
        .catch(() => {});
    }
  }, []);

  // Token expiry
  const tokenExpiresAt = settings.tokenExpiresAt ? new Date(settings.tokenExpiresAt) : null;
  const daysUntilExpiry = tokenExpiresAt ? Math.ceil((tokenExpiresAt - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  const tokenExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 7;
  const tokenExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0;

  const selectAccount = async (numericId) => {
    setSettings({ adAccountId: numericId });
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
    selectAccount(value.replace('act_', ''));
  };

  const handleManualTest = async () => {
    if (!settings.accessToken || !settings.adAccountId) {
      addToast('Enter Access Token and Ad Account ID', 'error');
      return;
    }
    setTesting(true);
    try {
      const result = await testConnection(settings.accessToken, settings.adAccountId);
      setConnectionStatus({ connected: true, name: result.name, status: result.account_status });
      addToast('Connection successful!');
    } catch (err) {
      setConnectionStatus({ connected: false });
      addToast(err.message, 'error');
    } finally {
      setTesting(false);
    }
  };

  const handleReconnectFacebook = async () => {
    setReconnecting(true);
    try {
      const { accessToken: shortToken } = await facebookLogin();
      const { accessToken, expiresIn, userName } = await exchangeForLongLivedToken(shortToken);
      const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
      setSettings({ accessToken, facebookUserName: userName, tokenExpiresAt: expiresAt });
      setConnectionStatus(null);
      addToast('Facebook reconnected!');
    } catch (err) {
      addToast(err.message || 'Reconnection failed', 'error');
    } finally {
      setReconnecting(false);
    }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const tok = sessionData?.session?.access_token;
      if (!user?.id || !tok) throw new Error('Not authenticated');
      const res = await fetch('/api/gdpr/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, supabaseToken: tok }),
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bolt-ads-data-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      logAction('gdpr.data_export', {});
      addToast('Data exported successfully');
    } catch (err) {
      addToast(err.message || 'Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setDeleting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const tok = sessionData?.session?.access_token;
      if (!user?.id || !tok) throw new Error('Not authenticated');
      logAction('gdpr.account_deletion', {});
      const res = await fetch('/api/gdpr/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, supabaseToken: tok, accessToken: settings.accessToken || null }),
      });
      if (!res.ok) throw new Error('Deletion failed');
      addToast('Account data deleted. Signing out...');
      setTimeout(() => signOut(), 1500);
    } catch (err) {
      addToast(err.message || 'Deletion failed', 'error');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
    }
  };

  const handleManageSubscription = async () => {
    if (!token) return;
    setPortalLoading(true);
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      if (result.url) window.location.href = result.url;
      else addToast(result.error || 'Failed to open portal', 'error');
    } catch {
      addToast('Failed to open billing portal', 'error');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCheckout = async (plan) => {
    if (!token) return;
    try {
      const res = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const result = await res.json();
      if (result.url) window.location.href = result.url;
      else addToast(result.error || 'Checkout failed', 'error');
    } catch {
      addToast('Failed to start checkout', 'error');
    }
  };

  const currentPlan = PLANS.find(p => p.key === billingStatus.plan) || PLANS[0];
  const inputCls = "w-full border border-border rounded-md px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-accent/[0.15] focus:border-accent";

  return (
    <div className="px-8 py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Account</h1>
        <p className="text-text-secondary text-sm mt-1">Profile, connections, billing, and privacy</p>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="flex gap-1 bg-bg/80 rounded-xl p-1 mb-6 sticky top-0 z-10 backdrop-blur-sm">
        {ACCOUNT_TABS.map((tab) => (
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
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div ref={contentRef}>

      {/* ── Profile Tab ── */}
      {activeTab === 'profile' && (<>
      <div className="glass-card rounded-xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h2 className="text-[16px] font-semibold">Profile</h2>
            <p className="text-xs text-text-secondary">Your account information</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-bg rounded-lg px-4 py-3">
            <p className="text-xs text-text-secondary">Email</p>
            <p className="text-sm font-medium mt-0.5 truncate">{user?.email || '—'}</p>
          </div>
          {settings.facebookUserName && (
            <div className="bg-bg rounded-lg px-4 py-3">
              <p className="text-xs text-text-secondary">Facebook</p>
              <p className="text-sm font-medium mt-0.5 truncate">{settings.facebookUserName}</p>
            </div>
          )}
          {settings.adAccountId && (
            <div className="bg-bg rounded-lg px-4 py-3">
              <p className="text-xs text-text-secondary">Ad Account</p>
              <p className="text-sm font-medium mt-0.5">act_{settings.adAccountId}</p>
            </div>
          )}
          {settings.facebookPageName && (
            <div className="bg-bg rounded-lg px-4 py-3">
              <p className="text-xs text-text-secondary">Facebook Page</p>
              <p className="text-sm font-medium mt-0.5 truncate">{settings.facebookPageName}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Section 2: Facebook Connection ── */}
      <div className="glass-card rounded-xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-[#1877f2]/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-[#1877f2]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-[16px] font-semibold">Facebook Connection</h2>
            {settings.facebookUserName ? (
              <p className="text-xs text-text-secondary">Signed in as <span className="font-medium text-text">{settings.facebookUserName}</span></p>
            ) : (
              <p className="text-xs text-text-secondary">Connect your Facebook account to use the API</p>
            )}
          </div>
          {settings.facebookUserName && (
            <button
              onClick={handleReconnectFacebook}
              disabled={reconnecting}
              className="px-4 py-2 text-sm font-medium text-accent hover:text-accent-hover border border-accent/20 rounded-md hover:bg-accent/5 transition-colors disabled:opacity-50"
            >
              {reconnecting ? 'Connecting...' : 'Reconnect'}
            </button>
          )}
        </div>

        {/* Token expiry warnings */}
        {tokenExpired && (
          <div className="bg-danger/10 border border-danger/20 rounded-lg p-3 mb-3">
            <p className="text-sm text-danger font-medium">Token expired. Please reconnect your Facebook account.</p>
          </div>
        )}
        {tokenExpiringSoon && !tokenExpired && (
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 mb-3">
            <p className="text-sm text-warning font-medium">Token expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}. Consider reconnecting soon.</p>
          </div>
        )}

        {/* Connected status banner */}
        {connectionStatus?.connected && (
          <div className="bg-success/10 border border-success/20 rounded-lg p-3 mb-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-success">Account connected</p>
              <p className="text-xs text-text-secondary">{connectionStatus.name} &bull; act_{settings.adAccountId} &bull; {STATUS_LABELS[connectionStatus.status] || 'Unknown'}</p>
            </div>
          </div>
        )}

        {/* Linked resources */}
        {settings.facebookUserName && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            {settings.adAccountId && (
              <div className="bg-bg rounded-lg px-3 py-2">
                <p className="text-xs text-text-secondary">Ad Account</p>
                <p className="text-sm font-medium truncate">act_{settings.adAccountId}</p>
              </div>
            )}
            {settings.facebookPageName && (
              <div className="bg-bg rounded-lg px-3 py-2">
                <p className="text-xs text-text-secondary">Facebook Page</p>
                <p className="text-sm font-medium truncate">{settings.facebookPageName}</p>
              </div>
            )}
            {settings.instagramAccountName && (
              <div className="bg-bg rounded-lg px-3 py-2">
                <p className="text-xs text-text-secondary">Instagram</p>
                <p className="text-sm font-medium truncate">{settings.instagramAccountName}</p>
              </div>
            )}
            {settings.pixelName && (
              <div className="bg-bg rounded-lg px-3 py-2">
                <p className="text-xs text-text-secondary">Pixel</p>
                <p className="text-sm font-medium truncate">{settings.pixelName}</p>
              </div>
            )}
          </div>
        )}

        {/* Advanced: Manual Token (for users without FB login) */}
        {!settings.facebookUserName && (
          <details className="border border-border rounded-lg">
            <summary className="p-4 cursor-pointer select-none">
              <span className="text-sm font-semibold">Advanced: Manual Token & Ad Account</span>
              <span className="text-xs text-text-secondary ml-2">Configure credentials manually</span>
            </summary>
            <div className="px-4 pb-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5">Access Token</label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={settings.accessToken}
                    onChange={(e) => { setSettings({ accessToken: e.target.value }); setConnectionStatus(null); }}
                    className={`${inputCls} pr-20`}
                    placeholder="Enter your access token..."
                  />
                  <button onClick={() => setShowToken(!showToken)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-accent hover:text-accent-hover px-2 py-1">
                    {showToken ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">Ad Account</label>
                {adAccounts.length > 0 ? (
                  <select value={settings.adAccountId ? `act_${settings.adAccountId}` : ''} onChange={(e) => handleAccountChange(e.target.value)} className={inputCls}>
                    <option value="">Select an ad account...</option>
                    {adAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>{acc.name} ({acc.id}) — {STATUS_LABELS[acc.account_status] || 'Unknown'}</option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-text-secondary">act_</span>
                    <input type="text" value={settings.adAccountId}
                      onChange={(e) => setSettings({ adAccountId: e.target.value.replace(/\D/g, '') })}
                      className={`flex-1 ${inputCls}`} placeholder="123456789" />
                  </div>
                )}
                {loadingAccounts && <p className="text-xs text-text-secondary mt-1">Loading ad accounts...</p>}
              </div>

              <div className="pt-2">
                <button onClick={handleManualTest} disabled={testing}
                  className="px-5 py-2.5 bg-accent text-white rounded-md text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50">
                  {testing ? 'Testing...' : 'Test Connection'}
                </button>
              </div>
            </div>
          </details>
        )}
      </div>

      </>)}

      {/* ── Billing Tab ── */}
      {activeTab === 'billing' && (
      <div className="glass-card rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-[16px] font-semibold">Subscription & Billing</h2>
              <p className="text-xs text-text-secondary">Manage your plan and usage</p>
            </div>
          </div>
          <PlanBadge plan={billingStatus.plan} />
        </div>

        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="bg-bg rounded-lg px-4 py-3">
            <p className="text-xs text-text-secondary">Plan</p>
            <p className="text-sm font-bold mt-0.5">{currentPlan.name}</p>
          </div>
          <div className="bg-bg rounded-lg px-4 py-3">
            <p className="text-xs text-text-secondary">Price</p>
            <p className="text-sm font-bold mt-0.5">{currentPlan.price === '0' ? 'Free' : `€${currentPlan.price}${currentPlan.period}`}</p>
          </div>
          <div className="bg-bg rounded-lg px-4 py-3">
            <p className="text-xs text-text-secondary">Launches This Month</p>
            <p className="text-sm font-bold mt-0.5">
              {billingStatus.launchesThisMonth}
              {billingStatus.launchLimit ? ` / ${billingStatus.launchLimit}` : ' (unlimited)'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-5">
          {billingStatus.hasStripe && (
            <button onClick={handleManageSubscription} disabled={portalLoading}
              className="px-4 py-2 text-sm font-medium text-accent border border-accent/20 rounded-md hover:bg-accent/5 transition-colors disabled:opacity-50">
              {portalLoading ? 'Opening...' : 'Manage Subscription'}
            </button>
          )}
          {billingStatus.plan === 'free' && (
            <button onClick={() => setShowUpgradeModal(true)}
              className="px-4 py-2 text-sm font-medium bg-accent text-white rounded-md hover:bg-accent-hover transition-colors">
              Upgrade Plan
            </button>
          )}
        </div>

        {/* Plans comparison */}
        <div className="border-t border-border pt-5">
          <h3 className="text-sm font-bold mb-4">Available Plans</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PLANS.map((plan) => {
              const isCurrent = plan.key === billingStatus.plan;
              return (
                <div key={plan.key}
                  className={`rounded-lg border p-5 flex flex-col ${isCurrent ? 'border-accent bg-accent/5 ring-1 ring-accent/20' : 'border-border'}`}>
                  <h3 className="text-lg font-bold">{plan.name}</h3>
                  <div className="mt-1 mb-3">
                    <span className="text-2xl font-bold">{plan.price === '0' ? 'Free' : `€${plan.price}`}</span>
                    {plan.price !== '0' && <span className="text-sm text-text-secondary ml-1">{plan.period}</span>}
                  </div>
                  <p className="text-sm text-text-secondary mb-4">{plan.limit}</p>
                  {isCurrent ? (
                    <button disabled className="w-full py-2 text-sm font-medium rounded-md border border-border text-text-secondary mt-auto">Current Plan</button>
                  ) : plan.price !== '0' ? (
                    <button onClick={() => handleCheckout(plan.key)}
                      className="w-full py-2 text-sm font-medium bg-accent text-white rounded-md hover:bg-accent-hover transition-colors mt-auto">
                      Upgrade
                    </button>
                  ) : (
                    <div className="mt-auto" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      )}

      {/* ── Privacy Tab ── */}
      {activeTab === 'privacy' && (
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h2 className="text-[16px] font-semibold">Data & Privacy</h2>
            <p className="text-xs text-text-secondary">Manage your data and account</p>
          </div>
        </div>

        <div className="flex gap-4 mb-5">
          <Link to="/privacy" className="text-sm text-accent hover:underline">Privacy Policy</Link>
          <Link to="/terms" className="text-sm text-accent hover:underline">Terms of Service</Link>
        </div>

        <div className="border border-border rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Export your data</p>
              <p className="text-xs text-text-secondary mt-0.5">Download all your data as JSON (settings, campaigns, audit logs)</p>
            </div>
            <button onClick={handleExportData} disabled={exporting}
              className="px-4 py-2 text-sm font-medium text-accent border border-accent/20 rounded-md hover:bg-accent/5 transition-colors disabled:opacity-50">
              {exporting ? 'Exporting...' : 'Export Data'}
            </button>
          </div>
        </div>

        <div className="border border-danger/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-danger">Delete account</p>
              <p className="text-xs text-text-secondary mt-0.5">Permanently delete your account and all associated data</p>
            </div>
            {!showDeleteConfirm ? (
              <button onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 text-sm font-medium text-danger border border-danger/20 rounded-md hover:bg-danger/5 transition-colors">
                Delete Account
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input type="text" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder='Type "DELETE"'
                  className="w-32 border border-danger/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-danger/30" />
                <button onClick={handleDeleteAccount} disabled={deleteConfirmText !== 'DELETE' || deleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-danger rounded-md hover:bg-danger/90 transition-colors disabled:opacity-50">
                  {deleting ? 'Deleting...' : 'Confirm'}
                </button>
                <button onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                  className="px-3 py-2 text-sm text-text-secondary hover:text-text">Cancel</button>
              </div>
            )}
          </div>
        </div>
      </div>

      )}

      </div>{/* end tab content */}

      <UpgradeModal
        open={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentPlan={billingStatus.plan}
        onSelectPlan={handleCheckout}
      />
    </div>
  );
}

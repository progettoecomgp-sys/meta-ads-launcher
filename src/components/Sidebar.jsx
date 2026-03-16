import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useFeatureFlags } from '../context/FeatureFlagContext';
import { testConnection } from '../utils/metaApi';
import PlanBadge from './PlanBadge';

const mainNav = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    to: '/upload',
    label: 'Upload',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
  },
  {
    to: '/history',
    label: 'History',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    to: '/campaigns',
    label: 'Campaigns',
    featureFlag: 'campaigns-page',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
      </svg>
    ),
  },
  {
    to: '/metrics',
    label: 'Metrics',
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

function SidebarLink({ to, icon, label, className = '' }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium transition-colors ${
          isActive
            ? 'bg-accent/[0.15] text-accent'
            : 'text-text-secondary hover:bg-black/[0.03] hover:text-text'
        } ${className}`
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}

export default function Sidebar() {
  const { connectionStatus, setConnectionStatus, settings, setSettings, billingStatus, prefetchedAdAccounts } = useApp();
  const { user, session, signOut } = useAuth();
  const { flags } = useFeatureFlags();
  const navigate = useNavigate();
  const adAccounts = prefetchedAdAccounts;
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check admin status
  useEffect(() => {
    const token = session?.access_token;
    if (!token) return;
    fetch('/api/admin/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? setIsAdmin(true) : setIsAdmin(false))
      .catch(() => setIsAdmin(false));
  }, [session?.access_token]);

  const handleAccountChange = async (accountId) => {
    const numericId = accountId.replace('act_', '');
    setSettings({ adAccountId: numericId });
    setShowAccountPicker(false);
    try {
      const result = await testConnection(settings.accessToken, numericId);
      setConnectionStatus({ connected: true, name: result.name, status: result.account_status });
    } catch {
      setConnectionStatus({ connected: false });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const currentAccountName = connectionStatus?.connected
    ? connectionStatus.name
    : adAccounts.find((a) => a.id === `act_${settings.adAccountId}`)?.name
    || (settings.adAccountId ? `act_${settings.adAccountId}` : 'Not configured');

  return (
    <aside className="w-[244px] h-screen glass-sidebar flex flex-col fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-[15px] font-bold leading-tight">BoltAds</h1>
          {import.meta.env.VITE_APP_ENV === 'staging' && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-warning/15 text-warning rounded">STG</span>
          )}
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-text-tertiary px-3 mb-2">Main</p>
        {mainNav.filter((item) => !item.featureFlag || flags[item.featureFlag]).map((item) => (
          <SidebarLink key={item.to} {...item} />
        ))}

        {isAdmin && (
          <>
            <p className="text-[11px] font-medium uppercase tracking-[0.05em] text-text-tertiary px-3 mt-5 mb-2">Admin</p>
            <SidebarLink
              to="/admin"
              icon={
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              }
              label="Admin"
            />
          </>
        )}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-border">
        {/* Bottom nav links */}
        <div className="px-3 py-3 space-y-0.5">
          <SidebarLink
            to="/account"
            icon={
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
            label={
              <span className="flex items-center justify-between flex-1">
                Account
                <PlanBadge plan={billingStatus?.plan} />
              </span>
            }
          />
          <SidebarLink
            to="/settings"
            icon={
              <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            }
            label="Settings"
          />
        </div>

        {/* Ad Account selector + user */}
        <div className="px-4 py-3 border-t border-border space-y-3">
          {/* Ad Account selector */}
          <div className="relative">
            <p className="text-[11px] text-text-tertiary uppercase tracking-[0.05em] font-medium mb-1">Ad Account</p>
            <button
              onClick={() => setShowAccountPicker(!showAccountPicker)}
              className="w-full flex items-center justify-between px-2.5 py-2 bg-card rounded-md hover:bg-black/[0.03] transition-colors text-left border border-border-secondary"
            >
              <p className="text-[12px] font-medium truncate flex-1">{currentAccountName}</p>
              <svg className={`w-3.5 h-3.5 text-text-tertiary flex-shrink-0 transition-transform ${showAccountPicker ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showAccountPicker && adAccounts.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-card border border-border rounded-md shadow-md max-h-48 overflow-y-auto z-50">
                {adAccounts.map((acc) => {
                  const numericId = acc.id.replace('act_', '');
                  const isSelected = numericId === settings.adAccountId;
                  return (
                    <button
                      key={acc.id}
                      onClick={() => handleAccountChange(acc.id)}
                      className={`w-full text-left px-3 py-2 text-[12px] hover:bg-accent/5 transition-colors ${
                        isSelected ? 'bg-accent/10 text-accent font-medium' : 'text-text'
                      }`}
                    >
                      <p className="font-medium truncate">{acc.name}</p>
                      <p className="text-[10px] text-text-tertiary">{acc.id}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Connection status */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${settings.accessToken ? 'bg-success' : 'bg-danger'}`} />
            <span className="text-[12px] text-text-secondary truncate">
              {settings.accessToken ? settings.facebookUserName || 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* User info & logout */}
          {user && (
            <div className="pt-2 border-t border-border">
              <p className="text-[12px] text-text-secondary truncate mb-2" title={settings.facebookUserName || user.email}>
                {settings.facebookUserName || user.email}
              </p>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-2 py-1.5 text-[12px] text-text-secondary hover:text-danger hover:bg-danger/5 rounded-md transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

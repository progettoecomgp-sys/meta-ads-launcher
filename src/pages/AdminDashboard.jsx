import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { useFeatureFlags } from '../context/FeatureFlagContext';
import Modal from '../components/Modal';

export default function AdminDashboard() {
  const { session } = useAuth();
  const { startImpersonation, addToast } = useApp();
  const { rawFlags, reloadFlags } = useFeatureFlags();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditUser, setAuditUser] = useState(null);
  const [auditLoading, setAuditLoading] = useState(false);

  // 2FA state
  const [twoFaSetup, setTwoFaSetup] = useState(null); // { uri, secret }
  const [twoFaCode, setTwoFaCode] = useState('');
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [twoFaLoading, setTwoFaLoading] = useState(false);
  const [backupCodes, setBackupCodes] = useState(null);
  const [disableCode, setDisableCode] = useState('');

  // Feature flags state
  const [flagForm, setFlagForm] = useState({ key: '', label: '', description: '' });
  const [flagLoading, setFlagLoading] = useState(false);
  const [showCreateFlag, setShowCreateFlag] = useState(false);

  const token = session?.access_token;

  // Check admin access
  useEffect(() => {
    if (!token) return;
    fetch('/api/admin/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (!r.ok) throw new Error('Not admin');
        return r.json();
      })
      .then(() => {
        setAuthorized(true);
        setLoading(false);
      })
      .catch(() => {
        navigate('/dashboard', { replace: true });
      });
  }, [token, navigate]);

  // Load stats + users
  useEffect(() => {
    if (!authorized || !token) return;
    Promise.all([
      fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null),
      fetch('/api/admin/users', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : []),
    ]).then(([s, u]) => {
      setStats(s);
      setUsers(u || []);
    });
  }, [authorized, token]);

  const openAuditLogs = async (user) => {
    setAuditUser(user);
    setAuditLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}/audit-logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setAuditLogs(await res.json());
    } catch {
      setAuditLogs([]);
    }
    setAuditLoading(false);
  };

  const handleImpersonate = (userId) => {
    startImpersonation(userId, token);
    addToast('Impersonation started — read-only mode');
  };

  // 2FA handlers
  const handleSetup2FA = async () => {
    setTwoFaLoading(true);
    try {
      const res = await fetch('/api/admin/2fa/setup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Setup failed');
      const data = await res.json();
      setTwoFaSetup(data);
    } catch (err) {
      addToast(err.message, 'error');
    }
    setTwoFaLoading(false);
  };

  const handleEnable2FA = async () => {
    if (!twoFaCode || !twoFaSetup?.secret) return;
    setTwoFaLoading(true);
    try {
      const res = await fetch('/api/admin/2fa/enable', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: twoFaSetup.secret, code: twoFaCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setTwoFaEnabled(true);
      setBackupCodes(data.backupCodes);
      setTwoFaSetup(null);
      setTwoFaCode('');
      addToast('2FA enabled successfully');
    } catch (err) {
      addToast(err.message, 'error');
    }
    setTwoFaLoading(false);
  };

  const handleDisable2FA = async () => {
    if (!disableCode) return;
    setTwoFaLoading(true);
    try {
      const res = await fetch('/api/admin/2fa/disable', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: disableCode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setTwoFaEnabled(false);
      setDisableCode('');
      addToast('2FA disabled');
    } catch (err) {
      addToast(err.message, 'error');
    }
    setTwoFaLoading(false);
  };

  // Feature flag handlers
  const handleToggleFlag = async (key, currentEnabled) => {
    setFlagLoading(true);
    try {
      const res = await fetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, enabled: !currentEnabled }),
      });
      if (!res.ok) throw new Error('Toggle failed');
      await reloadFlags();
      addToast(`Flag "${key}" ${!currentEnabled ? 'enabled' : 'disabled'}`);
    } catch (err) {
      addToast(err.message, 'error');
    }
    setFlagLoading(false);
  };

  const handleCreateFlag = async (e) => {
    e.preventDefault();
    if (!flagForm.key || !flagForm.label) return;
    setFlagLoading(true);
    try {
      const res = await fetch('/api/admin/feature-flags', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...flagForm, enabled: false }),
      });
      if (!res.ok) throw new Error('Create failed');
      setFlagForm({ key: '', label: '', description: '' });
      setShowCreateFlag(false);
      await reloadFlags();
      addToast(`Flag "${flagForm.key}" created`);
    } catch (err) {
      addToast(err.message, 'error');
    }
    setFlagLoading(false);
  };

  const handleDeleteFlag = async (key) => {
    setFlagLoading(true);
    try {
      const res = await fetch(`/api/admin/feature-flags/${encodeURIComponent(key)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Delete failed');
      await reloadFlags();
      addToast(`Flag "${key}" deleted`);
    } catch (err) {
      addToast(err.message, 'error');
    }
    setFlagLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-8 py-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
        <p className="text-sm text-text-secondary mt-0.5">System overview and user management</p>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-card rounded-xl p-5">
            <p className="text-xs text-text-secondary uppercase tracking-wider">Total Users</p>
            <p className="text-2xl font-bold mt-1">{stats.totalUsers}</p>
          </div>
          <div className="glass-card rounded-xl p-5">
            <p className="text-xs text-text-secondary uppercase tracking-wider">Total Launches</p>
            <p className="text-2xl font-bold mt-1">{stats.totalLaunches}</p>
          </div>
        </div>
      )}

      {/* User table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold">Users ({users.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-text-secondary">Email</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-text-secondary">Facebook Name</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-text-secondary">Onboarding</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-text-secondary">Joined</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-text-secondary">Last Sign In</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-b border-border last:border-0 hover:bg-bg/50">
                  <td className="px-4 py-2.5 font-medium">{user.email}</td>
                  <td className="px-4 py-2.5 text-text-secondary">{user.facebookName || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.onboardingCompleted ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                    }`}>
                      {user.onboardingCompleted ? 'Complete' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-text-secondary text-xs">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-text-secondary text-xs">
                    {user.lastSignIn ? new Date(user.lastSignIn).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openAuditLogs(user)}
                        className="text-xs text-accent hover:text-accent/80 font-medium"
                      >
                        Audit Logs
                      </button>
                      <button
                        onClick={() => handleImpersonate(user.id)}
                        className="text-xs text-warning hover:text-warning/80 font-medium"
                      >
                        View as
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-text-secondary">No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2FA Section */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold">Two-Factor Authentication</h2>
            <p className="text-xs text-text-secondary">
              {twoFaEnabled ? 'Enabled — your admin account is protected' : 'Add an extra layer of security to your admin account'}
            </p>
          </div>
        </div>

        {/* Setup flow */}
        {!twoFaEnabled && !twoFaSetup && (
          <button
            onClick={handleSetup2FA}
            disabled={twoFaLoading}
            className="px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {twoFaLoading ? 'Loading...' : 'Enable 2FA'}
          </button>
        )}

        {twoFaSetup && (
          <div className="space-y-4">
            <div className="bg-bg rounded-lg p-4">
              <p className="text-sm font-medium mb-2">Scan this URI in your authenticator app:</p>
              <code className="text-xs break-all bg-white border border-border rounded px-2 py-1 block">{twoFaSetup.uri}</code>
              <p className="text-xs text-text-secondary mt-2">Or enter this secret manually: <code className="font-mono bg-white px-1 rounded">{twoFaSetup.secret}</code></p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={twoFaCode}
                onChange={e => setTwoFaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit code"
                className="w-40 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 font-mono"
              />
              <button
                onClick={handleEnable2FA}
                disabled={twoFaCode.length !== 6 || twoFaLoading}
                className="px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
              >
                Verify & Enable
              </button>
              <button
                onClick={() => { setTwoFaSetup(null); setTwoFaCode(''); }}
                className="text-sm text-text-secondary hover:text-text"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Backup codes display (shown once after enable) */}
        {backupCodes && (
          <div className="mt-4 bg-warning/5 border border-warning/20 rounded-lg p-4">
            <p className="text-sm font-semibold text-warning mb-2">Save your backup codes — they won't be shown again:</p>
            <div className="grid grid-cols-4 gap-2">
              {backupCodes.map((code, i) => (
                <code key={i} className="text-xs font-mono bg-white border border-border rounded px-2 py-1 text-center">{code}</code>
              ))}
            </div>
            <button
              onClick={() => setBackupCodes(null)}
              className="mt-3 text-xs text-accent hover:underline"
            >
              I've saved them
            </button>
          </div>
        )}

        {/* Disable 2FA */}
        {twoFaEnabled && !backupCodes && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-xs text-text-secondary mb-2">To disable 2FA, enter a current code:</p>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={disableCode}
                onChange={e => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-digit code"
                className="w-40 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-danger/30 font-mono"
              />
              <button
                onClick={handleDisable2FA}
                disabled={disableCode.length !== 6 || twoFaLoading}
                className="px-4 py-2 text-sm font-medium text-danger border border-danger/20 rounded-lg hover:bg-danger/5 transition-colors disabled:opacity-50"
              >
                Disable 2FA
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Feature Flags Section — 2-column layout */}
      <div className="glass-card rounded-xl p-6 max-w-xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold">Feature Flags</h2>
              <p className="text-xs text-text-secondary">Admin always sees all features.</p>
            </div>
          </div>
          <button
            onClick={() => setShowCreateFlag(f => !f)}
            className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
          >
            {showCreateFlag ? 'Cancel' : '+ New flag'}
          </button>
        </div>

        {/* Create flag form (collapsible) */}
        {showCreateFlag && (
          <form onSubmit={handleCreateFlag} className="mb-5 p-4 bg-bg rounded-lg border border-border space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-text-secondary mb-1 block">Key</label>
                <input
                  type="text"
                  value={flagForm.key}
                  onChange={e => setFlagForm(f => ({ ...f, key: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
                  placeholder="my-feature"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-text-secondary mb-1 block">Label</label>
                <input
                  type="text"
                  value={flagForm.label}
                  onChange={e => setFlagForm(f => ({ ...f, label: e.target.value }))}
                  placeholder="My Feature"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1 block">Description</label>
              <input
                type="text"
                value={flagForm.description}
                onChange={e => setFlagForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional description"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              />
            </div>
            <button
              type="submit"
              disabled={!flagForm.key || !flagForm.label || flagLoading}
              className="w-full px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
            >
              Create Flag
            </button>
          </form>
        )}

        {/* Flags list — toggle | label */}
        {rawFlags.length > 0 ? (
          <div className="space-y-0 divide-y divide-border">
            {rawFlags.map(flag => (
              <div key={flag.key} className="flex items-center gap-4 py-3">
                {/* Toggle */}
                <button
                  onClick={() => handleToggleFlag(flag.key, flag.enabled)}
                  disabled={flagLoading}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${
                    flag.enabled ? 'bg-success' : 'bg-border'
                  }`}
                >
                  <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                    flag.enabled ? 'translate-x-4.5' : 'translate-x-0.5'
                  }`} />
                </button>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{flag.label}</p>
                    <code className="text-[10px] text-text-tertiary font-mono bg-bg px-1.5 py-0.5 rounded">{flag.key}</code>
                  </div>
                  {flag.description && (
                    <p className="text-xs text-text-secondary mt-0.5">{flag.description}</p>
                  )}
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDeleteFlag(flag.key)}
                  disabled={flagLoading}
                  className="flex-shrink-0 p-1.5 text-text-tertiary hover:text-danger hover:bg-danger/5 rounded-md transition-colors"
                  title="Delete flag"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-secondary text-center py-6">No feature flags yet.</p>
        )}
      </div>

      {/* Audit logs modal */}
      <Modal
        open={!!auditUser}
        onClose={() => { setAuditUser(null); setAuditLogs([]); }}
        title={`Audit Logs — ${auditUser?.email || ''}`}
        maxWidth="max-w-2xl"
      >
        {auditLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        ) : auditLogs.length === 0 ? (
          <p className="text-sm text-text-secondary py-4 text-center">No audit logs found</p>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {auditLogs.map((log, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{log.action}</p>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <p className="text-xs text-text-secondary mt-0.5 truncate font-mono">
                      {JSON.stringify(log.details)}
                    </p>
                  )}
                </div>
                <time className="text-xs text-text-secondary flex-shrink-0">
                  {new Date(log.created_at).toLocaleString()}
                </time>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

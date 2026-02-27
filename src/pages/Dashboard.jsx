import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import StatCard from '../components/StatCard';
import * as api from '../utils/metaApi';

export default function Dashboard() {
  const { settings, isConfigured, addToast, history } = useApp();
  const navigate = useNavigate();
  const [insights, setInsights] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isConfigured) return;
    setLoading(true);

    Promise.all([
      api.getInsights(settings.accessToken, settings.adAccountId, { datePreset: 'last_7d', level: 'account' }).catch(() => []),
      api.getCampaigns(settings.accessToken, settings.adAccountId).catch(() => []),
    ])
      .then(([insData, campData]) => {
        setInsights(insData[0] || null);
        setCampaigns(campData.slice(0, 5));
      })
      .catch((err) => addToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [isConfigured, settings.accessToken, settings.adAccountId, addToast]);

  const formatNum = (n) => {
    if (!n) return '0';
    const num = Number(n);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatCurrency = (n) => {
    if (!n) return '\u20AC0.00';
    return `\u20AC${Number(n).toFixed(2)}`;
  };

  return (
    <div className="p-6">
      {!isConfigured && (
        <div className="mb-4 px-4 py-3 bg-warning/10 border border-warning/20 rounded-lg flex items-center gap-3 text-sm">
          <svg className="w-5 h-5 text-warning flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="text-text-secondary">API not configured — data shown is demo only.</span>
          <button onClick={() => navigate('/settings')} className="ml-auto text-accent font-medium hover:underline whitespace-nowrap">Go to Settings</button>
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-text-secondary text-sm mt-1">Overview of your ad performance</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/upload')}
            className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors"
          >
            Upload Creatives
          </button>
        </div>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-border p-5 animate-pulse">
              <div className="h-3 bg-bg rounded w-16 mb-3" />
              <div className="h-6 bg-bg rounded w-20" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <StatCard label="Spend" value={formatCurrency(insights?.spend)} />
          <StatCard label="Impressions" value={formatNum(insights?.impressions)} />
          <StatCard label="Clicks" value={formatNum(insights?.clicks)} />
          <StatCard label="CTR" value={insights?.ctr ? `${Number(insights.ctr).toFixed(2)}%` : '0%'} />
          <StatCard label="CPC" value={formatCurrency(insights?.cpc)} />
          <StatCard label="Reach" value={formatNum(insights?.reach)} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent campaigns */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h2 className="text-sm font-semibold mb-4">Recent Campaigns</h2>
          {campaigns.length === 0 ? (
            <p className="text-sm text-text-secondary">No campaigns found.</p>
          ) : (
            <div className="space-y-2">
              {campaigns.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm font-medium">{c.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    c.status === 'ACTIVE'
                      ? 'bg-success/10 text-success'
                      : 'bg-text-secondary/10 text-text-secondary'
                  }`}>
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent launches */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h2 className="text-sm font-semibold mb-4">Recent Launches</h2>
          {history.length === 0 ? (
            <p className="text-sm text-text-secondary">No launches yet.</p>
          ) : (
            <div className="space-y-2">
              {history.slice(0, 5).map((h, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{h.campaignName || 'Campaign'}</p>
                    <p className="text-xs text-text-secondary">{new Date(h.date).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{h.adsCount} ads</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      h.status === 'ACTIVE'
                        ? 'bg-success/10 text-success'
                        : 'bg-text-secondary/10 text-text-secondary'
                    }`}>
                      {h.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

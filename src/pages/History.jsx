import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { getAdStatuses } from '../utils/metaApi';

const STATUS_COLORS = {
  ACTIVE: 'bg-success/10 text-success',
  PENDING_REVIEW: 'bg-warning/10 text-warning',
  DISAPPROVED: 'bg-danger/10 text-danger',
  PAUSED: 'bg-gray-100 text-gray-500',
  WITH_ISSUES: 'bg-orange-100 text-orange-600',
  ARCHIVED: 'bg-gray-100 text-gray-400',
  DELETED: 'bg-gray-100 text-gray-400',
  IN_PROCESS: 'bg-blue-50 text-blue-600',
  CAMPAIGN_PAUSED: 'bg-gray-100 text-gray-500',
  ADSET_PAUSED: 'bg-gray-100 text-gray-500',
};

function AdStatusBadge({ status }) {
  const label = status?.replace(/_/g, ' ') || 'UNKNOWN';
  const cls = STATUS_COLORS[status] || 'bg-gray-100 text-gray-500';
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

export default function History() {
  const { history, settings } = useApp();
  const [refreshing, setRefreshing] = useState({});
  const [adStatuses, setAdStatuses] = useState({});

  const bmLink = (id, type) => {
    if (!settings.adAccountId) return null;
    const base = 'https://business.facebook.com/adsmanager/manage';
    if (type === 'campaign') return `${base}/campaigns?act=${settings.adAccountId}&selected_campaign_ids=${id}`;
    if (type === 'adset') return `${base}/adsets?act=${settings.adAccountId}&selected_adset_ids=${id}`;
    return `${base}/ads?act=${settings.adAccountId}&selected_ad_ids=${id}`;
  };

  const handleRefreshStatus = async (entryIndex) => {
    const entry = history[entryIndex];
    if (!entry?.results?.length || !settings.accessToken) return;

    const adIds = entry.results.map(r => r.adId).filter(Boolean);
    if (adIds.length === 0) return;

    setRefreshing(prev => ({ ...prev, [entryIndex]: true }));
    try {
      const statuses = await getAdStatuses(settings.accessToken, adIds);
      setAdStatuses(prev => ({ ...prev, ...statuses }));
    } catch (err) {
      console.error('Failed to refresh statuses:', err);
    } finally {
      setRefreshing(prev => ({ ...prev, [entryIndex]: false }));
    }
  };

  return (
    <div className="px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Launch History</h1>
        <p className="text-text-secondary text-sm mt-1">All your previous ad launches</p>
      </div>

      {history.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-bg rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-text-secondary text-sm">No launches yet. Go to Upload to create your first ads.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((entry, i) => (
            <div key={i} className="glass-card rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold">{entry.campaignName || 'Campaign'}</h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {new Date(entry.date).toLocaleString()}
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  entry.status === 'ACTIVE'
                    ? 'bg-success/10 text-success'
                    : 'bg-text-secondary/10 text-text-secondary'
                }`}>
                  {entry.status}
                </span>
              </div>

              <div className="flex gap-6 text-sm mb-3">
                <div>
                  <span className="text-text-secondary">Ads Created: </span>
                  <span className="font-medium">{entry.adsCount}</span>
                </div>
                {entry.campaignId && (
                  <div>
                    <span className="text-text-secondary">Campaign: </span>
                    <a
                      href={bmLink(entry.campaignId, 'campaign')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline"
                    >
                      View in BM
                    </a>
                  </div>
                )}
              </div>

              {entry.results && entry.results.length > 0 && (
                <div className="border-t border-border pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-text-secondary">Created Ads:</p>
                    <button
                      onClick={() => handleRefreshStatus(i)}
                      disabled={refreshing[i]}
                      className="flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover font-medium disabled:opacity-50"
                    >
                      {refreshing[i] ? (
                        <div className="w-3 h-3 border border-accent/30 border-t-accent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      )}
                      Refresh Status
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {entry.results.map((r, j) => {
                      const liveStatus = adStatuses[r.adId]?.effective_status;
                      return (
                        <div key={j} className="flex items-center justify-between text-sm">
                          <span className="text-text-secondary truncate flex-1 mr-3">{r.fileName}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {liveStatus && <AdStatusBadge status={liveStatus} />}
                            <a
                              href={bmLink(r.adId, 'ad')}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-accent text-xs hover:underline"
                            >
                              Ad #{r.adId}
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

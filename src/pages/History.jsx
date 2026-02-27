import { useApp } from '../context/AppContext';

export default function History() {
  const { history, settings } = useApp();

  const bmLink = (id, type) => {
    if (!settings.adAccountId) return null;
    const base = 'https://business.facebook.com/adsmanager/manage';
    if (type === 'campaign') return `${base}/campaigns?act=${settings.adAccountId}&selected_campaign_ids=${id}`;
    if (type === 'adset') return `${base}/adsets?act=${settings.adAccountId}&selected_adset_ids=${id}`;
    return `${base}/ads?act=${settings.adAccountId}&selected_ad_ids=${id}`;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Launch History</h1>
        <p className="text-text-secondary text-sm mt-1">All your previous ad launches</p>
      </div>

      {history.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
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
            <div key={i} className="bg-white rounded-xl border border-border p-5">
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
                  <p className="text-xs text-text-secondary mb-2">Created Ads:</p>
                  <div className="space-y-1.5">
                    {entry.results.map((r, j) => (
                      <div key={j} className="flex items-center justify-between text-sm">
                        <span className="text-text-secondary">{r.fileName}</span>
                        <a
                          href={bmLink(r.adId, 'ad')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent text-xs hover:underline"
                        >
                          Ad #{r.adId}
                        </a>
                      </div>
                    ))}
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

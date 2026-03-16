import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import * as api from '../utils/metaApi';

const DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_3d', label: 'Last 3 Days' },
  { value: 'last_7d', label: 'Last 7 Days' },
  { value: 'last_14d', label: 'Last 14 Days' },
  { value: 'last_30d', label: 'Last 30 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
];

const TABS = [
  { key: 'campaign', label: 'Campaigns', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg> },
  { key: 'adset', label: 'Ad Sets', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg> },
  { key: 'ad', label: 'Ads', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
];

const STATUS_COLORS = {
  ACTIVE: 'bg-success/10 text-success',
  PAUSED: 'bg-warning/10 text-warning',
  DELETED: 'bg-danger/10 text-danger',
  ARCHIVED: 'bg-gray-100 text-gray-500',
};

function formatCurrency(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '—';
  return `€${n.toFixed(2)}`;
}

function formatNumber(val) {
  const n = parseInt(val, 10);
  if (isNaN(n)) return '—';
  return n.toLocaleString();
}

function formatPercent(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '—';
  return `${n.toFixed(2)}%`;
}

function getResults(actionsArr) {
  if (!Array.isArray(actionsArr)) return 0;
  for (const a of actionsArr) {
    if (['lead', 'purchase', 'link_click'].includes(a.action_type)) {
      return parseInt(a.value, 10);
    }
  }
  return 0;
}

function sortRows(rows, sortBy, sortDir) {
  return [...rows].sort((a, b) => {
    let valA, valB;
    if (sortBy === 'name') {
      valA = (a._name || '').toLowerCase();
      valB = (b._name || '').toLowerCase();
      return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    if (sortBy === 'status') {
      valA = a._status || '';
      valB = b._status || '';
      return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    valA = parseFloat(a[sortBy] || 0);
    valB = parseFloat(b[sortBy] || 0);
    return sortDir === 'asc' ? valA - valB : valB - valA;
  });
}

function SortHeader({ label, col, sortBy, sortDir, onSort, align = 'left' }) {
  const icon = sortBy === col ? (sortDir === 'asc' ? '↑' : '↓') : '';
  return (
    <th
      className={`text-${align} px-4 py-3 text-xs font-medium text-text-secondary cursor-pointer hover:text-text select-none whitespace-nowrap`}
      onClick={() => onSort(col)}
    >
      {label}{icon && <span className="ml-1 text-text-tertiary">{icon}</span>}
    </th>
  );
}

function MetricCells({ row, compact }) {
  const py = compact ? 'py-2' : 'py-3';
  const text = compact ? 'text-xs' : 'text-sm';
  return (
    <>
      <td className={`px-4 ${py} text-right ${text} font-medium`}>{formatCurrency(row.spend)}</td>
      <td className={`px-4 ${py} text-right ${text} text-text-secondary`}>{formatNumber(row.impressions)}</td>
      <td className={`px-4 ${py} text-right ${text} text-text-secondary`}>{formatNumber(row.reach)}</td>
      <td className={`px-4 ${py} text-right ${text} text-text-secondary`}>{formatNumber(row.clicks)}</td>
      <td className={`px-4 ${py} text-right ${text} text-text-secondary`}>{formatPercent(row.ctr)}</td>
      <td className={`px-4 ${py} text-right ${text} text-text-secondary`}>{formatCurrency(row.cpc)}</td>
      <td className={`px-4 ${py} text-right ${text} text-text-secondary`}>{formatCurrency(row.cpm)}</td>
      <td className={`px-4 ${py} text-right ${text} font-medium`}>{row._results > 0 ? formatNumber(row._results) : '—'}</td>
    </>
  );
}

export default function Campaigns() {
  const { settings, addToast } = useApp();
  const [activeTab, setActiveTab] = useState('campaign');
  const [campaigns, setCampaigns] = useState([]);
  const [insightData, setInsightData] = useState([]); // raw insights for current tab level
  const [loading, setLoading] = useState(true);
  const [datePreset, setDatePreset] = useState('last_7d');
  const [sortBy, setSortBy] = useState('spend');
  const [sortDir, setSortDir] = useState('desc');

  // For campaign tab: expand to show ad sets
  const [expandedCampaign, setExpandedCampaign] = useState(null);
  const [childInsights, setChildInsights] = useState([]);
  const [childLoading, setChildLoading] = useState(false);

  const token = settings.accessToken;
  const accountId = settings.adAccountId;

  // Load data for the active tab
  const loadData = useCallback(async () => {
    if (!token || !accountId) { setLoading(false); return; }
    setLoading(true);
    setExpandedCampaign(null);
    try {
      if (activeTab === 'campaign') {
        const [campData, insights] = await Promise.all([
          api.getCampaigns(token, accountId),
          api.getInsights(token, accountId, { datePreset, level: 'campaign' }),
        ]);
        setCampaigns(campData);
        setInsightData(insights);
      } else {
        // adset or ad level — just insights
        const insights = await api.getInsights(token, accountId, { datePreset, level: activeTab });
        setInsightData(insights);
        setCampaigns([]);
      }
    } catch (err) {
      addToast(err.message, 'error');
    }
    setLoading(false);
  }, [token, accountId, datePreset, activeTab]);

  useEffect(() => { loadData(); }, [loadData]);

  // Build rows based on active tab
  const rows = useMemo(() => {
    if (activeTab === 'campaign') {
      // Map insights by campaign_name for quick lookup
      const iMap = {};
      for (const i of insightData) iMap[i.campaign_name] = i;
      return campaigns.map((c) => {
        const i = iMap[c.name] || {};
        return { ...i, _name: c.name, _status: c.status, _id: c.id, _results: getResults(i.actions) };
      });
    }
    if (activeTab === 'adset') {
      return insightData.map((i) => ({
        ...i,
        _name: i.adset_name,
        _parentName: i.campaign_name,
        _status: null,
        _id: i.adset_name,
        _results: getResults(i.actions),
      }));
    }
    // ads
    return insightData.map((i) => ({
      ...i,
      _name: i.ad_name,
      _parentName: i.adset_name,
      _grandparentName: i.campaign_name,
      _status: null,
      _id: i.ad_name,
      _results: getResults(i.actions),
    }));
  }, [activeTab, campaigns, insightData]);

  const sortedRows = useMemo(() => sortRows(rows, sortBy, sortDir), [rows, sortBy, sortDir]);

  // Sort child insights too
  const sortedChildren = useMemo(() => sortRows(
    childInsights.map((i) => ({ ...i, _name: i.adset_name, _results: getResults(i.actions) })),
    sortBy, sortDir
  ), [childInsights, sortBy, sortDir]);

  const handleSort = (col) => {
    if (sortBy === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  // Expand campaign to load ad set children
  const toggleExpand = async (campaignName) => {
    if (expandedCampaign === campaignName) {
      setExpandedCampaign(null);
      return;
    }
    setExpandedCampaign(campaignName);
    setChildLoading(true);
    try {
      const data = await api.getInsights(token, accountId, { datePreset, level: 'adset' });
      setChildInsights(data.filter((d) => d.campaign_name === campaignName));
    } catch {
      setChildInsights([]);
    }
    setChildLoading(false);
  };

  // Totals
  const totals = useMemo(() => {
    const src = activeTab === 'campaign' ? rows : insightData.map((i) => ({ ...i, _results: getResults(i.actions) }));
    return src.reduce((acc, i) => ({
      spend: acc.spend + parseFloat(i.spend || 0),
      impressions: acc.impressions + parseInt(i.impressions || 0, 10),
      clicks: acc.clicks + parseInt(i.clicks || 0, 10),
      reach: acc.reach + parseInt(i.reach || 0, 10),
      results: acc.results + (i._results || 0),
    }), { spend: 0, impressions: 0, clicks: 0, reach: 0, results: 0 });
  }, [rows, insightData, activeTab]);

  // Name column label
  const nameLabel = activeTab === 'campaign' ? 'Campaign' : activeTab === 'adset' ? 'Ad Set' : 'Ad';

  if (!token || !accountId) {
    return (
      <div className="px-8 py-6">
        <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
        <div className="mt-8 text-center text-text-secondary">
          <p className="text-sm">Connect your Facebook account and select an ad account to view campaigns.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            {rows.length} {nameLabel.toLowerCase()}{rows.length !== 1 ? 's' : ''} in this account
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={datePreset}
            onChange={(e) => setDatePreset(e.target.value)}
            className="border border-border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:ring-2 focus:ring-accent/[0.15] focus:border-accent"
          >
            {DATE_PRESETS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <button
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2 text-[13px] font-medium bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Tabs — Campaigns / Ad Sets / Ads */}
      <div className="flex gap-1 bg-bg/80 rounded-xl p-1 mb-5">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
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

      {/* Summary cards */}
      <div className="grid grid-cols-5 gap-4 mb-5">
        {[
          { label: 'Spend', value: formatCurrency(totals.spend) },
          { label: 'Impressions', value: formatNumber(totals.impressions) },
          { label: 'Reach', value: formatNumber(totals.reach) },
          { label: 'Clicks', value: formatNumber(totals.clicks) },
          { label: 'Results', value: formatNumber(totals.results) },
        ].map((card) => (
          <div key={card.label} className="glass-card rounded-xl p-4">
            <p className="text-[11px] text-text-tertiary uppercase tracking-wider font-medium">{card.label}</p>
            <p className="text-xl font-bold mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          </div>
        ) : sortedRows.length === 0 ? (
          <div className="text-center py-16 text-text-secondary">
            <p className="text-sm">No {nameLabel.toLowerCase()}s found for this period.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg">
                  <SortHeader label={nameLabel} col="name" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  {activeTab === 'campaign' && (
                    <SortHeader label="Status" col="status" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} />
                  )}
                  {activeTab !== 'campaign' && (
                    <th className="text-left px-4 py-3 text-xs font-medium text-text-secondary whitespace-nowrap">
                      {activeTab === 'adset' ? 'Campaign' : 'Ad Set'}
                    </th>
                  )}
                  <SortHeader label="Spend" col="spend" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} align="right" />
                  <SortHeader label="Impressions" col="impressions" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} align="right" />
                  <SortHeader label="Reach" col="reach" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} align="right" />
                  <SortHeader label="Clicks" col="clicks" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} align="right" />
                  <th className="text-right px-4 py-3 text-xs font-medium text-text-secondary">CTR</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-text-secondary">CPC</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-text-secondary">CPM</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-text-secondary">Results</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row, idx) => {
                  const isExpanded = activeTab === 'campaign' && expandedCampaign === row._name;

                  return (
                    <React.Fragment key={row._id || idx}>
                      <tr
                        className={`border-b border-border hover:bg-bg/50 transition-colors ${
                          activeTab === 'campaign' ? 'cursor-pointer' : ''
                        } ${isExpanded ? 'bg-accent/[0.03]' : ''}`}
                        onClick={activeTab === 'campaign' ? () => toggleExpand(row._name) : undefined}
                      >
                        {/* Name */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {activeTab === 'campaign' && (
                              <svg className={`w-3.5 h-3.5 text-text-tertiary transition-transform flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            )}
                            <span className="font-medium truncate max-w-[240px]" title={row._name}>{row._name || '—'}</span>
                          </div>
                        </td>

                        {/* Status (campaign) or Parent name (adset/ad) */}
                        {activeTab === 'campaign' ? (
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COLORS[row._status] || 'bg-gray-100 text-gray-500'}`}>
                              {row._status}
                            </span>
                          </td>
                        ) : (
                          <td className="px-4 py-3 text-text-secondary text-xs truncate max-w-[180px]" title={row._parentName}>
                            {row._parentName || '—'}
                          </td>
                        )}

                        <MetricCells row={row} />
                      </tr>

                      {/* Expanded children (ad sets under campaign) */}
                      {isExpanded && (
                        childLoading ? (
                          <tr><td colSpan={10} className="px-4 py-4 bg-bg/30">
                            <div className="flex items-center gap-2 pl-6">
                              <div className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
                              <span className="text-xs text-text-secondary">Loading ad sets...</span>
                            </div>
                          </td></tr>
                        ) : sortedChildren.length === 0 ? (
                          <tr><td colSpan={10} className="px-4 py-3 bg-bg/30">
                            <p className="text-xs text-text-secondary pl-6">No ad set data for this period</p>
                          </td></tr>
                        ) : sortedChildren.map((child, cidx) => (
                          <tr key={cidx} className="border-b border-border bg-bg/30">
                            <td className="px-4 py-2 pl-10">
                              <span className="text-xs font-medium text-text-secondary">{child._name}</span>
                            </td>
                            <td className="px-4 py-2">
                              <span className="text-[10px] text-text-tertiary bg-bg px-1.5 py-0.5 rounded">Ad Set</span>
                            </td>
                            <MetricCells row={child} compact />
                          </tr>
                        ))
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

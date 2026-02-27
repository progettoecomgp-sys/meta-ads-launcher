import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import StatCard from '../components/StatCard';
import Select from '../components/Select';
import { DATE_PRESETS } from '../utils/constants';
import * as api from '../utils/metaApi';

export default function Metrics() {
  const { settings, isConfigured, addToast } = useApp();
  const [datePreset, setDatePreset] = useState('last_7d');
  const [level, setLevel] = useState('campaign');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sortCol, setSortCol] = useState('spend');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    if (!isConfigured) return;
    setLoading(true);
    api.getInsights(settings.accessToken, settings.adAccountId, { datePreset, level })
      .then(setData)
      .catch((err) => addToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [isConfigured, settings.accessToken, settings.adAccountId, datePreset, level, addToast]);

  const summary = useMemo(() => {
    if (data.length === 0) return { spend: 0, impressions: 0, clicks: 0, reach: 0 };
    return data.reduce(
      (acc, row) => ({
        spend: acc.spend + Number(row.spend || 0),
        impressions: acc.impressions + Number(row.impressions || 0),
        clicks: acc.clicks + Number(row.clicks || 0),
        reach: acc.reach + Number(row.reach || 0),
      }),
      { spend: 0, impressions: 0, clicks: 0, reach: 0 }
    );
  }, [data]);

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const va = Number(a[sortCol] || 0);
      const vb = Number(b[sortCol] || 0);
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  }, [data, sortCol, sortDir]);

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  const getName = (row) => {
    if (level === 'ad') return row.ad_name;
    if (level === 'adset') return row.adset_name;
    return row.campaign_name;
  };

  const getConversions = (row) => {
    if (!row.actions) return 0;
    const conv = row.actions.find((a) => a.action_type === 'offsite_conversion' || a.action_type === 'purchase');
    return conv ? Number(conv.value) : 0;
  };

  const formatNum = (n) => Number(n || 0).toLocaleString();
  const formatCurrency = (n) => `€${Number(n || 0).toFixed(2)}`;
  const formatPct = (n) => `${Number(n || 0).toFixed(2)}%`;

  const columns = [
    { key: 'name', label: 'Name', sortable: false },
    { key: 'impressions', label: 'Impressions', format: formatNum },
    { key: 'clicks', label: 'Clicks', format: formatNum },
    { key: 'ctr', label: 'CTR', format: formatPct },
    { key: 'cpc', label: 'CPC', format: formatCurrency },
    { key: 'cpm', label: 'CPM', format: formatCurrency },
    { key: 'spend', label: 'Spend', format: formatCurrency },
    { key: 'reach', label: 'Reach', format: formatNum },
  ];

  return (
    <div className="p-6">
      {!isConfigured && (
        <div className="mb-4 px-4 py-3 bg-warning/10 border border-warning/20 rounded-lg flex items-center gap-3 text-sm">
          <svg className="w-5 h-5 text-warning flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="text-text-secondary">API not configured — metrics will appear once connected.</span>
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Metrics</h1>
          <p className="text-text-secondary text-sm mt-1">Detailed ad performance analytics</p>
        </div>
        <div className="flex gap-3">
          <Select
            value={datePreset}
            onChange={setDatePreset}
            options={DATE_PRESETS}
          />
          <Select
            value={level}
            onChange={setLevel}
            options={[
              { value: 'campaign', label: 'Campaign' },
              { value: 'adset', label: 'Ad Set' },
              { value: 'ad', label: 'Ad' },
            ]}
          />
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Spend" value={formatCurrency(summary.spend)} />
        <StatCard label="Total Impressions" value={formatNum(summary.impressions)} />
        <StatCard label="Total Clicks" value={formatNum(summary.clicks)} />
        <StatCard label="Total Reach" value={formatNum(summary.reach)} />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg/50">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable !== false && handleSort(col.key)}
                    className={`px-4 py-3 text-left font-medium text-text-secondary ${
                      col.sortable !== false ? 'cursor-pointer hover:text-text' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {sortCol === col.key && (
                        <span className="text-accent">{sortDir === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3">
                        <div className="h-4 bg-bg rounded animate-pulse w-16" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-text-secondary">
                    No data available for the selected period.
                  </td>
                </tr>
              ) : (
                sorted.map((row, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-bg/30">
                    <td className="px-4 py-3 font-medium">{getName(row)}</td>
                    <td className="px-4 py-3">{formatNum(row.impressions)}</td>
                    <td className="px-4 py-3">{formatNum(row.clicks)}</td>
                    <td className="px-4 py-3">{formatPct(row.ctr)}</td>
                    <td className="px-4 py-3">{formatCurrency(row.cpc)}</td>
                    <td className="px-4 py-3">{formatCurrency(row.cpm)}</td>
                    <td className="px-4 py-3 font-medium">{formatCurrency(row.spend)}</td>
                    <td className="px-4 py-3">{formatNum(row.reach)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

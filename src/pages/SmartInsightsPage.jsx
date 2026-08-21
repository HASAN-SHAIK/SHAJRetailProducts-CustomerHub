import React, { useEffect, useMemo, useState } from 'react';
import { api, unwrap } from '../lib/api';
import '../styles/dashboard.css';

const RANGES = [
  ['today', 'Today'],
  ['this_week', 'This Week'],
  ['this_month', 'This Month'],
  ['last_month', 'Last Month'],
  ['last_30_days', 'Last 30 Days'],
];

const iconFor = (type) => {
  const normalized = String(type || '').toLowerCase();
  if (normalized.includes('growth')) return 'bi-graph-up';
  if (normalized.includes('dead')) return 'bi-box-seam';
  if (normalized.includes('credit')) return 'bi-credit-card';
  if (normalized.includes('profit')) return 'bi-cash-stack';
  if (normalized.includes('fast')) return 'bi-lightning-charge';
  return 'bi-stars';
};

export default function SmartInsightsPage() {
  const [range, setRange] = useState('this_month');
  const [branchId, setBranchId] = useState('');
  const [location, setLocation] = useState('');
  const [branches, setBranches] = useState([]);
  const [locations, setLocations] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    Promise.allSettled([api.branches(), api.dashboardLocationsList()]).then(([branchesResult, locationsResult]) => {
      if (!active) return;
      if (branchesResult.status === 'fulfilled') {
        const body = unwrap(branchesResult.value);
        setBranches(Array.isArray(body) ? body : body?.branches || []);
      }
      if (locationsResult.status === 'fulfilled') {
        const body = unwrap(locationsResult.value);
        const list = Array.isArray(body) ? body : body?.locations || body?.data || [];
        setLocations(list);
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.dashboardSmartInsights({ range, branchId, location }).then((response) => {
      if (!active) return;
      setReport(unwrap(response));
    }).catch((requestError) => {
      if (!active) return;
      setReport(null);
      setError(requestError?.response?.data?.message || 'Unable to load canonical Smart Insights.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [range, branchId, location, refreshKey]);

  const insights = useMemo(() => {
    const source = report?.insights || [];
    return Array.isArray(source) ? source : [];
  }, [report]);

  const locationOptions = useMemo(() => Array.from(new Set(locations.map((item) => item?.name || item?.location || item).filter(Boolean))), [locations]);

  return <div className="page-stack dashboard-page">
    <div className="page-header dashboard-header">
      <div><span className="eyebrow">Canonical business guidance</span><h1>Smart Insights</h1><p>Surface Central-generated business insights without recalculating or inferring analytics in RetailHub.</p></div>
      <button className="secondary-btn" onClick={() => setRefreshKey((value) => value + 1)} disabled={loading}><i className="bi bi-arrow-clockwise" /> Refresh</button>
    </div>

    <section className="panel dashboard-filters" aria-label="Smart Insights filters">
      <label className="field compact"><span>Range</span><select value={range} onChange={(event) => setRange(event.target.value)} disabled={loading}>{RANGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="field compact"><span>Branch</span><select value={branchId} onChange={(event) => setBranchId(event.target.value)} disabled={loading}><option value="">All permitted branches</option>{branches.map((branch) => <option key={branch?.branch_id || branch?.id} value={branch?.branch_id || branch?.id}>{branch?.branch_name || branch?.name || branch?.branch_id || branch?.id}</option>)}</select></label>
      <label className="field compact"><span>Location</span><select value={location} onChange={(event) => setLocation(event.target.value)} disabled={loading}><option value="">All locations</option>{locationOptions.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      <div className="dashboard-authority-note"><i className="bi bi-database-check" /><div><strong>Authority: Central Smart Insights</strong><span>RetailHub reads `/dashboard/smart-insights`; POS SQLite and browser calculations are not used for management guidance.</span></div></div>
    </section>

    {loading && <section className="panel dashboard-state" role="status"><i className="bi bi-hourglass-split" /><strong>Loading Smart Insights…</strong><span>Reading Central/PostgreSQL-backed insight facts for the selected scope.</span></section>}
    {!loading && error && <section className="panel dashboard-state dashboard-error" role="alert"><i className="bi bi-exclamation-triangle" /><strong>Smart Insights unavailable</strong><span>{error}</span><button className="secondary-btn" onClick={() => setRefreshKey((value) => value + 1)}>Retry Central insights</button></section>}
    {!loading && !error && insights.length === 0 && <section className="panel dashboard-state"><i className="bi bi-stars" /><strong>No insights available</strong><span>Central returned no automated insights for the selected range and scope.</span></section>}

    {!loading && !error && insights.length > 0 && <section className="panel">
      <div className="panel-title"><i className="bi bi-stars" /><div><h2>Business insights</h2><p>Messages and severity are presented exactly from the Central analytics contract.</p></div></div>
      <div className="metric-grid">
        {insights.map((item, index) => <div className={`metric-card tone-${item?.severity === 'critical' || item?.severity === 'danger' ? 'bad' : item?.severity === 'warning' || item?.severity === 'warn' ? 'warn' : 'info'}`} key={`${item?.type || 'insight'}-${index}`}>
          <i className={`bi ${iconFor(item?.type)}`} />
          <div><span>{String(item?.type || 'Insight').replaceAll('_', ' ')}</span><strong style={{ fontSize: '0.95rem', lineHeight: 1.35 }}>{item?.message || 'Insight available'}</strong></div>
        </div>)}
      </div>
    </section>}

    <section className="panel dashboard-scope-note"><i className="bi bi-shield-check" /><div><strong>Migration slice 7</strong><span>Smart Insights is the final business-management metric family from the current POS dashboard. Once this slice is accepted, POS dashboard removal can begin while preserving only operational edge health and synchronization surfaces.</span></div></section>
  </div>;
}

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

const currency = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(numeric);
};

const number = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(numeric);
};

export default function BranchPerformancePage() {
  const [range, setRange] = useState('this_month');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.dashboardLocationPerformance({ range }).then((response) => {
      if (!active) return;
      setReport(unwrap(response));
    }).catch((requestError) => {
      if (!active) return;
      setReport(null);
      setError(requestError?.response?.data?.message || 'Unable to load canonical branch performance.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [range, refreshKey]);

  const rows = useMemo(() => {
    const source = report?.locations || report?.data || [];
    return Array.isArray(source) ? source : [];
  }, [report]);

  return <div className="page-stack dashboard-page">
    <div className="page-header dashboard-header">
      <div><span className="eyebrow">Canonical store comparison</span><h1>Branch Performance</h1><p>Compare store/location revenue, orders and growth using Central/PostgreSQL dashboard facts.</p></div>
      <button className="secondary-btn" onClick={() => setRefreshKey((value) => value + 1)} disabled={loading}><i className="bi bi-arrow-clockwise" /> Refresh</button>
    </div>

    <section className="panel dashboard-filters" aria-label="Branch performance filters">
      <label className="field compact"><span>Range</span><select value={range} onChange={(event) => setRange(event.target.value)} disabled={loading}>{RANGES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <div className="dashboard-authority-note"><i className="bi bi-database-check" /><div><strong>Authority: Central location performance</strong><span>RetailHub reads `/dashboard/location-performance`; it does not compare branches from POS-local data.</span></div></div>
    </section>

    {loading && <section className="panel dashboard-state" role="status"><i className="bi bi-hourglass-split" /><strong>Loading branch performance…</strong><span>Reading Central reporting facts for the selected period.</span></section>}
    {!loading && error && <section className="panel dashboard-state dashboard-error" role="alert"><i className="bi bi-exclamation-triangle" /><strong>Branch performance unavailable</strong><span>{error}</span><button className="secondary-btn" onClick={() => setRefreshKey((value) => value + 1)}>Retry Central report</button></section>}
    {!loading && !error && rows.length === 0 && <section className="panel dashboard-state"><i className="bi bi-geo-alt" /><strong>No branch performance data</strong><span>Central returned no location performance facts for the selected period.</span></section>}

    {!loading && !error && rows.length > 0 && <>
      <section className="panel">
        <div className="panel-title"><i className="bi bi-geo-alt" /><div><h2>Location performance</h2><p>Canonical revenue, order volume and growth by location.</p></div></div>
        <div className="page-stack">
          {rows.map((row, index) => <div className="dashboard-scope-note" key={`${row?.city || row?.location || row?.name || 'location'}-${index}`}>
            <i className="bi bi-shop" />
            <div><strong>{row?.city || row?.location || row?.name || 'Unknown location'}</strong><span>{number(row?.orders)} orders · Growth {number(row?.growth_percent ?? row?.growth ?? 0)}%</span></div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}><strong>{currency(row?.revenue)}</strong><span>Canonical revenue</span></div>
          </div>)}
        </div>
      </section>
      <section className="panel dashboard-scope-note"><i className="bi bi-info-circle" /><div><strong>Migration slice 6</strong><span>The current POS dashboard has no separate Payments/Refunds metric family, so no new analytics contract was invented. Branch/location comparison is migrated next in the actual POS dashboard order; Smart Insights follows.</span></div></section>
    </>}
  </div>;
}

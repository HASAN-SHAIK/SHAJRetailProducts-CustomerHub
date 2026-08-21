import React, { useEffect, useMemo, useState } from 'react';
import { api, unwrap } from '../lib/api';
import '../styles/dashboard.css';

const RANGE_OPTIONS = [
  ['today', 'Today'],
  ['this_week', 'This week'],
  ['this_month', 'This month'],
  ['last_month', 'Last month'],
  ['last_30_days', 'Last 30 days'],
];

const formatCurrency = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
};

const formatNumber = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(numeric);
};

export default function SalesRevenuePage() {
  const [range, setRange] = useState('this_month');
  const [branchId, setBranchId] = useState('');
  const [branches, setBranches] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    api.branches()
      .then((response) => {
        if (!active) return;
        const body = unwrap(response);
        setBranches(Array.isArray(body) ? body : (body?.branches || []));
      })
      .catch(() => {
        if (active) setBranches([]);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.dashboardRevenueOverview({ range, branchId: branchId || undefined })
      .then((response) => {
        if (!active) return;
        const body = unwrap(response);
        setData(body?.revenue_overview ? body : (body?.data || body));
      })
      .catch((requestError) => {
        if (!active) return;
        setData(null);
        setError(requestError?.response?.data?.message || 'Unable to load canonical sales and revenue metrics.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [range, branchId, refreshKey]);

  const metrics = useMemo(() => {
    const source = data?.revenue_overview || {};
    return [
      { label: 'Total revenue', value: formatCurrency(source.total_revenue), icon: 'bi-cash-stack', tone: 'good' },
      { label: 'Total profit', value: formatCurrency(source.total_profit), icon: 'bi-graph-up-arrow', tone: 'info' },
      { label: 'Total orders', value: formatNumber(source.total_orders), icon: 'bi-bag-check', tone: 'info' },
      { label: 'Average order value', value: formatCurrency(source.avg_order_value), icon: 'bi-receipt', tone: 'info' },
    ];
  }, [data]);

  const hasData = Boolean(data?.revenue_overview);

  return <div className="page-stack dashboard-page">
    <div className="page-header dashboard-header">
      <div>
        <span className="eyebrow">Canonical business analytics</span>
        <h1>Sales & Revenue</h1>
        <p>Central/PostgreSQL business metrics after store transactions have synchronized. RetailHub presents these facts; it does not recalculate transaction authority.</p>
      </div>
      <button className="secondary-btn" onClick={() => setRefreshKey((value) => value + 1)} disabled={loading}>
        <i className="bi bi-arrow-clockwise" /> Refresh
      </button>
    </div>

    <section className="panel dashboard-filters" aria-label="Sales and revenue filters">
      <label className="field compact">
        <span>Date range</span>
        <select value={range} onChange={(event) => setRange(event.target.value)}>
          {RANGE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="field compact">
        <span>Store / branch</span>
        <select value={branchId} onChange={(event) => setBranchId(event.target.value)}>
          <option value="">All permitted branches</option>
          {branches.map((branch) => {
            const id = branch.branch_id || branch.id;
            const label = branch.branch_name || branch.name || id;
            return <option key={id} value={id}>{label}</option>;
          })}
        </select>
      </label>
      <div className="dashboard-authority-note">
        <i className="bi bi-database-check" />
        <div><strong>Authority: Central reporting API</strong><span>Offline POS sales appear here after durable synchronization reaches Central.</span></div>
      </div>
    </section>

    {loading && <section className="panel dashboard-state" role="status"><i className="bi bi-hourglass-split" /><strong>Loading sales metrics…</strong><span>Reading canonical business facts from Central.</span></section>}

    {!loading && error && <section className="panel dashboard-state dashboard-error" role="alert"><i className="bi bi-exclamation-triangle" /><strong>Sales metrics unavailable</strong><span>{error}</span><button className="secondary-btn" onClick={() => setRefreshKey((value) => value + 1)}>Retry Central analytics</button></section>}

    {!loading && !error && !hasData && <section className="panel dashboard-state"><i className="bi bi-bar-chart" /><strong>No sales data for this selection</strong><span>Try a wider date range or another permitted branch.</span></section>}

    {!loading && !error && hasData && <>
      <div className="metric-grid">
        {metrics.map((metric) => <div className={`metric-card tone-${metric.tone}`} key={metric.label}><i className={`bi ${metric.icon}`} /><div><span>{metric.label}</span><strong>{metric.value}</strong></div></div>)}
      </div>
      <section className="panel dashboard-scope-note">
        <i className="bi bi-info-circle" />
        <div><strong>Migration slice 1</strong><span>This page replaces the POS management-level Revenue Overview cards. Growth, sales trend, category, inventory and customer-credit families migrate in subsequent certified slices.</span></div>
      </section>
    </>}
  </div>;
}

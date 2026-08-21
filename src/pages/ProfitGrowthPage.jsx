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

const percent = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  return `${numeric > 0 ? '+' : ''}${numeric.toFixed(2)}%`;
};

export default function ProfitGrowthPage() {
  const [range, setRange] = useState('this_month');
  const [branchId, setBranchId] = useState('');
  const [branches, setBranches] = useState([]);
  const [growth, setGrowth] = useState(null);
  const [trend, setTrend] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    api.branches().then((response) => {
      if (!active) return;
      const body = unwrap(response);
      setBranches(Array.isArray(body) ? body : (body?.branches || []));
    }).catch(() => { if (active) setBranches([]); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      api.dashboardGrowthComparison({ range, branchId: branchId || undefined }),
      api.dashboardSalesTrend({ range, branchId: branchId || undefined }),
    ]).then(([growthResponse, trendResponse]) => {
      if (!active) return;
      setGrowth(unwrap(growthResponse));
      setTrend(unwrap(trendResponse));
    }).catch((requestError) => {
      if (!active) return;
      setGrowth(null);
      setTrend(null);
      setError(requestError?.response?.data?.message || 'Unable to load canonical profit and growth metrics.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [range, branchId, refreshKey]);

  const cards = useMemo(() => {
    const current = growth?.current_period || {};
    const delta = growth?.growth || {};
    return [
      { label: 'Current profit', value: currency(current.profit), change: percent(delta.profit_growth_percent), icon: 'bi-graph-up' },
      { label: 'Current revenue', value: currency(current.revenue), change: percent(delta.revenue_growth_percent), icon: 'bi-cash-stack' },
      { label: 'Current orders', value: number(current.orders), change: percent(delta.orders_growth_percent ?? delta.order_growth_percent), icon: 'bi-bag-check' },
    ];
  }, [growth]);

  const trendRows = useMemo(() => {
    const rows = trend?.data || [];
    return Array.isArray(rows) ? rows.slice(-12) : [];
  }, [trend]);

  const hasData = Boolean(growth?.current_period) || trendRows.length > 0;

  return <div className="page-stack dashboard-page">
    <div className="page-header dashboard-header">
      <div><span className="eyebrow">Canonical business analytics</span><h1>Profit & Growth</h1><p>Period-over-period growth and sales trend facts from Central/PostgreSQL. RetailHub presents the canonical results without recalculating transaction economics.</p></div>
      <button className="secondary-btn" onClick={() => setRefreshKey((value) => value + 1)} disabled={loading}><i className="bi bi-arrow-clockwise" /> Refresh</button>
    </div>

    <section className="panel dashboard-filters" aria-label="Profit and growth filters">
      <label className="field compact"><span>Date range</span><select value={range} onChange={(event) => setRange(event.target.value)}>{RANGE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="field compact"><span>Store / branch</span><select value={branchId} onChange={(event) => setBranchId(event.target.value)}><option value="">All permitted branches</option>{branches.map((branch) => { const id = branch.branch_id || branch.id; return <option key={id} value={id}>{branch.branch_name || branch.name || id}</option>; })}</select></label>
      <div className="dashboard-authority-note"><i className="bi bi-database-check" /><div><strong>Authority: Central reporting API</strong><span>Refunds, returns and synchronized offline sales are reflected by Central canonical reporting.</span></div></div>
    </section>

    {loading && <section className="panel dashboard-state" role="status"><i className="bi bi-hourglass-split" /><strong>Loading profit and growth…</strong><span>Reading canonical reporting facts from Central.</span></section>}
    {!loading && error && <section className="panel dashboard-state dashboard-error" role="alert"><i className="bi bi-exclamation-triangle" /><strong>Profit and growth unavailable</strong><span>{error}</span><button className="secondary-btn" onClick={() => setRefreshKey((value) => value + 1)}>Retry Central analytics</button></section>}
    {!loading && !error && !hasData && <section className="panel dashboard-state"><i className="bi bi-bar-chart-line" /><strong>No growth data for this selection</strong><span>Try another permitted branch or a wider date range.</span></section>}

    {!loading && !error && hasData && <>
      <div className="metric-grid">{cards.map((card) => <div className="metric-card tone-info" key={card.label}><i className={`bi ${card.icon}`} /><div><span>{card.label}</span><strong>{card.value}</strong><small>{card.change} vs previous period</small></div></div>)}</div>
      <section className="panel"><div className="panel-title"><i className="bi bi-activity" /><div><h2>Sales trend</h2><p>Latest canonical trend points for the selected reporting window.</p></div></div>{trendRows.length === 0 ? <div className="dashboard-state"><strong>No trend points</strong></div> : <div className="table-wrap"><table><thead><tr><th>Period</th><th>Revenue</th><th>Orders</th></tr></thead><tbody>{trendRows.map((row, index) => <tr key={`${row.label || row.date || 'period'}-${index}`}><td>{row.label || row.date || '—'}</td><td>{currency(row.revenue)}</td><td>{number(row.orders ?? row.order_count)}</td></tr>)}</tbody></table></div>}</section>
      <section className="panel dashboard-scope-note"><i className="bi bi-info-circle" /><div><strong>Migration slice 2</strong><span>This replaces POS management-level Growth Comparison and Sales Trend views after acceptance. Inventory analytics is the next family.</span></div></section>
    </>}
  </div>;
}

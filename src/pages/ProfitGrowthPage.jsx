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

const shortPeriod = (value) => {
  const raw = String(value || '');
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw.slice(5);
  if (/^\d{4}-\d{2}-\d{2}T?\d{2}/.test(raw)) return raw.slice(5, 13).replace('T', ' ');
  return raw || '—';
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
      <section className="panel"><div className="panel-title"><i className="bi bi-activity" /><div><h2>Sales trend</h2><p>Latest canonical trend points for the selected reporting window.</p></div></div>{trendRows.length === 0 ? <div className="dashboard-state"><strong>No trend points</strong></div> : <TrendChart rows={trendRows} />}</section>
      <section className="panel dashboard-scope-note"><i className="bi bi-info-circle" /><div><strong>Migration slice 2</strong><span>This replaces POS management-level Growth Comparison and Sales Trend views after acceptance. Inventory analytics is the next family.</span></div></section>
    </>}
  </div>;
}

function TrendChart({ rows }) {
  const width = 960;
  const height = 320;
  const padding = { top: 34, right: 30, bottom: 54, left: 78 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const values = rows.map((row) => Math.max(0, Number(row.revenue) || 0));
  const orderValues = rows.map((row) => Math.max(0, Number(row.orders ?? row.order_count) || 0));
  const maxRevenue = Math.max(1, ...values);
  const stepX = rows.length > 1 ? chartWidth / (rows.length - 1) : 0;
  const points = rows.map((row, index) => {
    const revenue = Math.max(0, Number(row.revenue) || 0);
    const orders = Math.max(0, Number(row.orders ?? row.order_count) || 0);
    const x = padding.left + (rows.length > 1 ? index * stepX : chartWidth / 2);
    const y = padding.top + chartHeight - (revenue / maxRevenue) * chartHeight;
    const label = row.label || row.date || row.period || `Point ${index + 1}`;
    return { x, y, revenue, orders, label, active: revenue > 0 || orders > 0 };
  });
  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`
    : '';
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const value = maxRevenue * ratio;
    const y = padding.top + chartHeight - ratio * chartHeight;
    return { value, y };
  });
  const totalRevenue = values.reduce((sum, value) => sum + value, 0);
  const totalOrders = orderValues.reduce((sum, value) => sum + value, 0);

  return <div className="trend-chart-card">
    <div className="trend-chart-summary"><strong>{currency(totalRevenue)}</strong><span>{number(totalOrders)} orders in view</span></div>
    <svg className="trend-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Sales trend chart with revenue checkpoints" preserveAspectRatio="none">
      <defs>
        <linearGradient id="trendArea" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="rgba(56, 189, 248, .36)" />
          <stop offset="100%" stopColor="rgba(56, 189, 248, 0)" />
        </linearGradient>
      </defs>
      {yTicks.map((tick) => <g key={tick.y}>
        <line className="trend-grid" x1={padding.left} x2={width - padding.right} y1={tick.y} y2={tick.y} />
        <text className="trend-axis-label" x={padding.left - 12} y={tick.y + 4} textAnchor="end">{currency(tick.value)}</text>
      </g>)}
      {points.map((point, index) => <line key={`${point.label}-checkpoint-${index}`} className="trend-checkpoint-line" x1={point.x} x2={point.x} y1={padding.top} y2={padding.top + chartHeight} />)}
      {areaPath && <path className="trend-area" d={areaPath} />}
      {linePath && <path className="trend-line" d={linePath} />}
      {points.map((point, index) => <g key={`${point.label}-${index}`}>
        <circle className={`trend-point${point.active ? ' active' : ''}`} cx={point.x} cy={point.y} r={point.active ? 6 : 4}>
          <title>{`${point.label}: ${currency(point.revenue)} · ${number(point.orders)} orders`}</title>
        </circle>
        {point.active && <text className="trend-value-label" x={point.x} y={Math.max(18, point.y - 12)} textAnchor="middle">{number(point.orders)}</text>}
        <text className="trend-x-label" x={point.x} y={height - 18} textAnchor="middle">{shortPeriod(point.label)}</text>
      </g>)}
    </svg>
    <div className="trend-legend"><span><i className="trend-dot active" />Revenue checkpoint</span><span><i className="trend-dot" />No sale checkpoint</span></div>
  </div>;
}

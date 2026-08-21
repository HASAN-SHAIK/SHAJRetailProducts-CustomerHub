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

export default function ProductCategoryAnalyticsPage() {
  const [range, setRange] = useState('this_month');
  const [location, setLocation] = useState('');
  const [locations, setLocations] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    api.dashboardLocationsList().then((response) => {
      if (!active) return;
      const body = unwrap(response);
      const list = Array.isArray(body) ? body : (body?.locations || body?.data || []);
      setLocations(list);
    }).catch(() => { if (active) setLocations([]); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.dashboardCategoryPerformance({ range, location: location || undefined }).then((response) => {
      if (!active) return;
      setData(unwrap(response));
    }).catch((requestError) => {
      if (!active) return;
      setData(null);
      setError(requestError?.response?.data?.message || 'Unable to load canonical product and category analytics.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [range, location, refreshKey]);

  const categories = useMemo(() => {
    const rows = data?.category_performance || data?.categories || [];
    return Array.isArray(rows) ? rows : [];
  }, [data]);
  const topQuantity = useMemo(() => Array.isArray(data?.top_products_by_quantity) ? data.top_products_by_quantity : [], [data]);
  const topRevenue = useMemo(() => Array.isArray(data?.top_products_by_revenue) ? data.top_products_by_revenue : [], [data]);
  const hasData = categories.length > 0 || topQuantity.length > 0 || topRevenue.length > 0;

  return <div className="page-stack dashboard-page">
    <div className="page-header dashboard-header">
      <div><span className="eyebrow">Canonical business analytics</span><h1>Products & Categories</h1><p>Sale-time category and product performance from immutable Central/PostgreSQL order snapshots. Later catalog renames or recategorization do not rewrite historical reporting.</p></div>
      <button className="secondary-btn" onClick={() => setRefreshKey((value) => value + 1)} disabled={loading}><i className="bi bi-arrow-clockwise" /> Refresh</button>
    </div>

    <section className="panel dashboard-filters" aria-label="Product and category filters">
      <label className="field compact"><span>Date range</span><select value={range} onChange={(event) => setRange(event.target.value)}>{RANGE_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="field compact"><span>Location</span><select value={location} onChange={(event) => setLocation(event.target.value)}><option value="">All permitted locations</option>{locations.map((item, index) => { const value = item.location || item.name || item.city || String(item); return <option key={`${value}-${index}`} value={value}>{value}</option>; })}</select></label>
      <div className="dashboard-authority-note"><i className="bi bi-database-check" /><div><strong>Authority: Central sale snapshots</strong><span>Returns reduce quantity/revenue and historical category attribution comes from the original sale snapshot. Unsnapshotted legacy rows remain Unattributed.</span></div></div>
    </section>

    {loading && <section className="panel dashboard-state" role="status"><i className="bi bi-hourglass-split" /><strong>Loading product and category analytics…</strong><span>Reading canonical sale snapshots from Central.</span></section>}
    {!loading && error && <section className="panel dashboard-state dashboard-error" role="alert"><i className="bi bi-exclamation-triangle" /><strong>Product analytics unavailable</strong><span>{error}</span><button className="secondary-btn" onClick={() => setRefreshKey((value) => value + 1)}>Retry Central analytics</button></section>}
    {!loading && !error && !hasData && <section className="panel dashboard-state"><i className="bi bi-tags" /><strong>No product/category activity for this selection</strong><span>Try another location or reporting window.</span></section>}

    {!loading && !error && hasData && <>
      <section className="panel"><div className="panel-title"><i className="bi bi-pie-chart" /><div><h2>Category performance</h2><p>Revenue share by sale-time category attribution.</p></div></div><div className="table-wrap"><table><thead><tr><th>Category</th><th>Revenue</th><th>Share</th></tr></thead><tbody>{categories.map((row, index) => <tr key={`${row.category_id || row.category_name || 'category'}-${index}`}><td>{row.category_name || 'Unattributed'}</td><td>{currency(row.revenue)}</td><td>{number(row.percentage)}%</td></tr>)}</tbody></table></div></section>
      <div className="content-grid two-one">
        <section className="panel"><div className="panel-title"><i className="bi bi-box-seam" /><div><h2>Top products by quantity</h2><p>Net sold quantity after returns.</p></div></div>{topQuantity.length === 0 ? <div className="dashboard-state"><strong>No product quantity data</strong></div> : <div className="table-wrap"><table><thead><tr><th>Product</th><th>Category</th><th>Qty sold</th><th>Revenue</th></tr></thead><tbody>{topQuantity.map((row, index) => <tr key={`${row.product_id || row.product_name}-${index}`}><td>{row.product_name || 'Unknown product'}</td><td>{row.category_name || 'Unattributed'}</td><td>{number(row.quantity_sold)}</td><td>{currency(row.revenue)}</td></tr>)}</tbody></table></div>}</section>
        <section className="panel"><div className="panel-title"><i className="bi bi-trophy" /><div><h2>Top products by revenue</h2><p>Historical product identity from original sale snapshots.</p></div></div>{topRevenue.length === 0 ? <div className="dashboard-state"><strong>No product revenue data</strong></div> : <div className="table-wrap"><table><thead><tr><th>Product</th><th>Revenue</th></tr></thead><tbody>{topRevenue.map((row, index) => <tr key={`${row.product_id || row.product_name}-${index}`}><td><strong>{row.product_name || 'Unknown product'}</strong><small>{row.category_name || 'Unattributed'}</small></td><td>{currency(row.revenue)}</td></tr>)}</tbody></table></div>}</section>
      </div>
      <section className="panel dashboard-scope-note"><i className="bi bi-info-circle" /><div><strong>Migration slice 4</strong><span>This replaces POS management-level Category & Products analytics after acceptance. Customer/Credit analytics follows next.</span></div></section>
    </>}
  </div>;
}

import React, { useEffect, useMemo, useState } from 'react';
import { api, unwrap } from '../lib/api';
import { inventoryApi } from '../lib/inventoryApi';
import '../styles/dashboard.css';

const number = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(numeric);
};

const currency = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(numeric);
};

const stockState = (inventory) => {
  if (!inventory) return { label: 'No projection', tone: 'future' };
  if (inventory.is_out_of_stock) return { label: 'Out of stock', tone: 'future' };
  if (inventory.is_low_stock) return { label: 'Low stock', tone: 'partial' };
  return { label: 'Healthy', tone: 'live' };
};

export default function InventoryAnalyticsPage() {
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState('');
  const [report, setReport] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoadingBranches(true);
    api.branches().then((response) => {
      if (!active) return;
      const body = unwrap(response);
      const list = Array.isArray(body) ? body : (body?.branches || []);
      setBranches(list);
      if (list.length === 1) setBranchId(list[0].branch_id || list[0].id || '');
    }).catch(() => {
      if (active) setBranches([]);
    }).finally(() => {
      if (active) setLoadingBranches(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!branchId) {
      setReport(null);
      setProducts([]);
      setError('');
      return;
    }
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      api.inventoryReport({ branchId }),
      inventoryApi.products({ branchId, page: 1, limit: 100, sortBy: 'stock_quantity', sortOrder: 'asc' }),
    ]).then(([reportResponse, productResponse]) => {
      if (!active) return;
      setReport(unwrap(reportResponse));
      const list = unwrap(productResponse, 'products');
      setProducts(Array.isArray(list) ? list : []);
    }).catch((requestError) => {
      if (!active) return;
      setReport(null);
      setProducts([]);
      setError(requestError?.response?.data?.message || requestError?.response?.data?.error?.message || 'Unable to load canonical inventory analytics.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [branchId, refreshKey]);

  const cards = useMemo(() => {
    if (!report) return [];
    return [
      { label: 'Projected net stock', value: number(report.total_stock), icon: 'bi-boxes' },
      { label: 'Physical stock', value: number(report.physical_stock), icon: 'bi-box-seam' },
      { label: 'Sellable stock', value: number(report.sellable_stock), icon: 'bi-bag-check' },
      { label: 'Expired stock', value: number(report.expired_stock), icon: 'bi-calendar-x' },
      { label: 'Low stock products', value: number(report.low_stock_products), icon: 'bi-exclamation-triangle' },
      { label: 'Out of stock products', value: number(report.out_of_stock_products), icon: 'bi-x-octagon' },
      { label: 'Provisional deficit', value: number(report.provisional_deficit), icon: 'bi-dash-circle' },
      { label: 'Inventory value at cost', value: currency(report.stock_value_purchase), icon: 'bi-currency-rupee' },
    ];
  }, [report]);

  const attentionProducts = useMemo(() => products
    .filter((product) => product.inventory && (
      product.inventory.is_low_stock ||
      product.inventory.is_out_of_stock ||
      Number(product.inventory.expired_quantity) > 0 ||
      Number(product.inventory.provisional_deficit) > 0
    ))
    .sort((left, right) => Number(left.inventory?.projected_net_quantity || 0) - Number(right.inventory?.projected_net_quantity || 0))
    .slice(0, 20), [products]);

  const selectedBranch = branches.find((branch) => String(branch.branch_id || branch.id) === String(branchId));
  const hasData = Boolean(report);

  return <div className="page-stack dashboard-page">
    <div className="page-header dashboard-header">
      <div><span className="eyebrow">Canonical inventory analytics</span><h1>Inventory Analytics</h1><p>Branch inventory truth from Central/PostgreSQL, including expiry-aware sellable stock, offline deficits and product-level attention signals.</p></div>
      <button className="secondary-btn" onClick={() => setRefreshKey((value) => value + 1)} disabled={loading || !branchId}><i className="bi bi-arrow-clockwise" /> Refresh</button>
    </div>

    <section className="panel dashboard-filters" aria-label="Inventory analytics filters">
      <label className="field compact"><span>Store / branch</span><select value={branchId} onChange={(event) => setBranchId(event.target.value)} disabled={loadingBranches}><option value="">Select a permitted branch</option>{branches.map((branch) => { const id = branch.branch_id || branch.id; return <option key={id} value={id}>{branch.branch_name || branch.name || id}</option>; })}</select></label>
      <div className="dashboard-authority-note"><i className="bi bi-database-check" /><div><strong>Authority: Central inventory projections</strong><span>Aggregate KPIs come from `/reports/inventory`; product attention rows come from branch-scoped `/v1/products` inventory projections. RetailHub does not recalculate canonical totals.</span></div></div>
    </section>

    {!branchId && !loadingBranches && <section className="panel dashboard-state"><i className="bi bi-shop" /><strong>Select a branch</strong><span>Inventory reporting is branch-scoped so physical, sellable, expired and provisional-deficit quantities remain truthful.</span></section>}
    {loading && <section className="panel dashboard-state" role="status"><i className="bi bi-hourglass-split" /><strong>Loading inventory analytics…</strong><span>Reading branch inventory facts from Central.</span></section>}
    {!loading && error && <section className="panel dashboard-state dashboard-error" role="alert"><i className="bi bi-exclamation-triangle" /><strong>Inventory analytics unavailable</strong><span>{error}</span><button className="secondary-btn" onClick={() => setRefreshKey((value) => value + 1)}>Retry Central inventory</button></section>}

    {!loading && !error && hasData && <>
      <div className="metric-grid">{cards.map((card) => <div className="metric-card tone-info" key={card.label}><i className={`bi ${card.icon}`} /><div><span>{card.label}</span><strong>{card.value}</strong></div></div>)}</div>

      <section className="panel">
        <div className="panel-title"><i className="bi bi-exclamation-diamond" /><div><h2>Products needing attention</h2><p>Canonical branch product projections with low/out-of-stock, expired stock or provisional offline deficits. Showing up to 20 from the first 100 branch products.</p></div></div>
        {attentionProducts.length === 0 ? <div className="dashboard-state"><i className="bi bi-check2-circle" /><strong>No product-level exceptions in the loaded projection</strong><span>Aggregate report KPIs remain the authority for the complete branch.</span></div> : <div className="table-wrap"><table><thead><tr><th>Product</th><th>State</th><th>Projected</th><th>Sellable / Physical</th><th>Expired</th><th>Offline deficit</th><th>Cost</th></tr></thead><tbody>{attentionProducts.map((product) => {
          const inventory = product.inventory;
          const state = stockState(inventory);
          return <tr key={product.id}><td><strong>{product.name || 'Unnamed product'}</strong><br/><small>{product.category || 'Uncategorized'}{product.barcode ? ` · ${product.barcode}` : ''}{product.is_batch_enabled ? ' · Batch tracked' : ''}</small></td><td><span className={`status-pill ${state.tone}`}>{state.label}</span></td><td>{number(inventory.projected_net_quantity)}</td><td>{number(inventory.sellable_quantity)} / {number(inventory.physical_quantity)}</td><td>{number(inventory.expired_quantity)}</td><td>{number(inventory.provisional_deficit)}</td><td>{currency(product.purchase_price)}</td></tr>;
        })}</tbody></table></div>}
      </section>

      <section className="panel"><div className="panel-title"><i className="bi bi-shield-check" /><div><h2>{selectedBranch?.branch_name || selectedBranch?.name || 'Selected branch'} inventory basis</h2><p>{report.stock_basis || 'Canonical branch inventory facts'}</p></div></div><div className="content-grid two-one"><div className="dashboard-scope-note"><i className="bi bi-check2-circle" /><div><strong>Sellable stock</strong><span>Expiry-aware stock available for sale in the selected branch.</span></div></div><div className="dashboard-scope-note"><i className="bi bi-exclamation-diamond" /><div><strong>Provisional deficit</strong><span>Offline oversell not yet backed by physical branch allocation remains visible instead of being hidden.</span></div></div></div></section>
      <section className="panel dashboard-scope-note"><i className="bi bi-info-circle" /><div><strong>Analytics ownership</strong><span>RetailHub displays Central facts only. Product exception rows are operational drill-down signals, while `/reports/inventory` remains authoritative for full-branch aggregate totals and valuation.</span></div></section>
    </>}
  </div>;
}

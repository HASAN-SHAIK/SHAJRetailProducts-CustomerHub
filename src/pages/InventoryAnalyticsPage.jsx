import React, { useEffect, useMemo, useState } from 'react';
import { api, unwrap } from '../lib/api';
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

export default function InventoryAnalyticsPage() {
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState('');
  const [report, setReport] = useState(null);
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
      setError('');
      return;
    }
    let active = true;
    setLoading(true);
    setError('');
    api.inventoryReport({ branchId }).then((response) => {
      if (!active) return;
      setReport(unwrap(response));
    }).catch((requestError) => {
      if (!active) return;
      setReport(null);
      setError(requestError?.response?.data?.message || 'Unable to load canonical inventory analytics.');
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

  const selectedBranch = branches.find((branch) => String(branch.branch_id || branch.id) === String(branchId));
  const hasData = Boolean(report);

  return <div className="page-stack dashboard-page">
    <div className="page-header dashboard-header">
      <div><span className="eyebrow">Canonical inventory analytics</span><h1>Inventory Analytics</h1><p>Branch inventory truth from Central/PostgreSQL, including expiry-aware sellable stock and provisional offline deficits.</p></div>
      <button className="secondary-btn" onClick={() => setRefreshKey((value) => value + 1)} disabled={loading || !branchId}><i className="bi bi-arrow-clockwise" /> Refresh</button>
    </div>

    <section className="panel dashboard-filters" aria-label="Inventory analytics filters">
      <label className="field compact"><span>Store / branch</span><select value={branchId} onChange={(event) => setBranchId(event.target.value)} disabled={loadingBranches}><option value="">Select a permitted branch</option>{branches.map((branch) => { const id = branch.branch_id || branch.id; return <option key={id} value={id}>{branch.branch_name || branch.name || id}</option>; })}</select></label>
      <div className="dashboard-authority-note"><i className="bi bi-database-check" /><div><strong>Authority: Central inventory report</strong><span>RetailHub reads `/reports/inventory`; it does not use POS SQLite as the management-reporting source.</span></div></div>
    </section>

    {!branchId && !loadingBranches && <section className="panel dashboard-state"><i className="bi bi-shop" /><strong>Select a branch</strong><span>Inventory reporting is branch-scoped so physical, sellable, expired and provisional-deficit quantities remain truthful.</span></section>}
    {loading && <section className="panel dashboard-state" role="status"><i className="bi bi-hourglass-split" /><strong>Loading inventory analytics…</strong><span>Reading branch inventory facts from Central.</span></section>}
    {!loading && error && <section className="panel dashboard-state dashboard-error" role="alert"><i className="bi bi-exclamation-triangle" /><strong>Inventory analytics unavailable</strong><span>{error}</span><button className="secondary-btn" onClick={() => setRefreshKey((value) => value + 1)}>Retry Central inventory</button></section>}

    {!loading && !error && hasData && <>
      <div className="metric-grid">{cards.map((card) => <div className="metric-card tone-info" key={card.label}><i className={`bi ${card.icon}`} /><div><span>{card.label}</span><strong>{card.value}</strong></div></div>)}</div>
      <section className="panel"><div className="panel-title"><i className="bi bi-shield-check" /><div><h2>{selectedBranch?.branch_name || selectedBranch?.name || 'Selected branch'} inventory basis</h2><p>{report.stock_basis || 'Canonical branch inventory facts'}</p></div></div><div className="content-grid two-one"><div className="dashboard-scope-note"><i className="bi bi-check2-circle" /><div><strong>Sellable stock</strong><span>Expiry-aware stock available for sale in the selected branch.</span></div></div><div className="dashboard-scope-note"><i className="bi bi-exclamation-diamond" /><div><strong>Provisional deficit</strong><span>Offline oversell not yet backed by physical branch allocation remains visible instead of being hidden.</span></div></div></div></section>
      <section className="panel dashboard-scope-note"><i className="bi bi-info-circle" /><div><strong>Migration slice 3</strong><span>This replaces POS management-level inventory intelligence after acceptance. Product/category analytics is the next family.</span></div></section>
    </>}
  </div>;
}

import React, { useEffect, useMemo, useState } from 'react';
import { api, unwrap } from '../lib/api';
import { inventoryApi } from '../lib/inventoryApi';
import '../styles/dashboard.css';

const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value || 0));
const dateTime = (value) => value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
const errorMessage = (error, fallback) => error?.response?.data?.error?.message || error?.response?.data?.message || fallback;

export default function PurchaseBookPage() {
  const [branches, setBranches] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [filters, setFilters] = useState({ branchId: '', supplierId: '', startDate: '', endDate: '' });
  const [purchases, setPurchases] = useState([]);
  const [meta, setMeta] = useState({ page: 1, total: 0, total_pages: 0 });
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.branches(), inventoryApi.suppliers({ limit: 200 })]).then(([branchResponse, supplierResponse]) => {
      const branchBody = unwrap(branchResponse);
      const branchList = Array.isArray(branchBody) ? branchBody : (branchBody?.branches || []);
      const supplierList = unwrap(supplierResponse, 'suppliers');
      setBranches(branchList);
      setSuppliers(Array.isArray(supplierList) ? supplierList : []);
      if (branchList.length === 1) setFilters((current) => ({ ...current, branchId: String(branchList[0].branch_id || branchList[0].id || '') }));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    inventoryApi.purchases({ ...filters, page, limit: 25 }).then((response) => {
      if (!active) return;
      const list = unwrap(response, 'purchases');
      setPurchases(Array.isArray(list) ? list : []);
      setMeta({ page: Number(response?.data?.meta?.page || page), total: Number(response?.data?.meta?.total || 0), total_pages: Number(response?.data?.meta?.total_pages || 0) });
    }).catch((requestError) => { if (active) setError(errorMessage(requestError, 'Unable to load purchase book.')); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters.branchId, filters.supplierId, filters.startDate, filters.endDate, page]);

  const openDetail = async (id) => {
    setSelectedId(id); setDetailLoading(true); setError('');
    try { setDetail(unwrap(await inventoryApi.purchase(id))); }
    catch (requestError) { setDetail(null); setError(errorMessage(requestError, 'Unable to load purchase detail.')); }
    finally { setDetailLoading(false); }
  };
  const changeFilter = (key, value) => { setPage(1); setSelectedId(null); setDetail(null); setFilters((current) => ({ ...current, [key]: value })); };
  const summary = useMemo(() => purchases.reduce((acc, row) => ({ total: acc.total + Number(row.total_price || 0), paid: acc.paid + Number(row.total_paid || 0) }), { total: 0, paid: 0 }), [purchases]);
  const order = detail?.order || null;
  const items = Array.isArray(detail?.items) ? detail.items : [];
  const batches = Array.isArray(detail?.batches) ? detail.batches : [];

  return <div className="page-stack dashboard-page">
    <section className="hero-panel"><div><span className="eyebrow">Inventory · Purchasing</span><h1>Purchase Book</h1><p>Read canonical supplier purchases recorded by Central, including payment status, received lines and batch/expiry facts.</p></div></section>
    {error && <div className="state-card bad" role="alert"><strong>Purchase book issue</strong><span>{error}</span></div>}
    <div className="metric-grid"><div className="metric-card tone-info"><div><span>Matched purchases</span><strong>{meta.total}</strong></div></div><div className="metric-card tone-info"><div><span>Visible purchase value</span><strong>{money(summary.total)}</strong></div></div><div className="metric-card tone-info"><div><span>Visible paid</span><strong>{money(summary.paid)}</strong></div></div><div className="metric-card tone-info"><div><span>Visible outstanding</span><strong>{money(summary.total - summary.paid)}</strong></div></div></div>
    <section className="panel"><div className="panel-title"><i className="bi bi-funnel"/><div><h2>Purchase filters</h2><p>Central filters by branch, supplier and received date.</p></div></div><div className="form-grid three-col">
      <label><span>Store / branch</span><select value={filters.branchId} onChange={(e) => changeFilter('branchId', e.target.value)}><option value="">All permitted scope</option>{branches.map((branch) => { const id = branch.branch_id || branch.id; return <option key={id} value={id}>{branch.branch_name || branch.name || id}</option>; })}</select></label>
      <label><span>Supplier</span><select value={filters.supplierId} onChange={(e) => changeFilter('supplierId', e.target.value)}><option value="">All suppliers</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
      <label><span>From date</span><input type="date" value={filters.startDate} onChange={(e) => changeFilter('startDate', e.target.value)}/></label><label><span>To date</span><input type="date" value={filters.endDate} onChange={(e) => changeFilter('endDate', e.target.value)}/></label>
    </div></section>
    <div className="content-grid two-one"><section className="panel"><div className="panel-title"><i className="bi bi-journal-text"/><div><h2>Purchase register</h2><p>Click a purchase to inspect its canonical receiving detail.</p></div></div>
      {loading ? <div className="state-card">Loading purchases…</div> : purchases.length === 0 ? <div className="state-card">No purchases found.</div> : <div className="table-wrap"><table><thead><tr><th>Date</th><th>Supplier</th><th>Invoice</th><th>Total</th><th>Paid</th><th>Outstanding</th><th>Status</th></tr></thead><tbody>{purchases.map((row) => <tr key={row.id} onClick={() => openDetail(row.id)} style={{cursor:'pointer'}}><td>{dateTime(row.created_at)}</td><td><strong>{row.supplier_name || `Supplier #${row.supplier_id}`}</strong></td><td>{row.invoice_number || '—'}</td><td>{money(row.total_price)}</td><td>{money(row.total_paid)}</td><td>{money(Number(row.total_price || 0) - Number(row.total_paid || 0))}</td><td>{row.order_status || row.payment_mode || '—'}</td></tr>)}</tbody></table></div>}
      {!loading && meta.total_pages > 1 && <div className="row-actions"><button className="secondary-btn" disabled={page <= 1} onClick={() => setPage((v) => Math.max(1, v - 1))}>Previous</button><span>Page {meta.page} of {meta.total_pages}</span><button className="secondary-btn" disabled={page >= meta.total_pages} onClick={() => setPage((v) => v + 1)}>Next</button></div>}
    </section><section className="panel"><div className="panel-title"><i className="bi bi-receipt"/><div><h2>Purchase detail</h2><p>Supplier, received lines and batch facts from Central.</p></div></div>
      {detailLoading ? <div className="state-card">Loading purchase detail…</div> : !order ? <div className="state-card">Select a purchase.</div> : <div className="page-stack"><div><strong>Purchase #{order.id}</strong><p>{order.supplier_name || `Supplier #${order.supplier_id}`} · {dateTime(order.created_at)}</p><p>Invoice {order.invoice_number || '—'} · {order.payment_mode || '—'} · Outstanding {money(order.payable_outstanding)}</p></div><div className="table-wrap"><table><thead><tr><th>Product</th><th>Qty</th><th>Cost</th><th>GST</th><th>Batch</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.product_name}</td><td>{item.quantity}</td><td>{money(item.purchase_price_snapshot)}</td><td>{item.gst_percent ?? 0}%</td><td>{item.batch_number || '—'}</td></tr>)}</tbody></table></div>{batches.length > 0 && <div><strong>Received batches</strong>{batches.map((batch) => <p key={batch.id}>{batch.batch_number} · Remaining {batch.quantity_remaining} · Expiry {batch.expiry_date ? String(batch.expiry_date).slice(0,10) : '—'}</p>)}</div>}</div>}
    </section></div>
    <section className="panel dashboard-scope-note"><i className="bi bi-shield-check"/><div><strong>Read-only purchase authority</strong><span>Purchase Book never recalculates or mutates inventory. It presents Central purchase, payment and receiving records; corrections and returns remain separate audited workflows.</span></div></section>
  </div>;
}

import React, { useEffect, useMemo, useState } from 'react';
import { api, unwrap } from '../lib/api';
import { inventoryApi } from '../lib/inventoryApi';
import '../styles/dashboard.css';

const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value || 0));
const dateTime = (value) => value ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—';
const errorMessage = (error, fallback) => error?.response?.data?.error?.message || error?.response?.data?.message || fallback;

export default function PurchaseReturnsPage() {
  const [branches, setBranches] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [returns, setReturns] = useState([]);
  const [filters, setFilters] = useState({ branchId: '', supplierId: '', purchaseId: '' });
  const [purchaseDetail, setPurchaseDetail] = useState(null);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadReference = async () => {
    const [branchResponse, supplierResponse, purchaseResponse] = await Promise.all([
      api.branches(),
      inventoryApi.suppliers({ limit: 200 }),
      inventoryApi.purchases({ page: 1, limit: 100 }),
    ]);
    const branchBody = unwrap(branchResponse);
    const branchList = Array.isArray(branchBody) ? branchBody : (branchBody?.branches || []);
    const supplierList = unwrap(supplierResponse, 'suppliers');
    const purchaseList = unwrap(purchaseResponse, 'purchases');
    setBranches(branchList);
    setSuppliers(Array.isArray(supplierList) ? supplierList : []);
    setPurchases(Array.isArray(purchaseList) ? purchaseList : []);
    if (branchList.length === 1) setFilters((current) => ({ ...current, branchId: String(branchList[0].branch_id || branchList[0].id || '') }));
  };

  const loadReturns = async (nextFilters = filters) => {
    setLoading(true); setError('');
    try {
      const response = await inventoryApi.purchaseReturns({ ...nextFilters, limit: 100 });
      const list = unwrap(response, 'returns');
      setReturns(Array.isArray(list) ? list : []);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to load purchase returns.'));
    } finally { setLoading(false); }
  };

  useEffect(() => {
    loadReference().catch((requestError) => setError(errorMessage(requestError, 'Unable to load purchase return reference data.')));
    loadReturns({ branchId: '', supplierId: '', purchaseId: '' });
  }, []);

  useEffect(() => {
    if (!filters.purchaseId) { setPurchaseDetail(null); setSelectedBatchId(''); return; }
    let active = true;
    inventoryApi.purchase(filters.purchaseId).then((response) => {
      if (!active) return;
      setPurchaseDetail(unwrap(response));
      setSelectedBatchId('');
      setQuantity('1');
    }).catch((requestError) => { if (active) setError(errorMessage(requestError, 'Unable to load selected purchase.')); });
    return () => { active = false; };
  }, [filters.purchaseId]);

  const order = purchaseDetail?.order || null;
  const batches = Array.isArray(purchaseDetail?.batches) ? purchaseDetail.batches : [];
  const items = Array.isArray(purchaseDetail?.items) ? purchaseDetail.items : [];
  const selectedBatch = batches.find((batch) => String(batch.id) === String(selectedBatchId));
  const productNames = useMemo(() => new Map(items.map((item) => [String(item.product_id), item.product_name || `Product #${item.product_id}`])), [items]);
  const filteredPurchases = useMemo(() => purchases.filter((row) => {
    if (filters.branchId && String(row.branch_id || '') !== String(filters.branchId)) return false;
    if (filters.supplierId && String(row.supplier_id || '') !== String(filters.supplierId)) return false;
    return true;
  }), [purchases, filters.branchId, filters.supplierId]);

  const changeFilter = (key, value) => {
    const next = { ...filters, [key]: value };
    if (key === 'branchId' || key === 'supplierId') next.purchaseId = '';
    setFilters(next); setSuccess('');
    loadReturns(next);
  };

  const submitReturn = async (event) => {
    event.preventDefault(); setError(''); setSuccess('');
    if (!order || !selectedBatch) { setError('Select a purchase and received batch to return.'); return; }
    const qty = Number(quantity);
    const available = Number(selectedBatch.quantity_remaining ?? selectedBatch.quantity ?? 0);
    if (!Number.isFinite(qty) || qty <= 0) { setError('Return quantity must be greater than zero.'); return; }
    if (qty > available) { setError('Return quantity cannot exceed the selected batch remaining quantity.'); return; }
    const supplierId = Number(order.supplier_id || filters.supplierId);
    if (!Number.isFinite(supplierId)) { setError('Selected purchase has no valid supplier.'); return; }
    setSaving(true);
    try {
      await inventoryApi.createPurchaseReturn({
        purchase_id: Number(order.id),
        supplier_id: supplierId,
        branch_id: order.branch_id || filters.branchId || null,
        reason: reason.trim() || null,
        items: [{ batch_id: selectedBatch.id, product_id: Number(selectedBatch.product_id), quantity: qty }],
      });
      setSuccess('Purchase return recorded in Central. Inventory, supplier payable and ledger effects were applied by the canonical backend transaction.');
      setReason(''); setSelectedBatchId(''); setQuantity('1');
      const refreshed = await inventoryApi.purchase(order.id);
      setPurchaseDetail(unwrap(refreshed));
      await loadReturns(filters);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Unable to record purchase return.'));
    } finally { setSaving(false); }
  };

  return <div className="page-stack dashboard-page">
    <section className="hero-panel"><div><span className="eyebrow">Inventory · Purchasing</span><h1>Purchase Returns</h1><p>Return received supplier stock against the exact Central purchase and batch. The backend remains authoritative for stock, payable and accounting reversal.</p></div></section>
    {error && <div className="state-card bad" role="alert"><strong>Purchase return issue</strong><span>{error}</span></div>}
    {success && <div className="state-card live" role="status"><strong>Return recorded</strong><span>{success}</span></div>}

    <section className="panel"><div className="panel-title"><i className="bi bi-arrow-counterclockwise"/><div><h2>Create purchase return</h2><p>Select the original purchase and a remaining received batch. Returns cannot exceed canonical remaining batch quantity.</p></div></div>
      <form className="page-stack" onSubmit={submitReturn}>
        <div className="form-grid three-col">
          <label><span>Store / branch</span><select value={filters.branchId} onChange={(e) => changeFilter('branchId', e.target.value)}><option value="">All permitted scope</option>{branches.map((branch) => { const id = branch.branch_id || branch.id; return <option key={id} value={id}>{branch.branch_name || branch.name || id}</option>; })}</select></label>
          <label><span>Supplier</span><select value={filters.supplierId} onChange={(e) => changeFilter('supplierId', e.target.value)}><option value="">All suppliers</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
          <label><span>Original purchase</span><select value={filters.purchaseId} onChange={(e) => changeFilter('purchaseId', e.target.value)}><option value="">Select purchase</option>{filteredPurchases.map((row) => <option key={row.id} value={row.id}>#{row.id} · {row.supplier_name || `Supplier #${row.supplier_id}`} · {money(row.total_price)}</option>)}</select></label>
        </div>
        {order && <div className="form-grid three-col">
          <label><span>Received batch</span><select value={selectedBatchId} onChange={(e) => setSelectedBatchId(e.target.value)}><option value="">Select batch</option>{batches.filter((batch) => Number(batch.quantity_remaining ?? batch.quantity ?? 0) > 0).map((batch) => <option key={batch.id} value={batch.id}>{productNames.get(String(batch.product_id)) || `Product #${batch.product_id}`} · {batch.batch_number || `Batch #${batch.id}`} · Remaining {batch.quantity_remaining ?? batch.quantity ?? 0}</option>)}</select></label>
          <label><span>Return quantity</span><input type="number" min="0.001" step="0.001" value={quantity} onChange={(e) => setQuantity(e.target.value)}/></label>
          <label><span>Reason</span><input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Damaged, expired, supplier recall…"/></label>
        </div>}
        {selectedBatch && <div className="state-card"><strong>{productNames.get(String(selectedBatch.product_id)) || `Product #${selectedBatch.product_id}`}</strong><span>Batch {selectedBatch.batch_number || selectedBatch.id} · Remaining {selectedBatch.quantity_remaining ?? selectedBatch.quantity ?? 0} · Purchase cost {money(selectedBatch.purchase_price)}</span></div>}
        <div className="hero-actions"><button className="primary-btn" disabled={saving || !order || !selectedBatch}>{saving ? 'Recording…' : 'Record purchase return'}</button></div>
      </form>
    </section>

    <section className="panel"><div className="panel-title"><i className="bi bi-clock-history"/><div><h2>Return history</h2><p>Canonical purchase-return records for the selected scope.</p></div></div>
      {loading ? <div className="state-card">Loading returns…</div> : returns.length === 0 ? <div className="state-card">No purchase returns found.</div> : <div className="table-wrap"><table><thead><tr><th>Date</th><th>Return</th><th>Purchase</th><th>Supplier</th><th>Amount</th><th>Reason</th></tr></thead><tbody>{returns.map((row) => <tr key={row.id}><td>{dateTime(row.created_at)}</td><td>#{row.id}</td><td>#{row.purchase_id}</td><td>{row.supplier_name || `Supplier #${row.supplier_id}`}</td><td>{money(row.total_amount)}</td><td>{row.reason || '—'}</td></tr>)}</tbody></table></div>}
    </section>

    <section className="panel dashboard-scope-note"><i className="bi bi-shield-check"/><div><strong>Inventory invariant</strong><span>RetailHub never decrements stock itself. The V1 return endpoint validates the purchase, supplier, branch, batch, product and quantity, then delegates to the existing canonical purchase-return transaction for inventory and accounting effects.</span></div></section>
  </div>;
}

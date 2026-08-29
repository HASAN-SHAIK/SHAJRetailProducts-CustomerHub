import React, { useEffect, useMemo, useState } from 'react';
import { api, unwrap } from '../lib/api';
import { inventoryApi } from '../lib/inventoryApi';
import '../styles/dashboard.css';

const number = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 }).format(numeric);
};

const getError = (error, fallback) => error?.response?.data?.error?.message || error?.response?.data?.error || error?.response?.data?.message || fallback;

export default function StockAdjustmentsPage() {
  const [branches, setBranches] = useState([]);
  const [products, setProducts] = useState([]);
  const [batches, setBatches] = useState([]);
  const [branchId, setBranchId] = useState('');
  const [productId, setProductId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [branchStock, setBranchStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [lastAdjustment, setLastAdjustment] = useState(null);

  useEffect(() => {
    let active = true;
    api.branches().then((response) => {
      if (!active) return;
      const body = unwrap(response);
      const rows = Array.isArray(body) ? body : (body?.branches || []);
      setBranches(rows);
      if (rows.length === 1) setBranchId(String(rows[0].branch_id || rows[0].id || ''));
    }).catch((requestError) => active && setError(getError(requestError, 'Unable to load branches.')))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!branchId) { setProducts([]); setProductId(''); setBatches([]); return; }
    let active = true;
    setError('');
    Promise.all([
      inventoryApi.products({ branchId, page: 1, limit: 100, sortBy: 'name', sortOrder: 'asc' }),
      inventoryApi.batches({ branchId }),
    ]).then(([productsResponse, batchesResponse]) => {
      if (!active) return;
      const productRows = unwrap(productsResponse, 'products');
      setProducts(Array.isArray(productRows) ? productRows : []);
      const batchBody = unwrap(batchesResponse);
      const batchRows = Array.isArray(batchBody) ? batchBody : (batchBody?.batches || []);
      setBatches(batchRows);
      setProductId(''); setBatchId(''); setBranchStock(null); setLastAdjustment(null);
    }).catch((requestError) => active && setError(getError(requestError, 'Unable to load branch inventory.')));
    return () => { active = false; };
  }, [branchId]);

  const selectedProduct = useMemo(() => products.find((product) => String(product.id) === String(productId)) || null, [products, productId]);
  const productBatches = useMemo(() => batches.filter((batch) => String(batch.product_id) === String(productId)), [batches, productId]);
  const selectedBatch = useMemo(() => productBatches.find((batch) => String(batch.id) === String(batchId)) || null, [productBatches, batchId]);

  useEffect(() => {
    if (!productId || !branchId) { setBranchStock(null); return; }
    let active = true;
    inventoryApi.branchStock({ productId, branchId }).then((response) => {
      if (!active) return;
      const body = unwrap(response);
      const rows = Array.isArray(body?.stock) ? body.stock : [];
      const row = rows.find((item) => String(item.branch_id) === String(branchId)) || rows[0] || null;
      setBranchStock(row);
    }).catch((requestError) => active && setError(getError(requestError, 'Unable to load canonical branch stock.')));
    return () => { active = false; };
  }, [productId, branchId, lastAdjustment]);

  useEffect(() => {
    setBatchId(''); setDelta(''); setReason(''); setReferenceId(''); setLastAdjustment(null);
  }, [productId]);

  const currentQuantity = selectedProduct?.is_batch_enabled
    ? Number(selectedBatch?.quantity_remaining ?? 0)
    : Number(branchStock?.quantity ?? selectedProduct?.inventory?.projected_net_quantity ?? 0);
  const deltaNumber = Number(delta);
  const projectedQuantity = Number.isFinite(deltaNumber) ? currentQuantity + deltaNumber : currentQuantity;

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!branchId || !productId) { setError('Select a branch and product.'); return; }
    if (selectedProduct?.is_batch_enabled && !batchId) { setError('Select the exact batch for a batch-managed product.'); return; }
    if (!Number.isFinite(deltaNumber) || deltaNumber === 0) { setError('Adjustment quantity must be a non-zero number.'); return; }
    if (projectedQuantity < 0) { setError('Adjustment cannot make canonical stock negative.'); return; }
    if (!reason.trim()) { setError('Reason is required for every manual stock adjustment.'); return; }

    setSaving(true);
    try {
      const response = await inventoryApi.adjustStock({
        branch_id: branchId,
        product_id: Number(productId),
        batch_id: selectedProduct?.is_batch_enabled ? batchId : null,
        delta_quantity: deltaNumber,
        reason: reason.trim(),
        reference_id: referenceId.trim() || null,
      });
      const body = unwrap(response);
      setLastAdjustment(body?.adjustment || body);
      setDelta(''); setReason(''); setReferenceId('');
      const [productsResponse, batchesResponse] = await Promise.all([
        inventoryApi.products({ branchId, page: 1, limit: 100, sortBy: 'name', sortOrder: 'asc' }),
        inventoryApi.batches({ branchId }),
      ]);
      const productRows = unwrap(productsResponse, 'products');
      const batchBody = unwrap(batchesResponse);
      setProducts(Array.isArray(productRows) ? productRows : []);
      setBatches(Array.isArray(batchBody?.batches) ? batchBody.batches : (Array.isArray(batchBody) ? batchBody : []));
    } catch (requestError) {
      setError(getError(requestError, 'Stock adjustment failed.'));
    } finally {
      setSaving(false);
    }
  };

  return <div className="page-stack dashboard-page">
    <section className="hero-panel"><div><span className="eyebrow">Inventory · audited corrections</span><h1>Stock Adjustments</h1><p>Correct physical-count differences through Central only. Every change requires a reason, remains branch scoped, and uses the canonical audited stock mutation instead of editing product quantity directly.</p></div></section>

    {error && <div className="state-card bad" role="alert"><strong>Adjustment unavailable</strong><span>{error}</span></div>}

    <section className="panel">
      <div className="panel-title"><i className="bi bi-sliders"/><div><h2>Manual correction</h2><p>Positive quantities add stock; negative quantities remove stock. Purchases and returns must continue through their dedicated workflows.</p></div></div>
      {loading ? <div className="state-card">Loading branch authority…</div> : <form className="page-stack" onSubmit={submit}>
        <div className="form-grid three-col">
          <label><span>Store / branch</span><select value={branchId} onChange={(event) => setBranchId(event.target.value)} required><option value="">Select branch</option>{branches.map((branch) => { const id = branch.branch_id || branch.id; return <option key={id} value={id}>{branch.branch_name || branch.name || id}</option>; })}</select></label>
          <label><span>Product</span><select value={productId} onChange={(event) => setProductId(event.target.value)} disabled={!branchId} required><option value="">Select product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}{product.is_batch_enabled ? ' · batch tracked' : ''}</option>)}</select></label>
          {selectedProduct?.is_batch_enabled && <label><span>Batch</span><select value={batchId} onChange={(event) => setBatchId(event.target.value)} required><option value="">Select exact batch</option>{productBatches.map((batch) => <option key={batch.id} value={batch.id}>{batch.batch_number || batch.id} · remaining {number(batch.quantity_remaining)}</option>)}</select></label>}
          <label><span>Adjustment quantity</span><input type="number" step="0.001" value={delta} onChange={(event) => setDelta(event.target.value)} placeholder="e.g. -2 or 5" required/></label>
          <label><span>Reason</span><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Physical count correction" required/></label>
          <label><span>Reference</span><input value={referenceId} onChange={(event) => setReferenceId(event.target.value)} placeholder="Count sheet / ticket (optional)"/></label>
        </div>
        {selectedProduct && <div className="metric-grid">
          <div className="metric-card tone-info"><div><span>Current canonical quantity</span><strong>{selectedProduct.is_batch_enabled && !selectedBatch ? 'Select batch' : number(currentQuantity)}</strong></div></div>
          <div className="metric-card tone-info"><div><span>Projected after adjustment</span><strong>{selectedProduct.is_batch_enabled && !selectedBatch ? '—' : number(projectedQuantity)}</strong></div></div>
          <div className="metric-card tone-info"><div><span>Tracking</span><strong>{selectedProduct.is_batch_enabled ? 'Batch + product' : 'Product'}</strong></div></div>
        </div>}
        <div className="dashboard-scope-note"><i className="bi bi-shield-check"/><div><strong>Audit boundary</strong><span>Central records the authenticated actor, reason, source and optional reference inside the same transaction as the stock change. This page never writes stock locally.</span></div></div>
        <div className="hero-actions"><button className="primary-btn" disabled={saving || !selectedProduct || (selectedProduct?.is_batch_enabled && !selectedBatch)}>{saving ? 'Applying…' : 'Apply audited adjustment'}</button></div>
      </form>}
    </section>

    {lastAdjustment && <section className="panel"><div className="panel-title"><i className="bi bi-check2-circle"/><div><h2>Adjustment recorded</h2><p>The canonical transaction completed successfully.</p></div></div><div className="metric-grid"><div className="metric-card tone-info"><div><span>Before</span><strong>{number(lastAdjustment.before_quantity)}</strong></div></div><div className="metric-card tone-info"><div><span>Delta</span><strong>{number(lastAdjustment.delta_quantity)}</strong></div></div><div className="metric-card tone-info"><div><span>After</span><strong>{number(lastAdjustment.after_quantity)}</strong></div></div></div><p><strong>Reason:</strong> {lastAdjustment.reason || '—'}{lastAdjustment.reference_id ? ` · Reference: ${lastAdjustment.reference_id}` : ''}</p></section>}
  </div>;
}

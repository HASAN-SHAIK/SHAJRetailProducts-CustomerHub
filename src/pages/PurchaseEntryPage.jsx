import React, { useEffect, useMemo, useState } from 'react';
import { api, unwrap } from '../lib/api';
import { inventoryApi } from '../lib/inventoryApi';
import '../styles/dashboard.css';

const emptyLine = () => ({ product_id: '', quantity: '1', purchase_price: '', selling_price: '', mrp: '', gst_percent: '0', batch_number: '', expiry_date: '' });
const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value || 0));
const errorMessage = (error, fallback) => error?.response?.data?.error?.message || error?.response?.data?.message || fallback;

export default function PurchaseEntryPage() {
  const [branches, setBranches] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [branchId, setBranchId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [paymentMode, setPaymentMode] = useState('credit');
  const [paidAmount, setPaidAmount] = useState('0');
  const [lines, setLines] = useState([emptyLine()]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([api.branches(), inventoryApi.suppliers({ limit: 200 })]).then(([branchResponse, supplierResponse]) => {
      if (!active) return;
      const branchBody = unwrap(branchResponse);
      const branchList = Array.isArray(branchBody) ? branchBody : (branchBody?.branches || []);
      const supplierList = unwrap(supplierResponse, 'suppliers');
      setBranches(branchList);
      setSuppliers(Array.isArray(supplierList) ? supplierList.filter((supplier) => supplier.is_active !== false) : []);
      if (branchList.length === 1) setBranchId(String(branchList[0].branch_id || branchList[0].id || ''));
    }).catch((requestError) => setError(errorMessage(requestError, 'Unable to load purchase references.'))).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!branchId) { setProducts([]); return; }
    let active = true;
    inventoryApi.products({ branchId, limit: 100, sortBy: 'name', sortOrder: 'asc' }).then((response) => {
      if (!active) return;
      const list = unwrap(response, 'products');
      setProducts(Array.isArray(list) ? list : []);
    }).catch((requestError) => { if (active) setError(errorMessage(requestError, 'Unable to load products for this branch.')); });
    return () => { active = false; };
  }, [branchId]);

  const productMap = useMemo(() => new Map(products.map((product) => [String(product.id), product])), [products]);
  const estimatedTotal = useMemo(() => lines.reduce((sum, line) => {
    const quantity = Number(line.quantity);
    const price = Number(line.purchase_price);
    const gst = Number(line.gst_percent);
    if (!Number.isFinite(quantity) || !Number.isFinite(price) || quantity <= 0 || price < 0) return sum;
    const base = quantity * price;
    return sum + base + (base * (Number.isFinite(gst) ? gst : 0) / 100);
  }, 0), [lines]);

  const updateLine = (index, key, value) => setLines((current) => current.map((line, i) => {
    if (i !== index) return line;
    if (key !== 'product_id') return { ...line, [key]: value };
    const product = productMap.get(String(value));
    return { ...line, product_id: value, purchase_price: String(product?.purchase_price ?? ''), selling_price: String(product?.selling_price ?? ''), mrp: String(product?.mrp ?? ''), gst_percent: String(product?.gst_percentage ?? 0), batch_number: '', expiry_date: '' };
  }));

  const removeLine = (index) => setLines((current) => current.length === 1 ? current : current.filter((_, i) => i !== index));

  const submit = async (event) => {
    event.preventDefault();
    setError(''); setSuccess(null);
    if (!branchId) return setError('Select a store / branch.');
    if (!supplierId) return setError('Select a supplier.');
    const items = [];
    for (const line of lines) {
      const product = productMap.get(String(line.product_id));
      const quantity = Number(line.quantity);
      const purchasePrice = Number(line.purchase_price);
      const sellingPrice = line.selling_price === '' ? undefined : Number(line.selling_price);
      const mrp = line.mrp === '' ? undefined : Number(line.mrp);
      const gst = Number(line.gst_percent || 0);
      if (!product) return setError('Every purchase line must select an existing Central product.');
      if (!Number.isFinite(quantity) || quantity <= 0) return setError('Quantity must be greater than zero.');
      if (!Number.isFinite(purchasePrice) || purchasePrice < 0) return setError('Purchase price must be zero or greater.');
      if (sellingPrice !== undefined && (!Number.isFinite(sellingPrice) || sellingPrice < 0)) return setError('Selling price must be zero or greater.');
      if (mrp !== undefined && (!Number.isFinite(mrp) || mrp < 0)) return setError('MRP must be zero or greater.');
      if (!Number.isFinite(gst) || gst < 0 || gst > 100) return setError('GST must be between 0 and 100.');
      if (product.is_batch_enabled && !line.batch_number.trim()) return setError(`Batch number is required for ${product.name}.`);
      items.push({ product_id: Number(product.id), quantity, purchase_price: purchasePrice, selling_price: sellingPrice, mrp, gst_percent: gst, batch_number: line.batch_number.trim() || undefined, expiry_date: line.expiry_date || undefined });
    }
    const paid = Number(paidAmount || 0);
    if (!Number.isFinite(paid) || paid < 0) return setError('Paid amount must be zero or greater.');
    setSaving(true);
    try {
      const response = await inventoryApi.createPurchase({ supplier_id: Number(supplierId), branch_id: branchId, invoice_number: invoiceNumber.trim() || null, payment_mode: paymentMode, paid_amount: paymentMode === 'credit' ? paid : undefined, items });
      const result = unwrap(response, 'purchase');
      setSuccess(result || {});
      setInvoiceNumber(''); setPaidAmount('0'); setLines([emptyLine()]);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Purchase could not be recorded.'));
    } finally { setSaving(false); }
  };

  return <div className="page-stack dashboard-page">
    <section className="hero-panel"><div><span className="eyebrow">Inventory · Receiving</span><h1>Purchase Entry</h1><p>Receive supplier stock through the canonical Central purchase transaction. Central owns batches, stock movement, supplier payable and accounting postings.</p></div></section>
    {error && <div className="state-card bad" role="alert"><strong>Purchase not saved</strong><span>{error}</span></div>}
    {success && <div className="state-card"><strong>Purchase recorded</strong><span>Order #{success.order_id || 'created'} · Total {money(success.total_price)} · Outstanding {money(success.payable_outstanding)}</span></div>}
    <form className="page-stack" onSubmit={submit}>
      <section className="panel"><div className="panel-title"><i className="bi bi-receipt-cutoff"/><div><h2>Purchase details</h2><p>Supplier and branch are validated by Central before stock is received.</p></div></div>
        <div className="form-grid three-col">
          <label><span>Store / branch</span><select value={branchId} onChange={(e) => setBranchId(e.target.value)} disabled={loading}><option value="">Select branch</option>{branches.map((branch) => { const id = branch.branch_id || branch.id; return <option key={id} value={id}>{branch.branch_name || branch.name || id}</option>; })}</select></label>
          <label><span>Supplier</span><select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} disabled={loading}><option value="">Select supplier</option>{suppliers.filter((supplier) => !supplier.branch_id || !branchId || String(supplier.branch_id) === String(branchId)).map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
          <label><span>Supplier invoice</span><input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="Optional invoice number"/></label>
          <label><span>Payment mode</span><select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)}><option value="credit">Credit</option><option value="cash">Cash</option><option value="bank">Bank</option><option value="online">Online</option></select></label>
          {paymentMode === 'credit' && <label><span>Paid now</span><input type="number" min="0" step="0.01" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)}/></label>}
        </div>
      </section>
      <section className="panel"><div className="panel-title"><i className="bi bi-box-arrow-in-down"/><div><h2>Received items</h2><p>Use existing Central products. New-product creation stays in Product Catalog.</p></div></div>
        {lines.map((line, index) => { const product = productMap.get(String(line.product_id)); return <div className="form-grid three-col" key={index}>
          <label><span>Product</span><select value={line.product_id} onChange={(e) => updateLine(index, 'product_id', e.target.value)} disabled={!branchId}><option value="">Select product</option>{products.map((item) => <option key={item.id} value={item.id}>{item.name}{item.barcode ? ` · ${item.barcode}` : ''}</option>)}</select></label>
          <label><span>Quantity</span><input type="number" min="0.001" step="0.001" value={line.quantity} onChange={(e) => updateLine(index, 'quantity', e.target.value)}/></label>
          <label><span>Purchase price</span><input type="number" min="0" step="0.01" value={line.purchase_price} onChange={(e) => updateLine(index, 'purchase_price', e.target.value)}/></label>
          <label><span>Selling price</span><input type="number" min="0" step="0.01" value={line.selling_price} onChange={(e) => updateLine(index, 'selling_price', e.target.value)}/></label>
          <label><span>MRP</span><input type="number" min="0" step="0.01" value={line.mrp} onChange={(e) => updateLine(index, 'mrp', e.target.value)}/></label>
          <label><span>GST %</span><input type="number" min="0" max="100" step="0.01" value={line.gst_percent} onChange={(e) => updateLine(index, 'gst_percent', e.target.value)}/></label>
          <label><span>Batch number{product?.is_batch_enabled ? ' *' : ''}</span><input value={line.batch_number} onChange={(e) => updateLine(index, 'batch_number', e.target.value)} placeholder={product?.is_batch_enabled ? 'Required' : 'Optional / auto-generated'}/></label>
          <label><span>Expiry date</span><input type="date" value={line.expiry_date} onChange={(e) => updateLine(index, 'expiry_date', e.target.value)}/></label>
          <div className="row-actions"><button type="button" className="secondary-btn" onClick={() => removeLine(index)} disabled={lines.length === 1}>Remove line</button></div>
        </div>; })}
        <div className="row-actions"><button type="button" className="secondary-btn" onClick={() => setLines((current) => [...current, emptyLine()])}><i className="bi bi-plus-lg"/> Add item</button><strong>Estimated total: {money(estimatedTotal)}</strong></div>
      </section>
      <section className="panel dashboard-scope-note"><i className="bi bi-shield-check"/><div><strong>Inventory invariant</strong><span>RetailHub submits receiving facts only. Central validates branch/supplier/product ownership, creates or updates batches, increments canonical stock, records purchase items, supplier payable and ledger postings atomically.</span></div></section>
      <div className="hero-actions"><button className="primary-btn" disabled={saving || loading}>{saving ? 'Recording purchase…' : 'Record purchase'}</button></div>
    </form>
  </div>;
}

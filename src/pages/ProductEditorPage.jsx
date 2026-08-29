import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, unwrap } from '../lib/api';
import { inventoryApi } from '../lib/inventoryApi';
import '../styles/dashboard.css';

const emptyForm = {
  name: '', category: '', company: '', barcode: '', hsn_code: '',
  selling_price: '', mrp: '', purchase_price: '', gst_percentage: '0',
  branch_id: '', is_weight_based: false, is_batch_enabled: false,
};

const toForm = (product = {}) => ({
  name: product.name || '',
  category: product.category || '',
  company: product.company || '',
  barcode: product.barcode || '',
  hsn_code: product.hsn_code || '',
  selling_price: product.selling_price == null ? '' : String(product.selling_price),
  mrp: product.mrp == null ? '' : String(product.mrp),
  purchase_price: product.purchase_price == null ? '' : String(product.purchase_price),
  gst_percentage: product.gst_percentage == null ? '0' : String(product.gst_percentage),
  branch_id: product.branch_id || '',
  is_weight_based: Boolean(product.is_weight_based),
  is_batch_enabled: Boolean(product.is_batch_enabled),
});

const optionalNumber = (value) => value === '' ? null : Number(value);

export default function ProductEditorPage() {
  const { productId } = useParams();
  const editing = Boolean(productId);
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [categories, setCategories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([api.branches(), inventoryApi.categories()]).then(([branchResponse, categoryResponse]) => {
      if (!active) return;
      const branchBody = unwrap(branchResponse);
      setBranches(Array.isArray(branchBody) ? branchBody : (branchBody?.branches || []));
      const categoryList = unwrap(categoryResponse, 'categories');
      setCategories(Array.isArray(categoryList) ? categoryList : []);
    }).catch(() => {
      if (!active) return;
      setBranches([]);
      setCategories([]);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!editing) return;
    let active = true;
    setLoading(true);
    setError('');
    inventoryApi.product(productId).then((response) => {
      if (!active) return;
      const product = unwrap(response, 'product');
      if (!product?.id) throw new Error('Product record was not returned by Central.');
      setForm(toForm(product));
    }).catch((requestError) => {
      if (!active) return;
      setError(requestError?.response?.data?.error?.message || requestError?.response?.data?.message || requestError?.message || 'Unable to load the product.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [editing, productId]);

  const branchNames = useMemo(() => branches.map((branch) => ({
    id: branch.branch_id || branch.id,
    name: branch.branch_name || branch.name || branch.branch_id || branch.id,
  })).filter((branch) => branch.id), [branches]);

  const change = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
  };

  const save = async (event) => {
    event.preventDefault();
    setError('');
    const name = form.name.trim();
    const sellingPrice = Number(form.selling_price);
    const mrp = optionalNumber(form.mrp);
    const purchasePrice = optionalNumber(form.purchase_price);
    const gst = Number(form.gst_percentage || 0);
    if (!name) return setError('Product name is required.');
    if (!Number.isFinite(sellingPrice) || sellingPrice < 0) return setError('Selling price must be zero or greater.');
    if (mrp != null && (!Number.isFinite(mrp) || mrp < 0)) return setError('MRP must be zero or greater.');
    if (mrp != null && mrp < sellingPrice) return setError('MRP cannot be lower than the selling price.');
    if (purchasePrice != null && (!Number.isFinite(purchasePrice) || purchasePrice < 0)) return setError('Purchase cost must be zero or greater.');
    if (!Number.isFinite(gst) || gst < 0 || gst > 100) return setError('GST percentage must be between 0 and 100.');

    const payload = {
      name,
      category: form.category.trim() || null,
      company: form.company.trim() || null,
      barcode: form.barcode.trim() || null,
      hsn_code: form.hsn_code.trim() || null,
      selling_price: sellingPrice,
      mrp,
      purchase_price: purchasePrice,
      gst_percentage: gst,
      branch_id: form.branch_id || null,
      is_weight_based: Boolean(form.is_weight_based),
      is_batch_enabled: Boolean(form.is_batch_enabled),
    };

    setSaving(true);
    try {
      if (editing) await inventoryApi.updateProduct(productId, payload);
      else await inventoryApi.createProduct(payload);
      navigate('/inventory/catalog');
    } catch (requestError) {
      setError(requestError?.response?.data?.error?.message || requestError?.response?.data?.message || 'Unable to save the product.');
    } finally {
      setSaving(false);
    }
  };

  return <div className="page-stack dashboard-page">
    <section className="hero-panel">
      <div><span className="eyebrow">Inventory · Product master</span><h1>{editing ? 'Edit Product' : 'Add Product'}</h1><p>Maintain product identity, pricing, tax and tracking rules in Central. Stock quantities are intentionally managed through purchases and audited stock operations, not through this master-data editor.</p></div>
      <div className="hero-actions"><Link className="secondary-btn" to="/inventory/catalog"><i className="bi bi-arrow-left" /> Product catalog</Link></div>
    </section>

    {error && <section className="panel state-card bad" role="alert"><strong>Product could not be saved</strong><span>{error}</span></section>}
    {loading ? <section className="panel state-card"><strong>Loading product…</strong><span>Reading the canonical Central product master.</span></section> : <form className="page-stack" onSubmit={save}>
      <section className="panel">
        <div className="panel-title"><i className="bi bi-upc-scan" /><div><h2>Product identity</h2><p>Core searchable master data used across RetailHub and POS synchronization.</p></div></div>
        <div className="form-grid three-col">
          <label><span>Product name *</span><input value={form.name} onChange={change('name')} required /></label>
          <label><span>Category</span><input list="product-categories" value={form.category} onChange={change('category')} placeholder="e.g. Dairy" /><datalist id="product-categories">{categories.map((category) => <option key={category.name} value={category.name} />)}</datalist></label>
          <label><span>Brand / company</span><input value={form.company} onChange={change('company')} placeholder="e.g. Amul" /></label>
          <label><span>Barcode</span><input value={form.barcode} onChange={change('barcode')} placeholder="EAN / UPC / internal barcode" /></label>
          <label><span>HSN code</span><input value={form.hsn_code} onChange={change('hsn_code')} placeholder="GST HSN code" /></label>
          <label><span>Store / branch scope</span><select value={form.branch_id} onChange={change('branch_id')}><option value="">Shared catalog</option>{branchNames.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title"><i className="bi bi-currency-rupee" /><div><h2>Pricing & tax</h2><p>Commercial master values. Purchase receiving remains the auditable inventory event.</p></div></div>
        <div className="form-grid three-col">
          <label><span>Selling price *</span><input type="number" min="0" step="0.01" value={form.selling_price} onChange={change('selling_price')} required /></label>
          <label><span>MRP</span><input type="number" min="0" step="0.01" value={form.mrp} onChange={change('mrp')} /></label>
          <label><span>Reference purchase cost</span><input type="number" min="0" step="0.01" value={form.purchase_price} onChange={change('purchase_price')} /></label>
          <label><span>GST %</span><input type="number" min="0" max="100" step="0.01" value={form.gst_percentage} onChange={change('gst_percentage')} /></label>
        </div>
      </section>

      <section className="panel">
        <div className="panel-title"><i className="bi bi-box-seam" /><div><h2>Inventory tracking</h2><p>Choose how the product is measured and whether stock must be tracked by batch.</p></div></div>
        <div className="form-grid three-col">
          <label><span><input type="checkbox" checked={form.is_weight_based} onChange={change('is_weight_based')} /> Weight-based product</span><small>Use for kg/gram or other fractional-quantity selling.</small></label>
          <label><span><input type="checkbox" checked={form.is_batch_enabled} onChange={change('is_batch_enabled')} /> Batch tracking</span><small>Batch quantities and expiry dates are created by purchase receiving.</small></label>
        </div>
        <div className="dashboard-scope-note"><i className="bi bi-shield-check" /><div><strong>Stock audit boundary</strong><span>This form does not directly edit `stock_quantity`. Opening/received stock belongs to Purchase Entry; corrections belong to the audited Stock Adjustment workflow. Batch expiry is recorded per received batch rather than as a product-master shortcut.</span></div></div>
      </section>

      <section className="panel"><div className="hero-actions"><button className="primary-btn" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save product changes' : 'Create product'}</button><Link className="secondary-btn" to="/inventory/catalog">Cancel</Link></div></section>
    </form>}
  </div>;
}

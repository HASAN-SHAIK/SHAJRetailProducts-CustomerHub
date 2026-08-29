import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, unwrap } from '../lib/api';
import { inventoryApi } from '../lib/inventoryApi';
import '../styles/dashboard.css';

const currency = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(numeric);
};

const number = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 }).format(numeric);
};

const dateTime = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
};

const marginPercent = (product) => {
  const selling = Number(product?.selling_price);
  const purchase = Number(product?.purchase_price);
  if (!Number.isFinite(selling) || selling <= 0 || !Number.isFinite(purchase)) return null;
  return ((selling - purchase) / selling) * 100;
};

const inventoryTone = (inventory) => {
  if (!inventory) return 'future';
  if (inventory.is_out_of_stock) return 'future';
  if (inventory.is_low_stock) return 'partial';
  return 'live';
};

export default function ProductCatalogPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [filters, setFilters] = useState({ branchId: '', search: '', category: '', sortBy: 'created_at', sortOrder: 'desc' });
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, limit: 25, total: 0, total_pages: 0 });
  const [categoryTotal, setCategoryTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [referenceLoading, setReferenceLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setReferenceLoading(true);
    Promise.all([api.branches(), inventoryApi.categories()]).then(([branchesResponse, categoriesResponse]) => {
      if (!active) return;
      const branchBody = unwrap(branchesResponse);
      const branchList = Array.isArray(branchBody) ? branchBody : (branchBody?.branches || []);
      const categoryList = unwrap(categoriesResponse, 'categories');
      setBranches(branchList);
      setCategories(Array.isArray(categoryList) ? categoryList : []);
      setCategoryTotal(Number(categoriesResponse?.data?.meta?.total || (Array.isArray(categoryList) ? categoryList.length : 0)));
      if (branchList.length === 1) {
        setFilters((current) => ({ ...current, branchId: current.branchId || branchList[0].branch_id || branchList[0].id || '' }));
      }
    }).catch(() => {
      if (!active) return;
      setBranches([]);
      setCategories([]);
      setCategoryTotal(0);
    }).finally(() => {
      if (active) setReferenceLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      inventoryApi.products({
        branchId: filters.branchId,
        search: filters.search,
        category: filters.category,
        page,
        limit: 25,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      }).then((response) => {
        if (!active) return;
        const list = unwrap(response, 'products');
        setProducts(Array.isArray(list) ? list : []);
        setMeta({
          page: Number(response?.data?.meta?.page || page),
          limit: Number(response?.data?.meta?.limit || 25),
          total: Number(response?.data?.meta?.total || 0),
          total_pages: Number(response?.data?.meta?.total_pages || 0),
        });
      }).catch((requestError) => {
        if (!active) return;
        setProducts([]);
        setMeta({ page, limit: 25, total: 0, total_pages: 0 });
        setError(requestError?.response?.data?.error?.message || requestError?.response?.data?.message || 'Unable to load the Central product catalog.');
      }).finally(() => {
        if (active) setLoading(false);
      });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [filters.branchId, filters.search, filters.category, filters.sortBy, filters.sortOrder, page, refreshKey]);

  const branchNames = useMemo(() => new Map(branches.map((branch) => [String(branch.branch_id || branch.id), branch.branch_name || branch.name || 'Branch'])), [branches]);
  const currentPageCost = useMemo(() => {
    if (!filters.branchId) return null;
    return products.reduce((total, product) => {
      const quantity = Number(product.inventory?.sellable_quantity);
      const cost = Number(product.purchase_price);
      return total + (Number.isFinite(quantity) && Number.isFinite(cost) ? Math.max(quantity, 0) * Math.max(cost, 0) : 0);
    }, 0);
  }, [products, filters.branchId]);

  const changeFilter = (key, value) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const selectedBranchName = filters.branchId ? (branchNames.get(String(filters.branchId)) || 'Selected branch') : 'All permitted catalog scope';

  return <div className="page-stack dashboard-page">
    <section className="hero-panel">
      <div><span className="eyebrow">Inventory · Central product master</span><h1>Product Catalog</h1><p>Search the canonical product master, inspect branch inventory truth, and maintain product identity, pricing, tax and tracking rules.</p></div>
      <div className="hero-actions"><button className="secondary-btn" onClick={() => setRefreshKey((value) => value + 1)} disabled={loading}><i className="bi bi-arrow-clockwise" /> Refresh</button><Link className="primary-btn" to="/inventory/products/new"><i className="bi bi-plus-lg" /> Add product</Link></div>
    </section>

    <div className="metric-grid">
      <div className="metric-card tone-info"><i className="bi bi-box-seam" /><div><span>Catalog products</span><strong>{meta.total}</strong></div></div>
      <div className="metric-card tone-info"><i className="bi bi-tags" /><div><span>Categories</span><strong>{categoryTotal}</strong></div></div>
      <div className="metric-card tone-info"><i className="bi bi-shop" /><div><span>Scope</span><strong>{selectedBranchName}</strong></div></div>
      <div className="metric-card tone-info"><i className="bi bi-currency-rupee" /><div><span>Visible canonical cost value</span><strong>{currentPageCost == null ? 'Select branch' : currency(currentPageCost)}</strong></div></div>
    </div>

    <section className="panel">
      <div className="panel-title"><i className="bi bi-funnel" /><div><h2>Catalog filters</h2><p>Filtering and pagination are performed by the Central `/v1/products` contract.</p></div></div>
      <div className="form-grid three-col">
        <label><span>Search</span><input value={filters.search} onChange={(event) => changeFilter('search', event.target.value)} placeholder="Product, brand/company or barcode" /></label>
        <label><span>Category</span><select value={filters.category} onChange={(event) => changeFilter('category', event.target.value)} disabled={referenceLoading}><option value="">All categories</option>{categories.map((category) => <option key={category.name} value={category.name}>{category.name} ({category.product_count})</option>)}</select></label>
        <label><span>Store / branch</span><select value={filters.branchId} onChange={(event) => changeFilter('branchId', event.target.value)} disabled={referenceLoading}><option value="">All permitted scope</option>{branches.map((branch) => { const id = branch.branch_id || branch.id; return <option key={id} value={id}>{branch.branch_name || branch.name || id}</option>; })}</select></label>
        <label><span>Sort by</span><select value={filters.sortBy} onChange={(event) => changeFilter('sortBy', event.target.value)}><option value="created_at">Recently created</option><option value="name">Product name</option><option value="selling_price">Selling price</option><option value="stock_quantity">Recorded master stock</option></select></label>
        <label><span>Order</span><select value={filters.sortOrder} onChange={(event) => changeFilter('sortOrder', event.target.value)}><option value="desc">Descending</option><option value="asc">Ascending</option></select></label>
      </div>
    </section>

    <section className="panel">
      <div className="panel-title"><i className="bi bi-boxes" /><div><h2>Products</h2><p>{meta.total ? `${meta.total} products matched · page ${meta.page} of ${Math.max(meta.total_pages, 1)}` : 'Canonical product master'}</p></div></div>
      {error && <div className="state-card bad"><strong>Product catalog unavailable</strong><span>{error}</span><button className="secondary-btn" onClick={() => setRefreshKey((value) => value + 1)}>Retry</button></div>}
      {loading ? <div className="state-card"><strong>Loading products…</strong><span>Reading the Central catalog.</span></div> : !error && products.length === 0 ? <div className="state-card"><strong>No products found</strong><span>Change the filters or create the first product.</span><Link className="primary-btn" to="/inventory/products/new">Add product</Link></div> : !error && <div className="table-wrap"><table><thead><tr><th>Product</th><th>Category</th><th>Pricing</th><th>Tax</th><th>Inventory</th><th>Scope</th><th>Updated</th><th>Actions</th></tr></thead><tbody>{products.map((product) => {
        const margin = marginPercent(product);
        const branchLabel = product.branch_id ? (branchNames.get(String(product.branch_id)) || product.branch_id) : 'Shared catalog';
        const inventory = product.inventory;
        return <tr key={product.id}>
          <td><strong>{product.name || 'Unnamed product'}</strong><br/><small>{product.company || 'No brand/company'}{product.barcode ? ` · ${product.barcode}` : ' · No barcode'}</small></td>
          <td>{product.category || 'Uncategorized'}</td>
          <td><strong>{currency(product.selling_price)}</strong><br/><small>MRP {currency(product.mrp)} · Cost {currency(product.purchase_price)}{margin == null ? '' : ` · Margin ${number(margin)}%`}</small></td>
          <td>{product.gst_percentage == null ? '—' : `${number(product.gst_percentage)}% GST`}<br/><small>HSN {product.hsn_code || '—'}</small></td>
          <td>{!filters.branchId ? <><span className="status-pill future">Select branch</span><br/><small>Canonical stock is branch scoped{!product.is_batch_enabled ? ` · recorded master qty ${number(product.stock_quantity)}` : ''}</small></> : !inventory ? <><span className="status-pill future">No canonical branch stock</span><br/><small>This product has no inventory projection for the selected branch</small></> : <><span className={`status-pill ${inventoryTone(inventory)}`}>{number(inventory.projected_net_quantity)} projected</span><br/><small>Sellable {number(inventory.sellable_quantity)} · Physical {number(inventory.physical_quantity)}</small>{Number(inventory.expired_quantity) > 0 && <><br/><small>Expired {number(inventory.expired_quantity)}</small></>}{Number(inventory.provisional_deficit) > 0 && <><br/><small>Offline deficit {number(inventory.provisional_deficit)}</small></>}{product.is_batch_enabled && <><br/><small>Batch tracked</small></>}{product.is_weight_based && <><br/><small>Weight based</small></>}</>}</td>
          <td>{branchLabel}</td>
          <td>{dateTime(product.updated_at)}</td>
          <td><Link className="secondary-btn" to={`/inventory/products/${encodeURIComponent(String(product.id))}/edit`}><i className="bi bi-pencil" /> Edit</Link></td>
        </tr>;
      })}</tbody></table></div>}
      {!loading && !error && meta.total_pages > 1 && <div className="row-actions"><button className="secondary-btn" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><i className="bi bi-chevron-left" /> Previous</button><span>Page {meta.page} of {meta.total_pages}</span><button className="secondary-btn" disabled={page >= meta.total_pages} onClick={() => setPage((value) => Math.min(meta.total_pages, value + 1))}>Next <i className="bi bi-chevron-right" /></button></div>}
    </section>

    <section className="panel dashboard-scope-note"><i className="bi bi-shield-check" /><div><strong>Inventory truth boundary</strong><span>When a branch is selected, `product.inventory` is the Central expiry-aware projection: physical, sellable, expired, provisional deficit and projected net stock. Product master editing does not directly mutate stock; purchases and audited stock operations own quantity changes.</span></div></section>
  </div>;
}

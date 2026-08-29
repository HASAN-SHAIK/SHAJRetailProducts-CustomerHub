import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { api, unwrap } from '../lib/api';
import { PageHeader } from './BusinessPage';

const money = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(Number(value || 0));

const dateText = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value).slice(0, 10) : date.toLocaleDateString('en-IN');
};

const fieldValue = (row, keys, fallback = '') => {
  for (const key of keys) {
    if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== '') return row[key];
  }
  return fallback;
};

const productsFrom = (response) => {
  const body = unwrap(response);
  return body?.products || body?.data?.products || [];
};

const suppliersFrom = (response) => {
  const body = unwrap(response);
  if (Array.isArray(body)) return body;
  if (Array.isArray(body?.suppliers)) return body.suppliers;
  if (Array.isArray(body?.data?.suppliers)) return body.data.suppliers;
  if (Array.isArray(body?.data)) return body.data;
  return [];
};

const purchasesFrom = (response) => {
  const body = unwrap(response);
  return body?.purchases || body?.data?.purchases || [];
};

const returnsFrom = (response) => {
  const body = unwrap(response);
  return body?.returns || body?.data?.returns || [];
};

const productId = (product) => product?.id || product?.product_id;
const productName = (product) => product?.name || product?.product_name || '-';
const sampleBarcodeProducts = [
  { barcode: '8909001000011', name: 'SHAJ Premium Rice 5kg', company: 'SHAJ Foods', category: 'Grocery', quantity: 25, purchase_price: 410, mrp: 499, hsn_code: '1006', gst_percent: 5, batch_number: 'RICE-A1', expiry_date: '2027-08-31', selling_price: 475 },
  { barcode: '8909001000028', name: 'SHAJ Sunflower Oil 1L', company: 'SHAJ Foods', category: 'Grocery', quantity: 40, purchase_price: 118, mrp: 155, hsn_code: '1512', gst_percent: 5, batch_number: 'OIL-B2', expiry_date: '2027-02-28', selling_price: 145 },
  { barcode: '8909001000035', name: 'SHAJ Masala Tea 250g', company: 'SHAJ Beverages', category: 'Beverages', quantity: 36, purchase_price: 82, mrp: 120, hsn_code: '0902', gst_percent: 5, batch_number: 'TEA-C3', expiry_date: '2027-05-31', selling_price: 110 },
  { barcode: '8909001000042', name: 'SHAJ Detergent Powder 1kg', company: 'SHAJ Home Care', category: 'Household', quantity: 30, purchase_price: 68, mrp: 99, hsn_code: '3402', gst_percent: 18, batch_number: 'DET-D4', expiry_date: '2028-01-31', selling_price: 92 },
  { barcode: '8909001000059', name: 'SHAJ Coconut Hair Oil 200ml', company: 'SHAJ Personal Care', category: 'Personal Care', quantity: 24, purchase_price: 74, mrp: 115, hsn_code: '3305', gst_percent: 18, batch_number: 'HAIR-E5', expiry_date: '2028-03-31', selling_price: 105 },
  { barcode: '8909001000066', name: 'SHAJ Milk Biscuits 120g', company: 'SHAJ Snacks', category: 'Snacks', quantity: 80, purchase_price: 18, mrp: 30, hsn_code: '1905', gst_percent: 18, batch_number: 'BIS-F6', expiry_date: '2027-01-31', selling_price: 28 },
];

const sampleBarcodeMap = Object.fromEntries(sampleBarcodeProducts.map((item) => [item.barcode, item]));
const emptyPurchaseLine = () => ({
  product_id: '',
  barcode: '',
  name: '',
  company: '',
  category: '',
  quantity: '1',
  purchase_price: '',
  selling_price: '',
  mrp: '',
  gst_percent: '',
  hsn_code: '',
  batch_number: '',
  expiry_date: '',
});

function BranchFilter({ branches, value, onChange }) {
  return (
    <label className="field">
      <span>Branch</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">All allowed branches</option>
        {branches.map((branch) => {
          const id = branch.id || branch.branch_id;
          return <option key={id} value={id}>{branch.name || branch.branch_name || branch.store_name || id}</option>;
        })}
      </select>
    </label>
  );
}

function StatePanel({ loading, error, empty, emptyText, onRetry }) {
  if (loading) return <section className="panel dashboard-state" role="status"><i className="bi bi-hourglass-split" /><strong>Loading...</strong><span>Reading Central inventory data.</span></section>;
  if (error) return <section className="panel dashboard-state dashboard-error" role="alert"><i className="bi bi-exclamation-triangle" /><strong>Inventory unavailable</strong><span>{error}</span><button className="secondary-btn" onClick={onRetry}>Retry</button></section>;
  if (empty) return <section className="panel dashboard-state"><i className="bi bi-box" /><strong>No records found</strong><span>{emptyText}</span></section>;
  return null;
}

export function ProductCatalogPage() {
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [productRes, branchRes] = await Promise.all([
        api.products({ search, branchId, limit: 200 }),
        api.branches(),
      ]);
      setProducts(productsFrom(productRes));
      const branchBody = unwrap(branchRes);
      setBranches(Array.isArray(branchBody) ? branchBody : branchBody?.branches || []);
    } catch (err) {
      setError(err?.response?.data?.message || err?.response?.data?.error || 'Unable to load products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [branchId]);

  const summary = useMemo(() => ({
    count: products.length,
    low: products.filter((row) => Number(fieldValue(row, ['stock_quantity', 'stock', 'quantity'], 0)) <= 5).length,
    value: products.reduce((sum, row) => sum + (Number(fieldValue(row, ['stock_quantity', 'stock', 'quantity'], 0)) * Number(fieldValue(row, ['purchase_price'], 0))), 0),
  }), [products]);

  return <div className="page-stack">
    <PageHeader title="Product Catalog" subtitle="Central product, barcode, price and branch-stock view." action={<Link className="primary-btn" to="/inventory/products/new"><i className="bi bi-plus-lg" /> Add Product</Link>} />
    <section className="panel dashboard-filters">
      <BranchFilter branches={branches} value={branchId} onChange={setBranchId} />
      <label className="field"><span>Search</span><input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && load()} placeholder="Name, company, barcode" /></label>
      <button className="secondary-btn" type="button" onClick={load}><i className="bi bi-search" /> Search</button>
    </section>
    <div className="summary-cards">
      <div className="summary-card"><span>Products</span><strong>{summary.count}</strong></div>
      <div className="summary-card"><span>Low stock</span><strong>{summary.low}</strong></div>
      <div className="summary-card"><span>Inventory cost</span><strong>{money(summary.value)}</strong></div>
    </div>
    <StatePanel loading={loading} error={error} empty={!products.length} emptyText="No products match this scope." onRetry={load} />
    {!loading && !error && products.length > 0 && <section className="panel">
      <div className="table-wrap"><table><thead><tr><th>Product</th><th>Company</th><th>Category</th><th>Barcode</th><th>Stock</th><th>Purchase</th><th>Selling</th><th>GST</th></tr></thead><tbody>
        {products.map((row) => <tr key={productId(row)}>
          <td><strong>{productName(row)}</strong></td>
          <td>{row.company || '-'}</td>
          <td>{row.category || '-'}</td>
          <td>{row.barcode || '-'}</td>
          <td>{fieldValue(row, ['stock_quantity', 'branch_stock_quantity', 'quantity'], 0)}</td>
          <td>{money(row.purchase_price)}</td>
          <td>{money(row.selling_price)}</td>
          <td>{fieldValue(row, ['gst_percentage', 'gst_percent'], 0)}%</td>
        </tr>)}
      </tbody></table></div>
    </section>}
  </div>;
}

export function ProductFormPage() {
  const [branches, setBranches] = useState([]);
  const [form, setForm] = useState({ name: '', company: '', category: '', barcode: '', stock_quantity: '0', purchase_price: '', selling_price: '', gst_percentage: '0', branch_id: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.branches().then((response) => {
      const body = unwrap(response);
      setBranches(Array.isArray(body) ? body : body?.branches || []);
    }).catch(() => {});
  }, []);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await api.createProduct({
        product_name: form.name,
        name: form.name,
        company: form.company || undefined,
        category: form.category || undefined,
        barcode: form.barcode || undefined,
        stock_quantity: Number(form.stock_quantity || 0),
        purchase_price: Number(form.purchase_price || 0),
        selling_price: Number(form.selling_price || 0),
        gst_percentage: Number(form.gst_percentage || 0),
        branch_id: form.branch_id || undefined,
      });
      setMessage('Product saved in Central catalog.');
      setForm({ name: '', company: '', category: '', barcode: '', stock_quantity: '0', purchase_price: '', selling_price: '', gst_percentage: '0', branch_id: form.branch_id });
    } catch (err) {
      setMessage(err?.response?.data?.message || err?.response?.data?.error || 'Unable to save product.');
    } finally {
      setSaving(false);
    }
  };

  return <div className="page-stack">
    <PageHeader title="Add Product" subtitle="Create a Central catalog product for CustomerHub and POS sync." action={<Link className="secondary-btn" to="/inventory/catalog">Back to catalog</Link>} />
    <form className="panel form-panel" onSubmit={submit}>
      <div className="form-grid">
        <label className="field"><span>Name</span><input required value={form.name} onChange={(event) => set('name', event.target.value)} /></label>
        <label className="field"><span>Company</span><input value={form.company} onChange={(event) => set('company', event.target.value)} /></label>
        <label className="field"><span>Category</span><input value={form.category} onChange={(event) => set('category', event.target.value)} /></label>
        <label className="field"><span>Barcode</span><input value={form.barcode} onChange={(event) => set('barcode', event.target.value)} /></label>
        <label className="field"><span>Opening stock</span><input type="number" min="0" step="0.001" value={form.stock_quantity} onChange={(event) => set('stock_quantity', event.target.value)} /></label>
        <label className="field"><span>Purchase price</span><input required type="number" min="0" step="0.01" value={form.purchase_price} onChange={(event) => set('purchase_price', event.target.value)} /></label>
        <label className="field"><span>Selling price</span><input required type="number" min="0" step="0.01" value={form.selling_price} onChange={(event) => set('selling_price', event.target.value)} /></label>
        <label className="field"><span>GST %</span><input type="number" min="0" step="0.01" value={form.gst_percentage} onChange={(event) => set('gst_percentage', event.target.value)} /></label>
        <BranchFilter branches={branches} value={form.branch_id} onChange={(value) => set('branch_id', value)} />
      </div>
      {message && <div className="inline-message">{message}</div>}
      <div className="form-actions"><span>Products are stored in Central PostgreSQL.</span><button className="primary-btn" disabled={saving}>{saving ? 'Saving...' : 'Save product'}</button></div>
    </form>
  </div>;
}

export function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', mobile: '', email: '', gst_number: '', credit_limit: '', current_balance: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [supplierRes, branchRes] = await Promise.all([api.suppliers({ search, branchId }), api.branches()]);
      setSuppliers(suppliersFrom(supplierRes));
      const branchBody = unwrap(branchRes);
      setBranches(Array.isArray(branchBody) ? branchBody : branchBody?.branches || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load suppliers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [branchId]);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      await api.createSupplier({ ...form, branch_id: branchId || undefined, credit_limit: Number(form.credit_limit || 0), current_balance: Number(form.current_balance || 0) });
      setForm({ name: '', mobile: '', email: '', gst_number: '', credit_limit: '', current_balance: '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err?.response?.data?.message || err?.response?.data?.error || 'Unable to save supplier.');
    }
  };

  return <div className="page-stack">
    <PageHeader title="Suppliers" subtitle="Supplier master data used by purchase entry and payables." action={<button className="primary-btn" onClick={() => setShowForm((value) => !value)}><i className="bi bi-plus-lg" /> Add Supplier</button>} />
    <section className="panel dashboard-filters"><BranchFilter branches={branches} value={branchId} onChange={setBranchId} /><label className="field"><span>Search</span><input value={search} onChange={(event) => setSearch(event.target.value)} /></label><button className="secondary-btn" onClick={load}>Search</button></section>
    {showForm && <form className="panel form-panel" onSubmit={submit}><div className="form-grid">
      <label className="field"><span>Name</span><input required value={form.name} onChange={(event) => set('name', event.target.value)} /></label>
      <label className="field"><span>Mobile</span><input value={form.mobile} onChange={(event) => set('mobile', event.target.value)} /></label>
      <label className="field"><span>Email</span><input type="email" value={form.email} onChange={(event) => set('email', event.target.value)} /></label>
      <label className="field"><span>GSTIN</span><input value={form.gst_number} onChange={(event) => set('gst_number', event.target.value)} /></label>
      <label className="field"><span>Credit limit</span><input type="number" value={form.credit_limit} onChange={(event) => set('credit_limit', event.target.value)} /></label>
      <label className="field"><span>Opening balance</span><input type="number" value={form.current_balance} onChange={(event) => set('current_balance', event.target.value)} /></label>
    </div><div className="form-actions"><span>Supplier will be available for purchases.</span><button className="primary-btn">Save supplier</button></div></form>}
    <StatePanel loading={loading} error={error} empty={!suppliers.length} emptyText="No suppliers match this scope." onRetry={load} />
    {!loading && !error && suppliers.length > 0 && <section className="panel"><div className="table-wrap"><table><thead><tr><th>Supplier</th><th>Mobile</th><th>GSTIN</th><th>Credit limit</th><th>Balance</th><th>Status</th></tr></thead><tbody>
      {suppliers.map((row) => <tr key={row.id}><td><strong>{row.name}</strong><small>{row.email || '-'}</small></td><td>{row.mobile || '-'}</td><td>{row.gst_number || '-'}</td><td>{money(row.credit_limit)}</td><td>{money(row.current_balance)}</td><td>{row.is_active === false ? 'Inactive' : 'Active'}</td></tr>)}
    </tbody></table></div></section>}
  </div>;
}

export function PurchaseEntryPage() {
  const [branches, setBranches] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [branchId, setBranchId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierPickerOpen, setSupplierPickerOpen] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [paymentMode, setPaymentMode] = useState('credit');
  const [line, setLine] = useState(emptyPurchaseLine);
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [scannerBarcode, setScannerBarcode] = useState('');

  const loadLookups = async () => {
    const [branchRes, supplierRes, productRes] = await Promise.all([api.branches(), api.suppliers({ branchId }), api.products({ branchId, limit: 500 })]);
    const branchBody = unwrap(branchRes);
    setBranches(Array.isArray(branchBody) ? branchBody : branchBody?.branches || []);
    setSuppliers(suppliersFrom(supplierRes));
    setProducts(productsFrom(productRes));
  };
  useEffect(() => { loadLookups().catch(() => setMessage('Unable to load purchase lookups.')); }, [branchId]);
  const selectedSupplier = suppliers.find((supplier) => String(supplier.id) === String(supplierId)) || null;
  const supplierOptions = suppliers.filter((supplier) => {
    const haystack = [
      supplier.name,
      supplier.mobile,
      supplier.gst_number,
      supplier.email,
    ].join(' ').toLowerCase();
    return haystack.includes(supplierSearch.trim().toLowerCase());
  });
  const chooseSupplier = (supplier) => {
    setSupplierId(String(supplier.id));
    setSupplierSearch(supplier.name || '');
    setSupplierPickerOpen(false);
  };

  const normalizeHeader = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const headerMap = {
    barcode: 'barcode',
    name: 'name',
    productname: 'name',
    product: 'name',
    company: 'company',
    companyname: 'company',
    brand: 'company',
    brandname: 'company',
    manufacturer: 'company',
    manufacturername: 'company',
    category: 'category',
    categoryname: 'category',
    productcategory: 'category',
    group: 'category',
    department: 'category',
    dept: 'category',
    qty: 'quantity',
    quantity: 'quantity',
    stock: 'quantity',
    purchaseprice: 'purchase_price',
    costprice: 'purchase_price',
    rate: 'purchase_price',
    sellingprice: 'selling_price',
    saleprice: 'selling_price',
    mrp: 'mrp',
    gst: 'gst_percent',
    gstpercent: 'gst_percent',
    gstpercentage: 'gst_percent',
    hsn: 'hsn_code',
    hsncode: 'hsn_code',
    batch: 'batch_number',
    batchno: 'batch_number',
    batchnumber: 'batch_number',
    expiry: 'expiry_date',
    expirydate: 'expiry_date',
    expdate: 'expiry_date',
  };
  const toNumber = (value, fallback = '') => {
    const parsed = Number(String(value ?? '').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const toDateValue = (value) => {
    if (!value) return '';
    if (typeof value === 'number' && XLSX.SSF?.parse_date_code) {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (parsed?.y && parsed?.m && parsed?.d) {
        return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
      }
    }
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value).trim() : date.toISOString().slice(0, 10);
  };
  const toPurchaseItem = (source = {}) => {
    const product = source.product_id
      ? products.find((row) => String(productId(row)) === String(source.product_id))
      : null;
    return {
      product_id: source.product_id || '',
      barcode: source.barcode || product?.barcode || '',
      name: source.name || (product ? productName(product) : ''),
      company: source.company || product?.company || '',
      category: source.category || product?.category || '',
      quantity: Number(toNumber(source.quantity, 1) || 1),
      purchase_price: Number(toNumber(source.purchase_price, product?.purchase_price || 0) || 0),
      selling_price: Number(toNumber(source.selling_price, product?.selling_price || source.purchase_price || 0) || 0),
      mrp: toNumber(source.mrp, ''),
      gst_percent: toNumber(source.gst_percent, ''),
      hsn_code: source.hsn_code || '',
      batch_number: source.batch_number || '',
      expiry_date: toDateValue(source.expiry_date),
    };
  };
  const toLineDraft = (item = {}) => ({
    product_id: item.product_id || '',
    barcode: item.barcode || '',
    name: item.name || '',
    company: item.company || '',
    category: item.category || '',
    quantity: String(item.quantity ?? '1'),
    purchase_price: item.purchase_price === 0 ? '0' : String(item.purchase_price || ''),
    selling_price: item.selling_price === 0 ? '0' : String(item.selling_price || ''),
    mrp: item.mrp === 0 ? '0' : String(item.mrp || ''),
    gst_percent: item.gst_percent === 0 ? '0' : String(item.gst_percent || ''),
    hsn_code: item.hsn_code || '',
    batch_number: item.batch_number || '',
    expiry_date: item.expiry_date || '',
  });
  const appendPurchaseItems = (nextItems) => {
    const normalized = nextItems.map(toPurchaseItem).filter((item) => item.barcode || item.name || item.product_id);
    if (!normalized.length) return [];
    setItems((current) => [...current, ...normalized]);
    setLine(toLineDraft(normalized[0]));
    return normalized;
  };
  const parseExcelPurchaseRows = async (file) => {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) return [];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    return rows.map((row) => {
      const mapped = {};
      Object.entries(row).forEach(([key, value]) => {
        const normalized = headerMap[normalizeHeader(key)];
        if (normalized) mapped[normalized] = value;
      });
      return mapped;
    });
  };
  const importExcel = async () => {
    if (!importFile) {
      setMessage('Select an Excel file first.');
      return;
    }
    const name = importFile.name.toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv')) {
      setMessage('Upload .xlsx, .xls, or .csv only.');
      return;
    }
    setImporting(true);
    setMessage('Reading purchase items from file...');
    try {
      const parsed = await parseExcelPurchaseRows(importFile);
      const loaded = appendPurchaseItems(parsed);
      if (!parsed.length) {
        setMessage('No rows found in the uploaded file.');
        return;
      }
      if (!loaded.length) {
        setMessage('No purchase items were loaded. Check that the file has Product/Name or Barcode columns.');
        return;
      }
      setMessage(`${loaded.length} of ${parsed.length} purchase line(s) loaded from Excel. First item is shown in the fields below.`);
    } catch (error) {
      setMessage(error?.message ? `Unable to read Excel file: ${error.message}` : 'Unable to read Excel file.');
    } finally {
      setImporting(false);
    }
  };
  const scanBarcode = () => {
    const barcode = scannerBarcode.trim();
    if (!barcode) return;
    const catalogProduct = products.find((row) => String(row.barcode || '') === barcode);
    appendPurchaseItems([sampleBarcodeMap[barcode] || {
      product_id: catalogProduct ? productId(catalogProduct) : '',
      barcode,
      name: catalogProduct ? productName(catalogProduct) : '',
      company: catalogProduct?.company || '',
      category: catalogProduct?.category || '',
      quantity: 1,
      purchase_price: catalogProduct?.purchase_price || '',
      selling_price: catalogProduct?.selling_price || '',
      gst_percent: catalogProduct?.gst_percentage ?? catalogProduct?.gst_percent ?? '',
    }]);
    setScannerBarcode('');
    setMessage(sampleBarcodeMap[barcode] ? 'Sample barcode product added.' : 'Barcode added. Complete missing details before saving.');
  };
  const downloadSampleExcel = () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sampleBarcodeProducts), 'Purchase Items');
    XLSX.writeFile(workbook, 'purchase-entry-sample-barcodes.xlsx');
  };
  const updateItem = (index, field, value) => {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  };
  const removeItem = (index) => {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const addLine = () => {
    const product = products.find((row) => String(productId(row)) === String(line.product_id));
    const nextItem = toPurchaseItem(product ? {
      ...line,
      product_id: productId(product),
      name: productName(product),
      barcode: product.barcode || '',
      company: product.company || '',
      category: product.category || '',
      quantity: Number(line.quantity),
      purchase_price: Number(line.purchase_price || product.purchase_price || 0),
      selling_price: Number(line.selling_price || product.selling_price || 0),
      mrp: product.mrp || '',
      gst_percent: product.gst_percentage ?? product.gst_percent ?? '',
      hsn_code: product.hsn_code || '',
    } : line);
    if ((!nextItem.product_id && !nextItem.barcode && !nextItem.name) || Number(nextItem.quantity) <= 0) return;
    setItems((current) => [...current, nextItem]);
    setLine(emptyPurchaseLine());
  };
  const selectLineProduct = (value) => {
    if (value === '__imported__') return;
    if (!value) {
      setLine(emptyPurchaseLine());
      return;
    }
    const product = products.find((row) => String(productId(row)) === String(value));
    setLine(toLineDraft(toPurchaseItem({
      ...line,
      product_id: value,
      name: product ? productName(product) : line.name,
      barcode: product?.barcode || line.barcode,
      company: product?.company || line.company,
      category: product?.category || line.category,
      purchase_price: product?.purchase_price ?? line.purchase_price,
      selling_price: product?.selling_price ?? line.selling_price,
      mrp: product?.mrp ?? line.mrp,
      gst_percent: product?.gst_percentage ?? product?.gst_percent ?? line.gst_percent,
      hsn_code: product?.hsn_code || line.hsn_code,
    })));
  };
  const total = items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.purchase_price || 0), 0);
  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    if (!supplierId) {
      setMessage('Select a supplier before saving purchase.');
      return;
    }
    try {
      await api.createPurchase({ branch_id: branchId || undefined, supplier_id: Number(supplierId), invoice_number: invoiceNumber || undefined, payment_mode: paymentMode, items });
      setItems([]);
      setInvoiceNumber('');
      setMessage('Purchase saved and inventory updated.');
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Unable to save purchase.');
    }
  };

  return <div className="page-stack">
    <PageHeader title="Purchase Entry" subtitle="Receive stock into Central inventory and create supplier payable." action={<Link className="secondary-btn" to="/inventory/purchases">Purchase book</Link>} />
    <section className="panel form-panel">
      <div className="panel-title"><i className="bi bi-upload" /><div><h2>Bulk receive stock</h2><p>Upload purchase items from Excel or scan printed sample barcodes into this purchase.</p></div></div>
      <div className="form-grid">
        <label className="field"><span>Excel file</span><input type="file" accept=".xlsx,.xls,.csv" onChange={(event) => { setImportFile(event.target.files?.[0] || null); setMessage(''); }} /></label>
        <div className="form-actions"><span>{importFile?.name || 'XLSX, XLS or CSV'}</span><button type="button" className="secondary-btn" onClick={importExcel} disabled={importing}><i className={`bi ${importing ? 'bi-arrow-repeat' : 'bi-file-earmark-spreadsheet'}`} /> {importing ? 'Uploading...' : 'Upload items'}</button></div>
        <label className="field"><span>Barcode scanner</span><input value={scannerBarcode} onChange={(event) => setScannerBarcode(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); scanBarcode(); } }} placeholder="Focus here and scan" /></label>
        <div className="form-actions"><span>{sampleBarcodeProducts.length} sample barcodes</span><button type="button" className="secondary-btn" onClick={scanBarcode}><i className="bi bi-upc-scan" /> Add scan</button></div>
      </div>
      <div className="button-row">
        <button type="button" className="secondary-btn" onClick={() => { const loaded = appendPurchaseItems(sampleBarcodeProducts); setMessage(`${loaded.length} sample purchase item(s) loaded below.`); }}><i className="bi bi-list-check" /> Load sample items</button>
        <button type="button" className="secondary-btn" onClick={downloadSampleExcel}><i className="bi bi-download" /> Download sample Excel</button>
        <a className="secondary-btn" href="/sample-barcodes.pdf" target="_blank" rel="noreferrer"><i className="bi bi-filetype-pdf" /> Printable barcode PDF</a>
      </div>
      {importing && <div className="import-loading" role="status"><i className="bi bi-arrow-repeat" /><span>Loading products from the selected file...</span></div>}
      {!importing && items.length > 0 && <div className="import-loading loaded"><i className="bi bi-check2-circle" /><span>{items.length} purchase item(s) loaded below.</span></div>}
    </section>
    <form className="panel form-panel" onSubmit={submit}>
      <div className="form-grid">
        <BranchFilter branches={branches} value={branchId} onChange={setBranchId} />
        <div className="field supplier-picker-field">
          <span>Supplier</span>
          <div className="supplier-picker">
            <button type="button" className="supplier-picker-trigger" onClick={() => setSupplierPickerOpen((value) => !value)}>
              <span>
                <strong>{selectedSupplier?.name || 'Select supplier'}</strong>
                <small>
                  {selectedSupplier
                    ? `${selectedSupplier.mobile || 'No phone'} / GST ${selectedSupplier.gst_number || 'Not set'}`
                    : `${suppliers.length} supplier${suppliers.length === 1 ? '' : 's'} available`}
                </small>
              </span>
              <i className={`bi ${supplierPickerOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
            </button>
            {supplierPickerOpen && (
              <div className="supplier-picker-menu">
                <input
                  autoFocus
                  value={supplierSearch}
                  placeholder="Search supplier, phone or GST"
                  onChange={(event) => setSupplierSearch(event.target.value)}
                />
                <div className="supplier-picker-list">
                  {supplierOptions.map((supplier) => (
                    <button type="button" key={supplier.id} className="supplier-option" onClick={() => chooseSupplier(supplier)}>
                      <span>
                        <strong>{supplier.name}</strong>
                        <small>{supplier.mobile || 'No phone'} / GST {supplier.gst_number || 'Not set'}</small>
                      </span>
                      <span className="supplier-option-meta">
                        <b>{money(supplier.current_balance)}</b>
                        <small>{supplier.branch_id ? 'Store supplier' : 'All stores'}</small>
                      </span>
                    </button>
                  ))}
                  {!supplierOptions.length && <div className="supplier-empty">No suppliers found. Add one from Inventory &gt; Suppliers.</div>}
                </div>
              </div>
            )}
          </div>
        </div>
        <label className="field"><span>Invoice number</span><input value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value)} /></label>
        <label className="field"><span>Payment mode</span><select value={paymentMode} onChange={(event) => setPaymentMode(event.target.value)}><option value="credit">Credit</option><option value="cash">Cash</option><option value="online">Online</option><option value="bank">Bank</option></select></label>
      </div>
      {selectedSupplier && <div className="supplier-summary-strip"><span><b>Phone</b>{selectedSupplier.mobile || '-'}</span><span><b>GSTIN</b>{selectedSupplier.gst_number || '-'}</span><span><b>Credit limit</b>{money(selectedSupplier.credit_limit)}</span><span><b>Balance</b>{money(selectedSupplier.current_balance)}</span></div>}
      <div className="form-grid">
        <label className="field"><span>Product</span><select value={line.product_id || (line.name ? '__imported__' : '')} onChange={(event) => selectLineProduct(event.target.value)}><option value="">Select product</option>{line.name && !line.product_id && <option value="__imported__">{line.name}</option>}{products.map((product) => <option key={productId(product)} value={productId(product)}>{productName(product)}</option>)}</select></label>
        <label className="field"><span>Company</span><input value={line.company || ''} onChange={(event) => setLine({ ...line, company: event.target.value })} /></label>
        <label className="field"><span>Category</span><input value={line.category || ''} onChange={(event) => setLine({ ...line, category: event.target.value })} /></label>
        <label className="field"><span>Qty</span><input type="number" min="0.001" step="0.001" value={line.quantity} onChange={(event) => setLine({ ...line, quantity: event.target.value })} /></label>
        <label className="field"><span>Purchase price</span><input type="number" min="0" step="0.01" value={line.purchase_price} onChange={(event) => setLine({ ...line, purchase_price: event.target.value })} /></label>
        <label className="field"><span>Selling price</span><input type="number" min="0" step="0.01" value={line.selling_price} onChange={(event) => setLine({ ...line, selling_price: event.target.value })} /></label>
        <label className="field"><span>Batch number</span><input value={line.batch_number} onChange={(event) => setLine({ ...line, batch_number: event.target.value })} /></label>
        <div><button type="button" className="secondary-btn" onClick={addLine}>Add line</button></div>
      </div>
      {items.length > 0 && <><div className="panel-title compact-title"><i className="bi bi-list-check" /><div><h2>Loaded purchase items</h2><p>Imported and scanned products ready to save into inventory.</p></div></div><div className="table-wrap"><table><thead><tr><th>Barcode</th><th>Product</th><th>Company</th><th>Category</th><th>Qty</th><th>Purchase</th><th>Selling</th><th>MRP</th><th>GST</th><th>Batch</th><th>Expiry</th><th>Total</th><th></th></tr></thead><tbody>{items.map((item, index) => <tr key={`${item.product_id || item.barcode || item.name}-${index}`}>
        <td><input value={item.barcode || ''} onChange={(event) => updateItem(index, 'barcode', event.target.value)} /></td>
        <td><input required value={item.name || ''} onChange={(event) => updateItem(index, 'name', event.target.value)} /></td>
        <td><input value={item.company || ''} onChange={(event) => updateItem(index, 'company', event.target.value)} /></td>
        <td><input value={item.category || ''} onChange={(event) => updateItem(index, 'category', event.target.value)} /></td>
        <td><input required type="number" min="0.001" step="0.001" value={item.quantity} onChange={(event) => updateItem(index, 'quantity', event.target.value)} /></td>
        <td><input required type="number" min="0" step="0.01" value={item.purchase_price} onChange={(event) => updateItem(index, 'purchase_price', event.target.value)} /></td>
        <td><input type="number" min="0" step="0.01" value={item.selling_price} onChange={(event) => updateItem(index, 'selling_price', event.target.value)} /></td>
        <td><input type="number" min="0" step="0.01" value={item.mrp || ''} onChange={(event) => updateItem(index, 'mrp', event.target.value)} /></td>
        <td><input type="number" min="0" step="0.01" value={item.gst_percent || ''} onChange={(event) => updateItem(index, 'gst_percent', event.target.value)} /></td>
        <td><input value={item.batch_number || ''} onChange={(event) => updateItem(index, 'batch_number', event.target.value)} /></td>
        <td><input type="date" value={item.expiry_date || ''} onChange={(event) => updateItem(index, 'expiry_date', event.target.value)} /></td>
        <td>{money(Number(item.quantity || 0) * Number(item.purchase_price || 0))}</td>
        <td><button type="button" className="danger-btn" onClick={() => removeItem(index)}>Remove</button></td>
      </tr>)}</tbody></table></div></>}
      {message && <div className="inline-message">{message}</div>}
      <div className="form-actions"><span>Total {money(total)}</span><button className="primary-btn" disabled={!supplierId || items.length === 0}>Save purchase</button></div>
    </form>
  </div>;
}

export function PurchaseBookPage() {
  const [rows, setRows] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [purchaseRes, branchRes] = await Promise.all([api.purchases({ branchId }), api.branches()]);
      setRows(purchasesFrom(purchaseRes));
      const branchBody = unwrap(branchRes);
      setBranches(Array.isArray(branchBody) ? branchBody : branchBody?.branches || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load purchases.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [branchId]);
  return <div className="page-stack">
    <PageHeader title="Purchase Book" subtitle="Central purchase orders and supplier payable status." action={<Link className="primary-btn" to="/inventory/purchase">New purchase</Link>} />
    <section className="panel dashboard-filters"><BranchFilter branches={branches} value={branchId} onChange={setBranchId} /><button className="secondary-btn" onClick={load}>Refresh</button></section>
    <StatePanel loading={loading} error={error} empty={!rows.length} emptyText="No purchases found." onRetry={load} />
    {!loading && !error && rows.length > 0 && <section className="panel"><div className="table-wrap"><table><thead><tr><th>Purchase</th><th>Supplier</th><th>Date</th><th>Total</th><th>Paid</th><th>Status</th></tr></thead><tbody>
      {rows.map((row) => <tr key={row.id}><td><strong>#{row.id}</strong><small>{row.invoice_number || '-'}</small></td><td>{row.supplier_name || '-'}</td><td>{dateText(row.created_at)}</td><td>{money(row.total_price)}</td><td>{money(row.total_paid)}</td><td>{row.order_status || '-'}</td></tr>)}
    </tbody></table></div></section>}
  </div>;
}

export function PurchaseReturnsPage() {
  const [rows, setRows] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchId, setBranchId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [returnRes, branchRes] = await Promise.all([api.purchaseReturns({ branchId }), api.branches()]);
      setRows(returnsFrom(returnRes));
      const branchBody = unwrap(branchRes);
      setBranches(Array.isArray(branchBody) ? branchBody : branchBody?.branches || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Unable to load purchase returns.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [branchId]);
  return <div className="page-stack">
    <PageHeader title="Purchase Returns" subtitle="Supplier return history from Central inventory." />
    <section className="panel dashboard-filters"><BranchFilter branches={branches} value={branchId} onChange={setBranchId} /><button className="secondary-btn" onClick={load}>Refresh</button></section>
    <StatePanel loading={loading} error={error} empty={!rows.length} emptyText="No purchase returns found." onRetry={load} />
    {!loading && !error && rows.length > 0 && <section className="panel"><div className="table-wrap"><table><thead><tr><th>Return</th><th>Purchase</th><th>Supplier</th><th>Date</th><th>Reason</th><th>Total</th></tr></thead><tbody>
      {rows.map((row) => <tr key={row.id}><td>#{row.id}</td><td>#{row.purchase_id}</td><td>{row.supplier_name || '-'}</td><td>{dateText(row.created_at)}</td><td>{row.reason || '-'}</td><td>{money(row.total_amount)}</td></tr>)}
    </tbody></table></div></section>}
  </div>;
}

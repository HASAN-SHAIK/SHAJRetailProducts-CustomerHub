import React, { useEffect, useState } from 'react';
import { api, unwrap } from '../lib/api';
import { inventoryApi } from '../lib/inventoryApi';

const emptyForm = { name: '', mobile: '', email: '', address: '', gst_number: '', credit_limit: '0', branch_id: '', is_active: true };
const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value || 0));

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async (query = search) => {
    setLoading(true); setError('');
    try {
      const response = await inventoryApi.suppliers({ search: query, page: 1, limit: 100, sortBy: 'name', sortOrder: 'asc' });
      const list = unwrap(response, 'suppliers');
      setSuppliers(Array.isArray(list) ? list : []);
    } catch (requestError) {
      setSuppliers([]);
      setError(requestError?.response?.data?.error?.message || requestError?.response?.data?.message || 'Unable to load suppliers.');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    load('');
    api.branches().then((response) => {
      const body = unwrap(response);
      const list = Array.isArray(body) ? body : (body?.branches || []);
      setBranches(list);
      if (list.length === 1) setForm((current) => ({ ...current, branch_id: current.branch_id || list[0].branch_id || list[0].id || '' }));
    }).catch(() => setBranches([]));
  }, []);

  const startCreate = () => {
    const onlyBranch = branches.length === 1 ? (branches[0].branch_id || branches[0].id || '') : '';
    setEditingId(null); setForm({ ...emptyForm, branch_id: onlyBranch }); setError('');
  };

  const startEdit = (supplier) => {
    setEditingId(supplier.id);
    setForm({
      name: supplier.name || '', mobile: supplier.mobile || '', email: supplier.email || '', address: supplier.address || '',
      gst_number: supplier.gst_number || '', credit_limit: String(supplier.credit_limit ?? 0), branch_id: supplier.branch_id || '',
      is_active: supplier.is_active !== false,
    });
    setError('');
  };

  const change = (key) => (event) => setForm((current) => ({ ...current, [key]: key === 'is_active' ? event.target.checked : event.target.value }));
  const save = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) { setError('Supplier name is required.'); return; }
    const creditLimit = Number(form.credit_limit);
    if (!Number.isFinite(creditLimit) || creditLimit < 0) { setError('Credit limit must be zero or greater.'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        name: form.name.trim(), mobile: form.mobile.trim() || null, email: form.email.trim() || null,
        address: form.address.trim() || null, gst_number: form.gst_number.trim() || null, credit_limit: creditLimit,
        branch_id: form.branch_id || null, is_active: Boolean(form.is_active),
      };
      if (editingId) await inventoryApi.updateSupplier(editingId, payload);
      else await inventoryApi.createSupplier(payload);
      startCreate();
      await load('');
    } catch (requestError) {
      setError(requestError?.response?.data?.error?.message || requestError?.response?.data?.message || 'Unable to save supplier.');
    } finally { setSaving(false); }
  };

  return <div className="page-stack dashboard-page">
    <section className="hero-panel"><div><span className="eyebrow">Inventory · Central supplier master</span><h1>Suppliers</h1><p>Maintain tenant-scoped supplier identity, GST details, branch association and credit limits. Outstanding balance remains a Central financial projection and is never directly edited here.</p></div><div className="hero-actions"><button className="secondary-btn" onClick={() => load()}><i className="bi bi-arrow-clockwise"/> Refresh</button><button className="primary-btn" onClick={startCreate}><i className="bi bi-plus-lg"/> Add supplier</button></div></section>

    {error && <section className="panel" role="alert"><strong>{error}</strong></section>}

    <div className="content-grid two-one">
      <section className="panel">
        <div className="panel-title"><i className="bi bi-truck"/><div><h2>Supplier directory</h2><p>Canonical `/v1/suppliers` records</p></div></div>
        <div className="form-row"><input className="text-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search supplier"/><button className="secondary-btn" onClick={() => load(search)}>Search</button></div>
        {loading ? <div className="state-card"><strong>Loading suppliers…</strong></div> : suppliers.length === 0 ? <div className="state-card"><strong>No suppliers found</strong></div> : <div className="table-wrap"><table><thead><tr><th>Supplier</th><th>GST</th><th>Credit limit</th><th>Outstanding</th><th>Status</th><th/></tr></thead><tbody>{suppliers.map((supplier) => <tr key={supplier.id}><td><strong>{supplier.name}</strong><br/><small>{supplier.mobile || 'No mobile'} · {supplier.email || 'No email'}</small></td><td>{supplier.gst_number || '—'}</td><td>{money(supplier.credit_limit)}</td><td>{money(supplier.current_balance)}</td><td><span className={`status-pill ${supplier.is_active === false ? 'future' : 'live'}`}>{supplier.is_active === false ? 'Inactive' : 'Active'}</span></td><td><button className="secondary-btn" onClick={() => startEdit(supplier)}><i className="bi bi-pencil"/> Edit</button></td></tr>)}</tbody></table></div>}
      </section>

      <section className="panel">
        <div className="panel-title"><i className="bi bi-building-add"/><div><h2>{editingId ? 'Edit supplier' : 'Add supplier'}</h2><p>Master data only; balances are purchase/payment owned</p></div></div>
        <form className="page-stack" onSubmit={save}>
          <label>Name<input className="text-input" value={form.name} onChange={change('name')} required/></label>
          <label>Mobile<input className="text-input" value={form.mobile} onChange={change('mobile')}/></label>
          <label>Email<input className="text-input" type="email" value={form.email} onChange={change('email')}/></label>
          <label>GST number<input className="text-input" value={form.gst_number} onChange={change('gst_number')}/></label>
          <label>Credit limit<input className="text-input" type="number" min="0" step="0.01" value={form.credit_limit} onChange={change('credit_limit')}/></label>
          <label>Branch<select className="text-input" value={form.branch_id} onChange={change('branch_id')}><option value="">Resolved request branch</option>{branches.map((branch) => { const id = branch.branch_id || branch.id; return <option key={id} value={id}>{branch.branch_name || branch.name || id}</option>; })}</select></label>
          <label>Address<textarea className="text-input" value={form.address} onChange={change('address')}/></label>
          <label><input type="checkbox" checked={Boolean(form.is_active)} onChange={change('is_active')}/> Active supplier</label>
          <small>`current_balance` is intentionally excluded from create/update payloads; purchases, returns and supplier payments own that projection.</small>
          <div className="hero-actions"><button className="primary-btn" disabled={saving}>{saving ? 'Saving…' : editingId ? 'Save supplier' : 'Create supplier'}</button>{editingId && <button type="button" className="secondary-btn" onClick={startCreate}>Cancel</button>}</div>
        </form>
      </section>
    </div>
  </div>;
}

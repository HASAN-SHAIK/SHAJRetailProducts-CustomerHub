import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

const emptyForm = {
  type: 'retail', name: '', phone: '', email: '', shop_name: '', gst_number: '',
  address: '', location: '', notes: '', credit_limit: '0', is_active: true,
};

const getBody = (response) => response?.data?.data ?? response?.data ?? {};
const getCustomerList = (response) => {
  const body = getBody(response);
  if (Array.isArray(body?.customers)) return body.customers;
  if (Array.isArray(body)) return body;
  return [];
};
const getCustomerDetail = (response) => {
  const body = getBody(response);
  return {
    customer: body?.customer ?? body ?? null,
    orders: Array.isArray(body?.orders) ? body.orders : [],
    payments: Array.isArray(body?.payments) ? body.payments : [],
  };
};
const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value || 0));

export default function CustomersPage() {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [status, setStatus] = useState('loading');
  const [detailStatus, setDetailStatus] = useState('idle');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadCustomers = async (search = query) => {
    setStatus('loading'); setError('');
    try {
      const res = await api.customers({ search, page: 1, limit: 100 });
      setCustomers(getCustomerList(res));
      setStatus('ready');
    } catch (err) {
      setError(err?.response?.data?.message || 'Customer management is unavailable.');
      setStatus('error');
    }
  };

  const loadDetail = async (id) => {
    setSelectedId(id); setDetailStatus('loading'); setDetail(null); setEditing(false); setCreating(false);
    try {
      const res = await api.customerDetail(id);
      const next = getCustomerDetail(res);
      setDetail(next); setDetailStatus('ready');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load customer profile.');
      setDetailStatus('error');
    }
  };

  useEffect(() => { loadCustomers(''); }, []);

  const startCreate = () => { setCreating(true); setEditing(false); setSelectedId(null); setDetail(null); setForm(emptyForm); };
  const startEdit = () => {
    const c = detail?.customer || {};
    setCreating(false); setEditing(true);
    setForm({
      type: c.type || 'retail', name: c.name || '', phone: c.phone || c.mobile || '', email: c.email || '',
      shop_name: c.shop_name || '', gst_number: c.gst_number || '', address: c.address || '',
      location: c.location || c.city || '', notes: c.notes || '', credit_limit: String(c.credit_limit ?? 0),
      is_active: c.is_active !== false,
    });
  };
  const change = (key) => (event) => setForm((prev) => ({ ...prev, [key]: key === 'is_active' ? event.target.checked : event.target.value }));
  const save = async (event) => {
    event.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) { setError('Name and phone are required.'); return; }
    if (form.type === 'wholesale' && !form.shop_name.trim()) { setError('Shop name is required for wholesale customers.'); return; }
    const creditLimit = Number(form.credit_limit);
    if (!Number.isFinite(creditLimit) || creditLimit < 0) { setError('Credit limit must be zero or greater.'); return; }
    setSaving(true); setError('');
    try {
      const payload = { ...form, credit_limit: creditLimit };
      if (editing && selectedId) await api.updateCustomer(selectedId, payload);
      else await api.createCustomer(payload);
      setEditing(false); setCreating(false); setForm(emptyForm);
      await loadCustomers('');
      if (selectedId && editing) await loadDetail(selectedId);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save customer.');
    } finally { setSaving(false); }
  };

  const rows = useMemo(() => customers, [customers]);
  const customer = detail?.customer;

  return <div className="page-stack">
    <section className="hero-panel"><div><span className="eyebrow">Customer management</span><h1>Customers</h1><p>Central/PostgreSQL is the authority for customer profiles, balances, credit and history. POS keeps only checkout-time search/select and offline execution projections.</p></div><div className="hero-actions"><button className="secondary-btn" onClick={() => loadCustomers()}><i className="bi bi-arrow-clockwise"/> Refresh</button><button className="primary-btn" onClick={startCreate}><i className="bi bi-person-plus"/> Add customer</button></div></section>

    {error && <section className="panel" role="alert"><strong>{error}</strong>{status === 'error' && <button className="secondary-btn" onClick={() => loadCustomers()}>Retry customers</button>}</section>}

    <div className="content-grid two-one">
      <section className="panel">
        <div className="panel-title"><i className="bi bi-people"/><div><h2>Customer directory</h2><p>Tenant-scoped canonical customer records</p></div></div>
        <div className="form-row"><input className="text-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or phone" aria-label="Search customers"/><button className="secondary-btn" onClick={() => loadCustomers(query)}>Search</button></div>
        {status === 'loading' && <div className="empty-state">Loading customers…</div>}
        {status === 'ready' && rows.length === 0 && <div className="empty-state">No customers found.</div>}
        {status === 'ready' && rows.length > 0 && <div className="table-wrap"><table><thead><tr><th>Name</th><th>Phone</th><th>Type</th><th>Balance</th><th>Credit limit</th></tr></thead><tbody>{rows.map((c) => <tr key={c.id} onClick={() => loadDetail(c.id)} style={{cursor:'pointer'}}><td><strong>{c.name || '-'}</strong></td><td>{c.phone || c.mobile || '-'}</td><td>{c.type || 'retail'}</td><td>{money(c.current_balance)}</td><td>{money(c.credit_limit)}</td></tr>)}</tbody></table></div>}
      </section>

      <section className="panel">
        <div className="panel-title"><i className="bi bi-person-vcard"/><div><h2>{creating ? 'New customer' : editing ? 'Edit customer' : 'Customer profile'}</h2><p>Canonical identity and management view</p></div></div>
        {(creating || editing) ? <CustomerForm form={form} change={change} save={save} saving={saving} onCancel={() => { setCreating(false); setEditing(false); }} /> :
          detailStatus === 'loading' ? <div className="empty-state">Loading customer profile…</div> :
          detailStatus === 'error' ? <div className="empty-state"><button className="secondary-btn" onClick={() => loadDetail(selectedId)}>Retry profile</button></div> :
          customer ? <CustomerProfile detail={detail} onEdit={startEdit}/> : <div className="empty-state">Select a customer to view profile, credit and history.</div>}
      </section>
    </div>
  </div>;
}

function CustomerForm({ form, change, save, saving, onCancel }) {
  return <form className="page-stack" onSubmit={save}>
    <label>Type<select className="text-input" value={form.type} onChange={change('type')}><option value="retail">Retail</option><option value="wholesale">Wholesale</option></select></label>
    <label>Name<input className="text-input" value={form.name} onChange={change('name')}/></label>
    <label>Phone<input className="text-input" value={form.phone} onChange={change('phone')}/></label>
    <label>Email<input className="text-input" value={form.email} onChange={change('email')}/></label>
    {form.type === 'wholesale' && <><label>Shop name<input className="text-input" value={form.shop_name} onChange={change('shop_name')}/></label><label>GST number<input className="text-input" value={form.gst_number} onChange={change('gst_number')}/></label></>}
    <label>Credit limit<input className="text-input" type="number" min="0" step="0.01" value={form.credit_limit} onChange={change('credit_limit')}/></label>
    <small>Outstanding balance is a Central financial projection and is not directly editable here.</small>
    <label>Address<input className="text-input" value={form.address} onChange={change('address')}/></label>
    <label>Location<input className="text-input" value={form.location} onChange={change('location')}/></label>
    <label>Notes<textarea className="text-input" value={form.notes} onChange={change('notes')}/></label>
    <label><input type="checkbox" checked={Boolean(form.is_active)} onChange={change('is_active')}/> Active</label>
    <div className="hero-actions"><button className="primary-btn" disabled={saving}>{saving ? 'Saving…' : 'Save customer'}</button><button type="button" className="secondary-btn" onClick={onCancel}>Cancel</button></div>
  </form>;
}

function CustomerProfile({ detail, onEdit }) {
  const c = detail.customer || {};
  return <div className="page-stack">
    <div><strong>{c.name || '-'}</strong><p>{c.phone || c.mobile || '-'} · {c.type || 'retail'} · {c.is_active === false ? 'Inactive' : 'Active'}</p></div>
    <div className="metric-grid"><Mini label="Outstanding balance" value={money(c.current_balance)}/><Mini label="Credit limit" value={money(c.credit_limit)}/><Mini label="Orders" value={detail.orders.length}/><Mini label="Payments" value={detail.payments.length}/></div>
    <div><strong>Contact & business</strong><p>{c.email || 'No email'}</p><p>{c.shop_name || c.address || c.location || 'No additional profile details'}</p></div>
    <History title="Recent orders" rows={detail.orders}/><History title="Recent payments" rows={detail.payments}/>
    <button className="secondary-btn" onClick={onEdit}><i className="bi bi-pencil"/> Edit master profile</button>
  </div>;
}
function Mini({label,value}){return <div className="metric-card tone-info"><div><span>{label}</span><strong>{value}</strong></div></div>}
function History({title,rows}){return <div><strong>{title}</strong>{rows.length===0?<p>No records.</p>:<div className="table-wrap"><table><tbody>{rows.slice(0,8).map((row,index)=><tr key={row.id || row.order_id || row.payment_id || index}><td>{row.order_code || row.reference || row.type || row.id || '-'}</td><td>{row.total_price != null ? money(row.total_price) : row.amount != null ? money(row.amount) : row.status || '-'}</td></tr>)}</tbody></table></div>}</div>}

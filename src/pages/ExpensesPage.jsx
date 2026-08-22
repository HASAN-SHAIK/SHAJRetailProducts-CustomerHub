import React, { useEffect, useMemo, useState } from 'react';
import { api, unwrap } from '../lib/api';

const emptyForm = { type: 'shop', category: '', amount: '', staffId: '', paymentMethod: '', notes: '', date: '' };

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [branches, setBranches] = useState([]);
  const [staff, setStaff] = useState([]);
  const [branchId, setBranchId] = useState('');
  const [type, setType] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    setStatus('loading'); setError('');
    try {
      const [expenseRes, branchRes, staffRes] = await Promise.all([
        api.expenses({ branchId, type }), api.branches(), api.staff({ status: 'active', branchId })
      ]);
      const expenseBody = unwrap(expenseRes);
      const branchBody = unwrap(branchRes);
      const staffBody = unwrap(staffRes);
      setExpenses(Array.isArray(expenseBody?.expenses) ? expenseBody.expenses : []);
      setBranches(Array.isArray(branchBody) ? branchBody : (branchBody?.branches || []));
      setStaff(Array.isArray(staffBody) ? staffBody : (staffBody?.staff || staffBody?.data || []));
      setStatus('ready');
    } catch (err) {
      setError(err?.response?.data?.error || err?.response?.data?.message || 'Unable to load expenses from Central.');
      setStatus('error');
    }
  };

  useEffect(() => { refresh(); }, [branchId, type]);

  const total = useMemo(() => expenses.reduce((sum, row) => sum + Number(row.amount || 0), 0), [expenses]);

  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      await api.createExpense({
        type: form.type,
        category: form.category.trim(),
        amount: Number(form.amount),
        staffId: form.type === 'staff' ? form.staffId : undefined,
        paymentMethod: form.paymentMethod || undefined,
        notes: form.notes || undefined,
        date: form.date || undefined,
        branch_id: branchId || undefined,
      });
      setForm(emptyForm);
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.error || err?.response?.data?.message || 'Unable to save expense.');
    } finally { setSaving(false); }
  };

  const remove = async (expenseId) => {
    if (!window.confirm('Delete this expense?')) return;
    try { await api.deleteExpense(expenseId); await refresh(); }
    catch (err) { setError(err?.response?.data?.error || 'Unable to delete expense.'); }
  };

  return <div className="page-stack">
    <section className="hero-panel"><div><span className="eyebrow">Finance</span><h1>Expenses</h1><p>Canonical tenant expense management from Central/PostgreSQL. POS remains responsible only for store-execution cash actions.</p></div><button className="secondary-btn" onClick={refresh}><i className="bi bi-arrow-clockwise"/> Refresh</button></section>

    <div className="metric-grid"><Metric label="Visible expenses" value={expenses.length}/><Metric label="Visible total" value={new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(total)}/></div>

    <section className="panel"><div className="panel-title"><i className="bi bi-funnel"/><div><h2>Scope</h2><p>Filter canonical expenses by branch and type.</p></div></div><div className="form-grid">
      <label>Branch<select value={branchId} onChange={e=>setBranchId(e.target.value)}><option value="">All allowed branches</option>{branches.map(b=><option key={b.id || b.branch_id} value={b.id || b.branch_id}>{b.name || b.branch_name || b.store_name || b.id}</option>)}</select></label>
      <label>Type<select value={type} onChange={e=>setType(e.target.value)}><option value="">All types</option><option value="shop">Shop</option><option value="staff">Staff</option></select></label>
    </div></section>

    <section className="panel"><div className="panel-title"><i className="bi bi-plus-circle"/><div><h2>Add expense</h2><p>Uses Central expenses:write authority.</p></div></div>
      <form className="form-grid" onSubmit={submit}>
        <label>Type<select value={form.type} onChange={e=>setForm({...form,type:e.target.value,staffId:''})}><option value="shop">Shop</option><option value="staff">Staff</option></select></label>
        <label>Category<input required value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/></label>
        <label>Amount<input required min="0.01" step="0.01" type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></label>
        {form.type==='staff' && <label>Staff<select required value={form.staffId} onChange={e=>setForm({...form,staffId:e.target.value})}><option value="">Select staff</option>{staff.map(s=><option key={s.staffId || s.id} value={s.staffId || s.id}>{s.name || s.staffName || s.staffId}</option>)}</select></label>}
        <label>Payment method<input value={form.paymentMethod} onChange={e=>setForm({...form,paymentMethod:e.target.value})}/></label>
        <label>Date<input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label>
        <label className="span-2">Notes<input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
        <div><button className="primary-btn" disabled={saving}>{saving?'Saving…':'Add expense'}</button></div>
      </form>
    </section>

    {error && <section className="panel"><div className="empty-state"><strong>Expense data unavailable</strong><p>{error}</p><button className="secondary-btn" onClick={refresh}>Retry</button></div></section>}
    {status==='loading' && <section className="panel"><div className="empty-state">Loading expenses…</div></section>}
    {status==='ready' && expenses.length===0 && <section className="panel"><div className="empty-state"><strong>No expenses found</strong><p>No canonical expenses match the selected scope.</p></div></section>}
    {status==='ready' && expenses.length>0 && <section className="panel"><div className="panel-title"><i className="bi bi-receipt"/><div><h2>Expense register</h2><p>Central/PostgreSQL source of truth.</p></div></div><div className="table-wrap"><table><thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Amount</th><th>Payment</th><th>Actions</th></tr></thead><tbody>{expenses.map(row=><tr key={row.expenseId}><td>{String(row.date || '').slice(0,10) || '—'}</td><td>{row.type}</td><td>{row.category}</td><td>{new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(Number(row.amount||0))}</td><td>{row.paymentMethod || '—'}</td><td><button className="secondary-btn" onClick={()=>remove(row.expenseId)}>Delete</button></td></tr>)}</tbody></table></div></section>}
  </div>;
}

function Metric({label,value}) { return <div className="metric-card tone-info"><i className="bi bi-cash-coin"/><div><span>{label}</span><strong>{value}</strong></div></div>; }

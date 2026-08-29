import React, { useEffect, useMemo, useState } from 'react';
import { api, unwrap } from '../lib/api';

const emptyForm = { type: 'shop', category: '', amount: '', staffId: '', paymentMethod: '', notes: '', date: '' };

const money = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const categoryTone = (category = '') => {
  const key = String(category).toLowerCase();
  if (key.includes('inventory') || key.includes('stock')) return 'inventory';
  if (key.includes('util')) return 'utilities';
  if (key.includes('marketing')) return 'marketing';
  if (key.includes('staff')) return 'staff';
  return 'default';
};

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
  const [showForm, setShowForm] = useState(false);

  const refresh = async () => {
    setStatus('loading');
    setError('');
    try {
      const [expenseRes, branchRes, staffRes] = await Promise.all([
        api.expenses({ branchId, type }),
        api.branches(),
        api.staff({ status: 'active', branchId }),
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

  useEffect(() => {
    const openForm = () => setShowForm(true);
    window.addEventListener('customerhub:add-expense', openForm);
    return () => window.removeEventListener('customerhub:add-expense', openForm);
  }, []);

  const summary = useMemo(() => {
    const total = expenses.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const categories = expenses.reduce((acc, row) => {
      const category = row.category || 'Uncategorised';
      acc[category] = (acc[category] || 0) + Number(row.amount || 0);
      return acc;
    }, {});
    const largest = Object.entries(categories).sort((a, b) => b[1] - a[1])[0] || ['-', 0];
    const shop = expenses.filter((row) => row.type === 'shop').length;
    const staffLinked = expenses.filter((row) => row.type === 'staff').length;
    return { total, largest, shop, staffLinked };
  }, [expenses]);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
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
      setShowForm(false);
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.error || err?.response?.data?.message || 'Unable to save expense.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (expenseId) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await api.deleteExpense(expenseId);
      await refresh();
    } catch (err) {
      setError(err?.response?.data?.error || 'Unable to delete expense.');
    }
  };

  return <div className="page-stack expense-dashboard">
    <div className="expense-page-header">
      <div>
        <h1>Expense Management</h1>
        <p>Track operating costs and procurement across all branches.</p>
      </div>
      <div className="expense-header-actions">
        <button className="secondary-btn" type="button"><i className="bi bi-grid" /> Categories</button>
        <button className="secondary-btn" type="button"><i className="bi bi-calendar3" /> Monthly Report</button>
        <button className="primary-btn" type="button" onClick={() => setShowForm((value) => !value)}>
          <i className="bi bi-receipt-cutoff" /> Add Expense
        </button>
      </div>
    </div>

    <div className="expense-top-grid">
      <section className="expense-card expense-trend-card">
        <div className="expense-card-heading">
          <h2>Expense Trend</h2>
          <div className="chart-legend">
            <span><i className="dot red" /> Current Month</span>
            <span><i className="dot gray" /> Previous Month</span>
          </div>
        </div>
        <svg className="expense-trend-chart" viewBox="0 0 760 292" role="img" aria-label="Expense trend chart">
          <defs>
            <linearGradient id="expenseArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity=".16" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity=".02" />
            </linearGradient>
          </defs>
          <path className="expense-grid" d="M52 32H730M52 78H730M52 124H730M52 170H730M52 216H730M52 262H730M198 24V262M344 24V262M490 24V262M636 24V262" />
          <path className="expense-area" d="M52 214 C128 209 151 198 198 184 C250 166 292 83 344 86 C402 88 429 177 490 176 C540 176 567 60 636 43 C676 37 704 62 730 84 L730 262 L52 262 Z" />
          <path className="expense-prev-line" d="M52 217 C128 214 151 204 198 193 C250 175 292 116 344 116 C402 116 429 180 490 183 C540 188 567 90 636 76 C676 70 704 92 730 120" />
          <path className="expense-main-line" d="M52 214 C128 209 151 198 198 184 C250 166 292 83 344 86 C402 88 429 177 490 176 C540 176 567 60 636 43 C676 37 704 62 730 84" />
          {[214, 184, 86, 176, 43, 84].map((cy, index) => <circle key={index} className="expense-point" cx={[52, 198, 344, 490, 636, 730][index]} cy={cy} r="3.5" />)}
          <g className="expense-axis">
            {['60k', '50k', '40k', '30k', '20k', '10k', '0k'].map((label, index) => <text key={label} x="18" y={36 + index * 38}>{label}</text>)}
            {['Oct 01', 'Oct 05', 'Oct 10', 'Oct 15', 'Oct 20', 'Oct 24'].map((label, index) => <text key={label} x={[34, 180, 326, 472, 618, 710][index]} y="278">{label}</text>)}
          </g>
        </svg>
      </section>

      <aside className="expense-side-stack">
        <div className="expense-side-card">
          <span>Expenses this month</span>
          <strong>{money(summary.total)}</strong>
          <small className="bad-text"><i className="bi bi-arrow-up-right" /> +2.1%</small>
        </div>
        <div className="expense-side-card category-card">
          <span>Largest Category</span>
          <div className="category-summary">
            <i className="bi bi-square" />
            <div>
              <strong>{summary.largest[0]}</strong>
              <small>{money(summary.largest[1])}</small>
            </div>
          </div>
        </div>
        <div className="expense-side-card compliance-card">
          <strong>Budget Compliance</strong>
          <div className="budget-track"><span style={{ width: '82%' }} /></div>
          <small>You are 18% under budget this month.</small>
        </div>
      </aside>
    </div>

    <section className="expense-card expense-filters">
      <label>
        <span>Branch</span>
        <select value={branchId} onChange={(event) => setBranchId(event.target.value)}>
          <option value="">All allowed branches</option>
          {branches.map((branch) => <option key={branch.id || branch.branch_id} value={branch.id || branch.branch_id}>{branch.name || branch.branch_name || branch.store_name || branch.id}</option>)}
        </select>
      </label>
      <label>
        <span>Type</span>
        <select value={type} onChange={(event) => setType(event.target.value)}>
          <option value="">All types</option>
          <option value="shop">Shop</option>
          <option value="staff">Staff</option>
        </select>
      </label>
      <button className="secondary-btn" type="button" onClick={refresh}><i className="bi bi-arrow-clockwise" /> Refresh</button>
      <div className="expense-boundary-note">Central/PostgreSQL is the source of truth. POS remains responsible only for store-execution cash actions.</div>
    </section>

    {showForm && <section className="expense-card" id="expense-form">
      <div className="expense-card-heading compact">
        <div>
          <h2>Add expense</h2>
          <p>Captured through Central expenses:write authority.</p>
        </div>
      </div>
      <form className="form-grid" onSubmit={submit}>
        <label>Type<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value, staffId: '' })}><option value="shop">Shop</option><option value="staff">Staff</option></select></label>
        <label>Category<input required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} /></label>
        <label>Amount<input required min="0.01" step="0.01" type="number" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></label>
        {form.type === 'staff' && <label>Staff<select required value={form.staffId} onChange={(event) => setForm({ ...form, staffId: event.target.value })}><option value="">Select staff</option>{staff.map((person) => <option key={person.staffId || person.id} value={person.staffId || person.id}>{person.name || person.staffName || person.staffId}</option>)}</select></label>}
        <label>Payment method<input value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })} /></label>
        <label>Date<input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></label>
        <label className="span-2">Notes<input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></label>
        <div><button className="primary-btn" disabled={saving}>{saving ? 'Saving...' : 'Add expense'}</button></div>
      </form>
    </section>}

    {error && <section className="expense-card"><div className="empty-state"><strong>Expense data unavailable</strong><p>{error}</p><button className="secondary-btn" onClick={refresh}>Retry</button></div></section>}
    {status==='loading' && <section className="expense-card"><div className="empty-state">Loading expenses...</div></section>}

    {status === 'ready' && <section className="expense-card recent-expenses-card">
      <div className="recent-expenses-head">
        <h2>Recent Expenses</h2>
        <label className="recent-search">
          <i className="bi bi-search" />
          <input placeholder="Search expense" />
        </label>
        <button className="text-link" type="button">View All History</button>
      </div>
      {expenses.length === 0 ? <div className="empty-state"><strong>No expenses found</strong><p>No canonical expenses match the selected scope.</p></div> : <div className="expense-table-wrap">
        <table>
          <thead>
            <tr><th>Expense</th><th>Category</th><th>Branch</th><th>Vendor</th><th>Date</th><th>Amount</th><th>Status</th></tr>
          </thead>
          <tbody>
            {expenses.slice(0, 6).map((row) => {
              const id = row.expenseId || row.expense_id || row.id;
              return <tr key={id || `${row.category}-${row.date}`}>
                <td>{row.notes || row.description || row.category || 'Operating expense'}</td>
                <td><span className={`expense-category ${categoryTone(row.category)}`}>{row.category || '-'}</span></td>
                <td>{row.branchName || row.branch_name || row.branch || 'All Branches'}</td>
                <td>{row.vendor || row.paymentMethod || '-'}</td>
                <td>{formatDate(row.date || row.created_at)}</td>
                <td><strong>{money(row.amount)}</strong></td>
                <td>
                  <span className={`expense-status ${String(row.status || 'approved').toLowerCase()}`}>{row.status || 'Approved'}</span>
                  {id && <button className="expense-row-action" aria-label="Delete expense" onClick={() => remove(id)}><i className="bi bi-trash3" /></button>}
                </td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>}
    </section>}
  </div>;
}

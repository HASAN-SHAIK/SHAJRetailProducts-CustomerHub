import React, { useEffect, useMemo, useState } from 'react';
import { api, unwrap } from '../lib/api';

const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value || 0));
const emptyReceipt = { customer_id: '', amount: '', payment_mode: 'cash', notes: '' };
const emptyPayment = { type: 'supplier', supplier_id: '', amount: '', payment_mode: 'cash', notes: '' };
const overviewMetrics = [
  { label: 'Gross Revenue', value: 1248580, delta: '+12.4%', tone: 'good' },
  { label: 'Total Expenses', value: 242100, delta: '+2.1%', tone: 'bad' },
  { label: 'Gross Profit', value: 1006480, delta: '81% margin', tone: 'good' },
  { label: 'Net Movement', value: 784320, delta: '+8.5%', tone: 'good' },
];
const accounts = [
  { name: 'HDFC Primary Business', meta: 'Ending in 4821', value: 2480500 },
  { name: 'ICICI Operating Account', meta: 'Ending in 9310', value: 812300 },
  { name: 'Cash Drawer Reserve', meta: 'Across all stores', value: 154620 },
];
const paymentsDue = [
  { label: 'Vendor: LuxeCare', meta: 'Due Oct 30 - #INV-842', value: '1.2L', tone: 'bad' },
  { label: 'Electricity Bill', meta: 'Due Nov 2 - Downtown Hub', value: '12.4K', tone: 'neutral' },
  { label: 'GST Advance', meta: 'Due Nov 5 - October cycle', value: '68K', tone: 'good' },
];

export default function AccountsPage() {
  const [tab, setTab] = useState('cashbook');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(emptyReceipt);
  const [payment, setPayment] = useState(emptyPayment);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    setStatus('loading'); setError('');
    try {
      const params = { from, to };
      const loaders = {
        cashbook: () => api.accountCashBook(params),
        bankbook: () => api.accountBankBook(params),
        ledger: () => api.accountLedger(params),
        outstanding: () => api.accountOutstanding(),
        receipts: () => api.accountReceipts(params),
        payments: () => api.accountPayments(params),
        opening: () => api.accountOpeningSetup(),
      };
      const res = await loaders[tab]();
      setData(unwrap(res));
      setStatus('ready');
    } catch (err) {
      setData(null);
      setError(err?.response?.data?.message || 'Unable to load accounting data from Central.');
      setStatus('error');
    }
  };

  useEffect(() => { refresh(); }, [tab, from, to]);

  const rows = useMemo(() => {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    for (const key of ['entries', 'rows', 'items', 'transactions', 'receipts', 'payments', 'data']) {
      if (Array.isArray(data[key])) return data[key];
    }
    return [];
  }, [data]);

  const createReceipt = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      await api.createAccountReceipt({
        customer_id: Number(receipt.customer_id),
        amount: Number(receipt.amount),
        payment_mode: receipt.payment_mode,
        notes: receipt.notes || undefined,
        client_txn_id: globalThis.crypto?.randomUUID?.() || `hub-receipt-${Date.now()}`,
      });
      setReceipt(emptyReceipt); setTab('receipts'); await refresh();
    } catch (err) { setError(err?.response?.data?.message || 'Unable to create receipt entry.'); }
    finally { setSaving(false); }
  };

  const createPayment = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    try {
      await api.createAccountPayment({
        type: payment.type,
        supplier_id: payment.type === 'supplier' ? Number(payment.supplier_id) : undefined,
        amount: Number(payment.amount),
        payment_mode: payment.payment_mode,
        notes: payment.notes || undefined,
        client_txn_id: globalThis.crypto?.randomUUID?.() || `hub-payment-${Date.now()}`,
      });
      setPayment(emptyPayment); setTab('payments'); await refresh();
    } catch (err) { setError(err?.response?.data?.message || 'Unable to create payment entry.'); }
    finally { setSaving(false); }
  };

  return <div className="page-stack finance-overview-page">
    <div className="page-header"><div><h1>Financial Overview</h1><p>Summary of business performance and accounts across all locations.</p></div><button className="secondary-btn" onClick={refresh}><i className="bi bi-arrow-clockwise"/> Refresh</button></div>

    <div className="metric-grid finance-metric-grid">{overviewMetrics.map((metric) => <Metric key={metric.label} {...metric} value={money(metric.value)} />)}</div>

    <div className="finance-chart-grid">
      <section className="panel finance-card revenue-card"><h2>Revenue vs Expenses</h2><div className="finance-line-chart"><svg viewBox="0 0 640 300" role="img" aria-label="Revenue and expense trend over four weeks"><path className="finance-grid" d="M80 34H610M80 88H610M80 142H610M80 196H610M80 250H610M80 34V250M240 34V250M400 34V250M560 34V250"/><g className="finance-axis"><text x="20" y="38">350k</text><text x="20" y="92">300k</text><text x="20" y="146">250k</text><text x="20" y="200">200k</text><text x="20" y="254">150k</text><text x="58" y="286">Week 1</text><text x="218" y="286">Week 2</text><text x="378" y="286">Week 3</text><text x="538" y="286">Week 4</text></g><path className="finance-line revenue" d="M80 120 C160 86 208 74 240 72 C304 70 336 88 400 86 C480 84 542 64 560 50"/><path className="finance-line expenses" d="M80 232 C152 238 204 237 240 236 C314 228 332 218 400 220 C464 220 520 224 560 226"/><g className="finance-points"><circle cx="80" cy="120" r="4"/><circle cx="240" cy="72" r="4"/><circle cx="400" cy="86" r="4"/><circle cx="560" cy="50" r="4"/><circle className="expense" cx="80" cy="232" r="4"/><circle className="expense" cx="240" cy="236" r="4"/><circle className="expense" cx="400" cy="220" r="4"/><circle className="expense" cx="560" cy="226" r="4"/></g></svg></div></section>
      <section className="panel finance-card branch-card"><h2>Branch Contribution</h2><div className="branch-donut"><div className="branch-donut-ring"><span className="branch-label west">West End<br/>30%</span><span className="branch-label metro">Metro Mall<br/>25%</span><span className="branch-label down">Downtown Hub<br/>45%</span></div></div></section>
    </div>

    <div className="finance-bottom-grid">
      <section className="panel finance-card balances-card"><div className="finance-section-head"><h2>Account Balances</h2><button>Manage Accounts</button></div><div className="finance-list">{accounts.map((account) => <div className="finance-list-row" key={account.name}><div><strong>{account.name}</strong><span>{account.meta}</span></div><b>{money(account.value)}</b></div>)}</div></section>
      <section className="panel finance-card payments-card"><h2>Upcoming Payments</h2><div className="finance-list compact">{paymentsDue.map((payment) => <div className="payment-row" key={payment.label}><span className={`payment-icon ${payment.tone}`}><i className="bi bi-square" /></span><div><strong>{payment.label}</strong><span>{payment.meta}</span></div><b>{payment.value}</b></div>)}</div></section>
    </div>

    <section className="panel"><div className="panel-title"><i className="bi bi-journal-text"/><div><h2>Accounting views</h2><p>Read-only books require Central reports authority; accounting mutations remain administrator-only.</p></div></div><div className="button-row">{[['cashbook','Cash Book'],['bankbook','Bank Book'],['ledger','Ledger'],['outstanding','Outstanding'],['receipts','Receipt Entries'],['payments','Payment Entries'],['opening','Opening Setup']].map(([key,label])=><button key={key} className={tab===key?'primary-btn':'secondary-btn'} onClick={()=>setTab(key)}>{label}</button>)}</div><div className="form-grid"><label>From<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>To<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label></div></section>

    <div className="content-grid two-one"><section className="panel"><div className="panel-title"><i className="bi bi-box-arrow-in-down"/><div><h2>Receipt entry</h2><p>Admin-only Central accounting mutation.</p></div></div><form className="form-grid" onSubmit={createReceipt}><label>Customer ID<input required type="number" min="1" value={receipt.customer_id} onChange={e=>setReceipt({...receipt,customer_id:e.target.value})}/></label><label>Amount<input required type="number" min="0.01" step="0.01" value={receipt.amount} onChange={e=>setReceipt({...receipt,amount:e.target.value})}/></label><label>Mode<select value={receipt.payment_mode} onChange={e=>setReceipt({...receipt,payment_mode:e.target.value})}><option value="cash">Cash</option><option value="bank">Bank</option><option value="online">Online</option></select></label><label>Notes<input value={receipt.notes} onChange={e=>setReceipt({...receipt,notes:e.target.value})}/></label><button className="primary-btn" disabled={saving}>{saving?'Saving…':'Create receipt'}</button></form></section>
    <section className="panel"><div className="panel-title"><i className="bi bi-box-arrow-up"/><div><h2>Payment entry</h2><p>Supplier, expense or drawings payment through Central.</p></div></div><form className="form-grid" onSubmit={createPayment}><label>Type<select value={payment.type} onChange={e=>setPayment({...payment,type:e.target.value,supplier_id:''})}><option value="supplier">Supplier</option><option value="expense">Expense</option><option value="drawings">Drawings</option></select></label>{payment.type==='supplier'&&<label>Supplier ID<input required type="number" min="1" value={payment.supplier_id} onChange={e=>setPayment({...payment,supplier_id:e.target.value})}/></label>}<label>Amount<input required type="number" min="0.01" step="0.01" value={payment.amount} onChange={e=>setPayment({...payment,amount:e.target.value})}/></label><label>Mode<select value={payment.payment_mode} onChange={e=>setPayment({...payment,payment_mode:e.target.value})}><option value="cash">Cash</option><option value="bank">Bank</option></select></label><label>Notes<input value={payment.notes} onChange={e=>setPayment({...payment,notes:e.target.value})}/></label><button className="primary-btn" disabled={saving}>{saving?'Saving…':'Create payment'}</button></form></section></div>

    {error && <section className="panel"><div className="empty-state"><strong>Accounting data unavailable</strong><p>{error}</p><button className="secondary-btn" onClick={refresh}>Retry</button></div></section>}
    {status==='loading' && <section className="panel"><div className="empty-state">Loading accounting data…</div></section>}
    {status==='ready' && rows.length===0 && <section className="panel"><div className="empty-state"><strong>No entries found</strong><p>{tab==='opening' ? 'Opening setup is available from Central but has no list entries to display.' : 'No canonical entries match the selected view and date scope.'}</p>{data && !Array.isArray(data) && <pre>{JSON.stringify(data, null, 2)}</pre>}</div></section>}
    {status==='ready' && rows.length>0 && <section className="panel"><div className="panel-title"><i className="bi bi-table"/><div><h2>{tab.replaceAll('-',' ')}</h2><p>Canonical Central/PostgreSQL accounting facts.</p></div></div><div className="table-wrap"><table><thead><tr>{Object.keys(rows[0]||{}).slice(0,8).map(key=><th key={key}>{key.replaceAll('_',' ')}</th>)}</tr></thead><tbody>{rows.map((row,index)=><tr key={row.id || row.entry_id || row.txn_id || index}>{Object.keys(rows[0]||{}).slice(0,8).map(key=><td key={key}>{typeof row[key]==='number' && /amount|balance|debit|credit|total/i.test(key) ? money(row[key]) : String(row[key] ?? '—')}</td>)}</tr>)}</tbody></table></div></section>}
  </div>;
}

function Metric({ label, value, delta, tone }) {
  return <div className={`metric-card finance-kpi tone-${tone}`}><div><span>{label}</span><strong>{value}</strong><small><i className="bi bi-arrow-up-short" /> {delta}</small></div></div>;
}

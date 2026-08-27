import React from 'react';

const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));

const sampleRows = [
  { id: 'ORD-1024', customer: 'Walk-in Sale', status: 'Paid', payment: 'Cash', items: 8, total: 4200 },
  { id: 'ORD-1023', customer: 'Ananya Sharma', status: 'Credit', payment: 'Account', items: 4, total: 1850 },
  { id: 'ORD-1022', customer: 'Kiran Stores', status: 'Paid', payment: 'UPI', items: 14, total: 7200 },
  { id: 'ORD-1021', customer: 'Mohan Kumar', status: 'Pending', payment: 'Cash', items: 3, total: 980 },
];

export default function OrdersPage() {
  return <div className="page-stack">
    <div className="page-header">
      <div>
        <span className="eyebrow">Orders</span>
        <h1>Order Management</h1>
        <p>Review synced POS orders, payment state, fulfillment status and customer-linked activity.</p>
      </div>
      <div className="hero-actions">
        <button className="secondary-btn"><i className="bi bi-funnel" /> Filter</button>
        <button className="primary-btn"><i className="bi bi-download" /> Export Orders</button>
      </div>
    </div>

    <div className="metric-grid">
      <Metric label="Orders today" value="128" tone="info" />
      <Metric label="Revenue" value={money(42000)} tone="good" />
      <Metric label="Pending" value="12" tone="warn" />
      <Metric label="Avg order value" value={money(328)} tone="info" />
    </div>

    <div className="content-grid two-one">
      <section className="panel">
        <div className="panel-title"><i className="bi bi-bag-check" /><div><h2>Recent orders</h2><p>Central order stream synchronized from POS terminals.</p></div></div>
        <div className="toolbar-row">
          <input className="text-input" placeholder="Search orders, customer or payment" />
          <select className="text-input" defaultValue=""><option value="">All statuses</option><option>Paid</option><option>Pending</option><option>Credit</option></select>
        </div>
        <div className="table-wrap"><table><thead><tr><th>Order ID</th><th>Customer</th><th>Status</th><th>Payment</th><th>Items</th><th>Total</th></tr></thead><tbody>
          {sampleRows.map((row) => <tr key={row.id}><td><strong>{row.id}</strong></td><td>{row.customer}</td><td><span className={`status-pill ${row.status === 'Paid' ? 'live' : row.status === 'Pending' ? 'partial' : 'contract'}`}>{row.status}</span></td><td>{row.payment}</td><td>{row.items}</td><td>{money(row.total)}</td></tr>)}
        </tbody></table></div>
      </section>
      <section className="panel">
        <div className="panel-title"><i className="bi bi-receipt-cutoff" /><div><h2>Order summary</h2><p>High-level checkout health for this period.</p></div></div>
        <div className="side-card-list">
          <Summary label="Completed" value="86%" />
          <Summary label="Credit orders" value="9%" />
          <Summary label="Refund / return" value="2%" />
          <Summary label="Sync queue" value="3 pending" />
        </div>
      </section>
    </div>
  </div>;
}

function Metric({ label, value, tone }) {
  return <div className={`metric-card tone-${tone}`}><i className="bi bi-receipt" /><div><span>{label}</span><strong>{value}</strong></div></div>;
}

function Summary({ label, value }) {
  return <div className="summary-line"><span>{label}</span><strong>{value}</strong></div>;
}

import React, { useEffect, useMemo, useState } from 'react';
import { api, unwrap } from '../lib/api';

const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));
const number = (value) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(Number(value || 0));
const dateText = (value) => value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '-';

const ordersFrom = (response) => {
  const body = unwrap(response);
  if (Array.isArray(body?.orders)) return body.orders;
  if (Array.isArray(body?.data?.orders)) return body.data.orders;
  return [];
};

const returnsFrom = (response) => {
  const body = unwrap(response);
  if (Array.isArray(body?.returns)) return body.returns;
  if (Array.isArray(body?.data?.returns)) return body.data.returns;
  return [];
};

const statusLabel = (order) => {
  if (order.payment_status === 'paid') return 'Paid';
  if (order.payment_status === 'partial') return 'Partial';
  if (order.payment_mode === 'credit') return 'Credit';
  return order.order_status || 'Pending';
};

const statusTone = (label) => {
  const value = String(label || '').toLowerCase();
  if (value === 'paid' || value === 'completed') return 'live';
  if (value === 'partial' || value === 'pending') return 'partial';
  return 'contract';
};

export default function OrdersPage({ mode = 'overview' }) {
  const [orders, setOrders] = useState([]);
  const [returns, setReturns] = useState([]);
  const [summary, setSummary] = useState(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      api.orders({ transactionType: 'sale', search, limit: 50 }),
      api.dashboardRevenueOverview({ range: 'this_month' }),
      api.returns({ limit: 50 }),
    ]).then(([ordersResponse, summaryResponse, returnsResponse]) => {
      if (!active) return;
      setOrders(ordersFrom(ordersResponse));
      setSummary(unwrap(summaryResponse)?.revenue_overview || null);
      setReturns(returnsFrom(returnsResponse));
    }).catch((requestError) => {
      if (!active) return;
      setOrders([]);
      setReturns([]);
      setSummary(null);
      setError(requestError?.response?.data?.message || requestError?.response?.data?.error || 'Unable to load sales orders.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [search, refreshKey]);

  const visibleOrders = useMemo(() => orders.filter((order) => {
    if (!status) return true;
    return statusLabel(order).toLowerCase() === status;
  }), [orders, status]);

  const stats = useMemo(() => {
    const completed = orders.filter((order) => ['paid', 'completed'].includes(String(order.payment_status || order.order_status).toLowerCase())).length;
    const credit = orders.filter((order) => order.payment_mode === 'credit' || order.payment_status === 'unpaid').length;
    const revenue = summary?.total_revenue ?? orders.reduce((sum, order) => sum + Number(order.total_amount || 0) - Number(order.returned_amount || 0), 0);
    const totalOrders = summary?.total_orders ?? orders.length;
    return {
      totalOrders,
      revenue,
      pending: orders.filter((order) => ['pending', 'unpaid', 'partial'].includes(String(order.payment_status || order.order_status).toLowerCase())).length,
      avg: totalOrders ? revenue / totalOrders : 0,
      completedPercent: orders.length ? Math.round((completed / orders.length) * 100) : 0,
      creditPercent: orders.length ? Math.round((credit / orders.length) * 100) : 0,
      returnPercent: orders.length ? Math.round((returns.length / orders.length) * 100) : 0,
    };
  }, [orders, returns, summary]);

  const exportOrders = () => {
    const header = ['Order ID', 'Customer', 'Status', 'Payment', 'Items', 'Total', 'Returned', 'Created'];
    const rows = visibleOrders.map((order) => [
      `ORD-${order.id}`,
      order.customer_name || order.customer_phone || 'Walk-in Sale',
      statusLabel(order),
      order.payment_mode || '-',
      order.product_count || 0,
      order.total_amount || 0,
      order.returned_amount || 0,
      order.created_at || '',
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sales-orders.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const selectedOrder = visibleOrders[0] || orders[0] || null;

  if (mode === 'detail') {
    return <OrderDetailPage orderId={selectedOrder?.id} />;
  }

  if (mode === 'returns') {
    return <ReturnsSummaryPage returns={returns} loading={loading} error={error} onRefresh={() => setRefreshKey((value) => value + 1)} />;
  }

  return <div className="page-stack">
    <div className="page-header">
      <div>
        <span className="eyebrow">Orders</span>
        <h1>{mode === 'sales' ? 'Sales Orders' : 'Order Management'}</h1>
        <p>Real Central/PostgreSQL sale orders synchronized from POS terminals.</p>
      </div>
      <div className="hero-actions">
        <button type="button" className="secondary-btn" onClick={() => setRefreshKey((value) => value + 1)}><i className="bi bi-arrow-clockwise" /> Refresh</button>
        <button type="button" className="primary-btn" onClick={exportOrders} disabled={!visibleOrders.length}><i className="bi bi-download" /> Export Orders</button>
      </div>
    </div>

    <div className="metric-grid">
      <Metric label="Sales orders" value={number(stats.totalOrders)} tone="info" />
      <Metric label="Revenue" value={money(stats.revenue)} tone="good" />
      <Metric label="Pending" value={number(stats.pending)} tone="warn" />
      <Metric label="Avg order value" value={money(stats.avg)} tone="info" />
    </div>

    <div className="content-grid two-one">
      <section className="panel">
        <div className="panel-title"><i className="bi bi-bag-check" /><div><h2>Recent orders</h2><p>Database-backed sale order stream.</p></div></div>
        <div className="toolbar-row">
          <input className="text-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search orders, customer or products" />
          <select className="text-input" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="credit">Credit</option>
            <option value="pending">Pending</option>
          </select>
        </div>
        {loading && <div className="dashboard-state compact"><strong>Loading orders...</strong></div>}
        {!loading && error && <div className="dashboard-state compact dashboard-error"><strong>{error}</strong></div>}
        {!loading && !error && visibleOrders.length === 0 && <div className="dashboard-state compact"><strong>No sale orders found</strong></div>}
        {!loading && !error && visibleOrders.length > 0 && <div className="table-wrap"><table><thead><tr><th>Order ID</th><th>Customer</th><th>Status</th><th>Payment</th><th>Items</th><th>Total</th></tr></thead><tbody>
          {visibleOrders.map((order) => {
            const label = statusLabel(order);
            return <tr key={order.id}><td><strong>ORD-{order.id}</strong><small>{dateText(order.created_at)}</small></td><td>{order.customer_name || order.customer_phone || 'Walk-in Sale'}</td><td><span className={`status-pill ${statusTone(label)}`}>{label}</span></td><td>{order.payment_mode || '-'}</td><td>{order.products_summary || `${order.product_count || 0} items`}</td><td>{money(order.total_amount)}</td></tr>;
          })}
        </tbody></table></div>}
      </section>
      <section className="panel">
        <div className="panel-title"><i className="bi bi-receipt-cutoff" /><div><h2>Order summary</h2><p>Checkout health from real orders.</p></div></div>
        <div className="side-card-list">
          <Summary label="Completed" value={`${stats.completedPercent}%`} />
          <Summary label="Credit orders" value={`${stats.creditPercent}%`} />
          <Summary label="Refund / return" value={`${stats.returnPercent}%`} />
          <Summary label="Return records" value={number(returns.length)} />
        </div>
      </section>
    </div>
  </div>;
}

function OrderDetailPage({ orderId }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!orderId) return;
    let active = true;
    setLoading(true);
    setError('');
    api.order(orderId).then((response) => {
      if (active) setDetail(unwrap(response)?.order || unwrap(response));
    }).catch((requestError) => {
      if (active) setError(requestError?.response?.data?.message || requestError?.response?.data?.error || 'Unable to load order detail.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [orderId]);

  return <div className="page-stack">
    <div className="page-header"><div><span className="eyebrow">Sales</span><h1>Order Detail</h1><p>Latest real sale order with item, payment and return balances.</p></div></div>
    {!orderId && <section className="panel dashboard-state"><strong>No sale order available</strong></section>}
    {loading && <section className="panel dashboard-state"><strong>Loading order...</strong></section>}
    {!loading && error && <section className="panel dashboard-state dashboard-error"><strong>{error}</strong></section>}
    {!loading && detail && <section className="panel">
      <div className="panel-title"><i className="bi bi-receipt" /><div><h2>ORD-{detail.id}</h2><p>{detail.customer?.name || detail.customer_phone || 'Walk-in Sale'} / {dateText(detail.created_at)}</p></div></div>
      <div className="side-card-list">
        <Summary label="Total" value={money(detail.total_amount)} />
        <Summary label="Paid" value={money(detail.total_paid)} />
        <Summary label="Balance" value={money(detail.balance)} />
        <Summary label="Payment" value={detail.payment_mode || '-'} />
      </div>
      <div className="table-wrap"><table><thead><tr><th>Product</th><th>Qty</th><th>Rate</th><th>GST</th><th>Total</th></tr></thead><tbody>{(detail.items || []).map((item) => <tr key={item.product_id}><td><strong>{item.product_name}</strong><small>Returned {number(item.returned_quantity)}</small></td><td>{number(item.quantity)}</td><td>{money(item.selling_price)}</td><td>{number(item.gst_percent)}%</td><td>{money(item.line_total)}</td></tr>)}</tbody></table></div>
    </section>}
  </div>;
}

function ReturnsSummaryPage({ returns, loading, error, onRefresh }) {
  const total = returns.reduce((sum, row) => sum + Number(row.refundAmount || 0), 0);
  return <div className="page-stack">
    <div className="page-header"><div><span className="eyebrow">Sales</span><h1>Returns Summary</h1><p>Real refund and return records from Central.</p></div><button type="button" className="secondary-btn" onClick={onRefresh}><i className="bi bi-arrow-clockwise" /> Refresh</button></div>
    <div className="metric-grid"><Metric label="Returns" value={number(returns.length)} tone="warn" /><Metric label="Refund amount" value={money(total)} tone="warn" /><Metric label="Average refund" value={money(returns.length ? total / returns.length : 0)} tone="info" /></div>
    <section className="panel">
      <div className="panel-title"><i className="bi bi-arrow-counterclockwise" /><div><h2>Recent returns</h2><p>Returned sales linked back to original order ids.</p></div></div>
      {loading && <div className="dashboard-state compact"><strong>Loading returns...</strong></div>}
      {!loading && error && <div className="dashboard-state compact dashboard-error"><strong>{error}</strong></div>}
      {!loading && !error && returns.length === 0 && <div className="dashboard-state compact"><strong>No returns found</strong></div>}
      {!loading && !error && returns.length > 0 && <div className="table-wrap"><table><thead><tr><th>Return</th><th>Order</th><th>Date</th><th>Mode</th><th>Reason</th><th>Amount</th></tr></thead><tbody>{returns.map((row) => <tr key={row.returnId || row.returnDbId}><td><strong>{row.returnId || row.returnDbId}</strong></td><td>ORD-{row.originalBillId}</td><td>{dateText(row.date)}</td><td>{row.refundMode || '-'}</td><td>{row.reason || '-'}</td><td>{money(row.refundAmount)}</td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}

function Metric({ label, value, tone }) {
  return <div className={`metric-card tone-${tone}`}><i className="bi bi-receipt" /><div><span>{label}</span><strong>{value}</strong></div></div>;
}

function Summary({ label, value }) {
  return <div className="summary-line"><span>{label}</span><strong>{value}</strong></div>;
}

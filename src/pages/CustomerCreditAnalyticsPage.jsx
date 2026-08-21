import React, { useEffect, useMemo, useState } from 'react';
import { api, unwrap } from '../lib/api';
import '../styles/dashboard.css';

const currency = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(numeric);
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function CustomerCreditAnalyticsPage() {
  const [page, setPage] = useState(1);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api.customerOutstandingReport({ page, limit: 50 }).then((response) => {
      if (!active) return;
      setReport(unwrap(response));
    }).catch((requestError) => {
      if (!active) return;
      setReport(null);
      setError(requestError?.response?.data?.message || 'Unable to load canonical customer outstanding balances.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [page, refreshKey]);

  const customers = Array.isArray(report?.customers) ? report.customers : [];
  const pagination = report?.pagination || {};
  const totalCustomers = Number(pagination.total || 0);
  const totalPages = Math.max(1, Number(pagination.total_pages || pagination.totalPages || 1));
  const highestOutstanding = customers[0]?.current_balance;

  const cards = useMemo(() => [
    { label: 'Customers with outstanding', value: totalCustomers.toLocaleString('en-IN'), icon: 'bi-people' },
    { label: 'Highest outstanding', value: highestOutstanding === undefined ? '—' : currency(highestOutstanding), icon: 'bi-cash-stack' },
  ], [totalCustomers, highestOutstanding]);

  return <div className="page-stack dashboard-page">
    <div className="page-header dashboard-header">
      <div>
        <span className="eyebrow">Canonical customer credit</span>
        <h1>Customers & Credit</h1>
        <p>Outstanding customer balances from Central/PostgreSQL. RetailHub presents the canonical customer projection without rebuilding debt from orders or payments.</p>
      </div>
      <button className="secondary-btn" onClick={() => setRefreshKey((value) => value + 1)} disabled={loading}>
        <i className="bi bi-arrow-clockwise" /> Refresh
      </button>
    </div>

    <section className="panel dashboard-filters" aria-label="Customer credit authority">
      <div className="dashboard-authority-note">
        <i className="bi bi-database-check" />
        <div>
          <strong>Authority: Central customer outstanding report</strong>
          <span>RetailHub reads `/reports/customers-outstanding`; customer `current_balance` and `credit_limit` remain canonical PostgreSQL facts.</span>
        </div>
      </div>
    </section>

    {loading && <section className="panel dashboard-state" role="status"><i className="bi bi-hourglass-split" /><strong>Loading customer credit…</strong><span>Reading canonical outstanding balances from Central.</span></section>}
    {!loading && error && <section className="panel dashboard-state dashboard-error" role="alert"><i className="bi bi-exclamation-triangle" /><strong>Customer credit unavailable</strong><span>{error}</span><button className="secondary-btn" onClick={() => setRefreshKey((value) => value + 1)}>Retry Central report</button></section>}
    {!loading && !error && customers.length === 0 && <section className="panel dashboard-state"><i className="bi bi-check2-circle" /><strong>No customer outstanding</strong><span>Central currently reports no customers with a positive outstanding balance.</span></section>}

    {!loading && !error && customers.length > 0 && <>
      <div className="metric-grid">{cards.map((card) => <div className="metric-card tone-info" key={card.label}><i className={`bi ${card.icon}`} /><div><span>{card.label}</span><strong>{card.value}</strong></div></div>)}</div>

      <section className="panel">
        <div className="panel-title"><i className="bi bi-person-lines-fill" /><div><h2>Outstanding customers</h2><p>Sorted by canonical outstanding balance, highest first.</p></div></div>
        <div className="page-stack">
          {customers.map((customer) => <div className="dashboard-scope-note" key={customer.id}>
            <i className={`bi ${customer.is_active === false ? 'bi-person-x' : 'bi-person-check'}`} />
            <div>
              <strong>{customer.name || `Customer ${customer.id}`}</strong>
              <span>{customer.phone || 'No phone'} · Updated {formatDate(customer.updated_at)}</span>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
              <strong>{currency(customer.current_balance)}</strong>
              <span>Credit limit {currency(customer.credit_limit)}</span>
            </div>
          </div>)}
        </div>
      </section>

      <section className="panel dashboard-filters" aria-label="Customer outstanding pagination">
        <button className="secondary-btn" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={loading || page <= 1}><i className="bi bi-chevron-left" /> Previous</button>
        <div className="dashboard-authority-note"><i className="bi bi-list-ol" /><div><strong>Page {page} of {totalPages}</strong><span>{totalCustomers.toLocaleString('en-IN')} customers with outstanding balances; result pages are bounded by Central.</span></div></div>
        <button className="secondary-btn" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={loading || page >= totalPages}>Next <i className="bi bi-chevron-right" /></button>
      </section>

      <section className="panel dashboard-scope-note"><i className="bi bi-info-circle" /><div><strong>Migration slice 5</strong><span>This replaces POS management-level customer credit analytics after acceptance. Payments and refunds are the next family.</span></div></section>
    </>}
  </div>;
}

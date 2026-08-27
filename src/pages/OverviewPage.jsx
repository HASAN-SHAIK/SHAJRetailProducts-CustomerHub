import React from 'react';

const kpis = [
  { label: 'Revenue', value: '₹12.48L', change: '+12.4%', tone: 'good' },
  { label: 'Orders', value: '1,248', change: '+3.1%', tone: 'good' },
  { label: 'Average Order', value: '₹1,000', change: '-0.8%', tone: 'bad' },
  { label: 'Customers', value: '876', change: '+5.2%', tone: 'good' },
  { label: 'Expenses', value: '₹2.42L', change: 'Watch', tone: 'warn' },
];

const stores = [
  { name: 'Downtown', value: 92, tone: 'good' },
  { name: 'West End', value: 78, tone: 'good' },
  { name: 'Metro Mall', value: 64, tone: 'warn' },
];

const activities = [
  'New wholesale customer added',
  'Downtown stock transfer completed',
  'Expense approval pending',
  'Branch B exceeded weekly target',
];

export default function OverviewPage() {
  return <div className="overview-screen">
    <div className="overview-title">
      <div className="breadcrumb"><span>Dashboard</span><i className="bi bi-chevron-right" /><span>Overview</span></div>
      <h1>Good morning, Hasan.</h1>
      <p>Here&apos;s what&apos;s happening across your business today.</p>
    </div>

    <section className="ai-brief-card">
      <div className="brief-icon"><i className="bi bi-phone" /></div>
      <div className="brief-copy">
        <strong>AI Business Brief · Updated 6 min ago</strong>
        <p>Revenue increased primarily because repeat purchases grew at the Downtown location. Stock of Product A is running low and Branch B&apos;s expenses are trending above plan.</p>
      </div>
      <div className="brief-attention">
        <strong>3 THINGS NEED ATTENTION</strong>
        <ul>
          <li className="bad">Product A stock low</li>
          <li className="warn">Branch B expenses high</li>
          <li>42 inactive VIPs</li>
        </ul>
        <button>Review Recommendations</button>
      </div>
    </section>

    <div className="overview-main-grid">
      <section className="overview-card lead-sales-card">
        <div className="card-heading">
          <div><h2>Lead Sales Performance</h2><p>Daily revenue vs. last week · last 14 days</p></div>
          <div className="chart-legend"><span><b className="dot green" />This week</span><span><b className="dot gray" />Last week</span></div>
        </div>
        <RevenueChart />
      </section>

      <section className="overview-card store-card">
        <div className="card-heading"><div><h2>Store Performance</h2><p>Weekly sales target completion</p></div></div>
        <div className="store-list">
          {stores.map((store) => <div className="store-row" key={store.name}>
            <div><span>{store.name}</span><strong>{store.value}%</strong></div>
            <div className="progress-track"><span className={store.tone} style={{ width: `${store.value}%` }} /></div>
          </div>)}
        </div>
        <button className="wide-secondary">View All Stores</button>
      </section>
    </div>

    <div className="overview-kpi-row">
      {kpis.map((kpi) => <section className="overview-kpi" key={kpi.label}>
        <div className="kpi-label"><i className="bi bi-square" />{kpi.label}</div>
        <strong>{kpi.value}</strong>
        <span className={`kpi-change ${kpi.tone}`}>{kpi.change}</span>
      </section>)}
    </div>

    <div className="overview-bottom-grid">
      <section className="overview-card">
        <div className="card-heading">
          <div><h2>Cash Flow</h2><p>Daily income vs. operating expenses</p></div>
          <div className="chart-legend"><span><b className="dot green" />Income</span><span><b className="dot red" />Expense</span></div>
        </div>
        <CashFlowChart />
      </section>

      <section className="overview-card activity-card">
        <div className="card-heading"><div><h2>Recent Activity</h2><p>Latest business events</p></div><i className="bi bi-three-dots" /></div>
        <div className="activity-list">
          {activities.map((activity, index) => <div className="activity-row" key={activity}>
            <span>{index + 1}</span>
            <p>{activity}</p>
          </div>)}
        </div>
      </section>
    </div>
  </div>;
}

function RevenueChart() {
  return <svg className="overview-line-chart" viewBox="0 0 720 285" role="img" aria-label="Revenue line chart">
    <path className="overview-grid" d="M52 40H694M52 100H694M52 160H694M52 220H694M160 18V245M280 18V245M400 18V245M520 18V245M640 18V245" />
    <g className="axis-labels y"><text x="8" y="44">70k</text><text x="8" y="104">60k</text><text x="8" y="164">50k</text><text x="8" y="224">40k</text></g>
    <g className="axis-labels x"><text x="52" y="268">Mon</text><text x="158" y="268">Tue</text><text x="278" y="268">Wed</text><text x="398" y="268">Thu</text><text x="518" y="268">Fri</text><text x="638" y="268">Sat</text><text x="688" y="268">Sun</text></g>
    <path className="last-week-line" d="M52 230 C150 220 210 226 280 196 S410 225 468 162 S585 176 694 136" />
    <path className="this-week-line" d="M52 205 C135 160 185 160 250 184 S345 180 402 95 S512 145 575 55 S650 50 694 68" />
  </svg>;
}

function CashFlowChart() {
  return <svg className="cash-flow-chart" viewBox="0 0 720 170" role="img" aria-label="Cash flow chart">
    <path className="overview-grid" d="M36 28H690M36 78H690M36 128H690M135 14V145M250 14V145M365 14V145M480 14V145M595 14V145" />
    <path className="cash-income" d="M42 120 C130 70 210 112 285 68 S405 76 470 38 S590 58 685 30" />
    <path className="cash-expense" d="M42 136 C145 126 220 145 300 112 S405 130 505 98 S610 112 685 82" />
  </svg>;
}

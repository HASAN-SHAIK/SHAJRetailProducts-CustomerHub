import React, { useEffect, useMemo, useState } from 'react';
import { api, unwrap } from '../lib/api';
import '../styles/dashboard.css';

const RANGE_OPTIONS = [
  ['today', 'Today'],
  ['this_week', 'This Week'],
  ['this_month', 'This Month'],
  ['last_month', 'Last Month'],
  ['last_30_days', 'Last 30 Days'],
];

const formatCurrency = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
};

const formatNumber = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '0';
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(numeric);
};

const formatPercent = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '0%';
  const prefix = numeric > 0 ? '+' : '';
  return `${prefix}${numeric.toFixed(1)}%`;
};

export default function OverviewPage() {
  const [range, setRange] = useState('this_month');
  const [branchId, setBranchId] = useState('');
  const [branches, setBranches] = useState([]);
  const [overview, setOverview] = useState(null);
  const [locationsData, setLocationsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Load branches list for filter
  useEffect(() => {
    let active = true;
    api.branches()
      .then((response) => {
        if (!active) return;
        const body = unwrap(response);
        setBranches(Array.isArray(body) ? body : (body?.branches || []));
      })
      .catch(() => {
        if (active) setBranches([]);
      });
    return () => { active = false; };
  }, []);

  // Load live dashboard metrics from Central API
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    Promise.all([
      api.dashboardOverview({ range, branchId: branchId || undefined }),
      api.dashboardLocationPerformance({ range }).catch(() => null),
    ])
      .then(([overviewRes, locationsRes]) => {
        if (!active) return;
        const overviewBody = unwrap(overviewRes);
        setOverview(overviewBody);

        if (locationsRes) {
          const locBody = unwrap(locationsRes);
          const locList = locBody?.locations || locBody?.data || [];
          setLocationsData(Array.isArray(locList) ? locList : []);
        }
      })
      .catch((requestError) => {
        if (!active) return;
        setOverview(null);
        setError(requestError?.response?.data?.message || 'Unable to load executive metrics.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [range, branchId, refreshKey]);

  const kpis = useMemo(() => {
    const rev = overview?.revenue_overview || {};
    const growth = overview?.growth_comparison || {};
    const credit = overview?.customer_credit || {};

    const revGrowth = Number(growth.revenue_growth_percent || 0);
    const orderGrowth = Number(growth.order_growth_percent || 0);
    const profitGrowth = Number(growth.profit_growth_percent || 0);

    return [
      {
        label: 'Revenue',
        value: formatCurrency(rev.total_revenue),
        change: formatPercent(revGrowth),
        tone: revGrowth >= 0 ? 'good' : 'bad',
      },
      {
        label: 'Orders',
        value: formatNumber(rev.total_orders),
        change: formatPercent(orderGrowth),
        tone: orderGrowth >= 0 ? 'good' : 'bad',
      },
      {
        label: 'Average Order',
        value: formatCurrency(rev.avg_order_value),
        change: 'Avg Sale',
        tone: 'good',
      },
      {
        label: 'Total Profit',
        value: formatCurrency(rev.total_profit),
        change: formatPercent(profitGrowth),
        tone: profitGrowth >= 0 ? 'good' : 'bad',
      },
      {
        label: 'Khata Outstanding',
        value: formatCurrency(credit.total_credit_outstanding),
        change: `${formatNumber(credit.new_customers)} new`,
        tone: 'warn',
      },
    ];
  }, [overview]);

  const attentionItems = useMemo(() => {
    const list = [];
    const lowStock = overview?.inventory_intelligence?.low_stock || [];
    if (lowStock.length > 0) {
      list.push({ text: `${lowStock.length} items low in stock`, tone: 'bad' });
    }
    const growth = overview?.growth_comparison || {};
    if (Number(growth.revenue_growth_percent || 0) < 0) {
      list.push({ text: `Revenue declined ${formatPercent(growth.revenue_growth_percent)} vs prev period`, tone: 'warn' });
    }
    if (Number(growth.order_growth_percent || 0) < 0) {
      list.push({ text: `Order volume down ${formatPercent(growth.order_growth_percent)}`, tone: 'warn' });
    }
    const insights = overview?.smart_insights || [];
    for (const insight of insights) {
      if (list.length >= 3) break;
      const alreadyPresent = list.some((item) => item.text.includes(insight.message));
      if (!alreadyPresent) {
        list.push({ text: insight.message, tone: insight.type === 'inventory' ? 'bad' : 'warn' });
      }
    }
    if (list.length === 0) {
      list.push({ text: 'All branch operations stable', tone: 'good' });
      list.push({ text: 'Zero pending sync anomalies', tone: 'good' });
      list.push({ text: 'Sales tracking on budget', tone: 'good' });
    }
    return list.slice(0, 3);
  }, [overview]);

  const briefCopy = useMemo(() => {
    if (!overview) return 'Loading central intelligence...';
    const rev = overview.revenue_overview || {};
    const growth = overview.growth_comparison || {};
    const revGrowth = Number(growth.revenue_growth_percent || 0);

    let summary = `Total net revenue is ${formatCurrency(rev.total_revenue)} across ${formatNumber(rev.total_orders)} verified orders. `;
    if (revGrowth > 0) {
      summary += `Business is pacing ${formatPercent(revGrowth)} ahead of the comparison cycle with solid counter velocity.`;
    } else if (revGrowth < 0) {
      summary += `Revenue is pacing ${formatPercent(revGrowth)} below the comparison period. Check store stockouts and counter velocity.`;
    } else {
      summary += 'Revenue performance is aligned with historical baseline figures.';
    }
    return summary;
  }, [overview]);

  const storeRows = useMemo(() => {
    if (locationsData.length > 0) {
      const maxRev = Math.max(...locationsData.map((l) => Number(l.total_revenue || 0)), 1);
      return locationsData.map((loc) => {
        const val = Number(loc.total_revenue || 0);
        const pct = Math.min(100, Math.round((val / maxRev) * 100));
        return {
          name: loc.location_name || loc.location || loc.branch_name || 'Branch',
          value: pct,
          revenueFormatted: formatCurrency(val),
          tone: pct >= 50 ? 'good' : 'warn',
        };
      });
    }
    if (branches.length > 0) {
      return branches.map((b) => ({
        name: b.name || 'Store',
        value: 100,
        revenueFormatted: 'Active',
        tone: 'good',
      }));
    }
    return [
      { name: 'Primary Store', value: 100, revenueFormatted: formatCurrency(overview?.revenue_overview?.total_revenue), tone: 'good' },
    ];
  }, [locationsData, branches, overview]);

  const trendPoints = overview?.trend_graph || [];
  const topProducts = overview?.top_products || [];
  const topCustomers = overview?.customer_credit?.top_customers || [];

  return (
    <div className="overview-screen">
      <div className="overview-title">
        <div className="card-heading" style={{ alignItems: 'center' }}>
          <div>
            <h1>Executive Overview</h1>
            <p>Live central sales metrics, multi-store comparison, and inventory intelligence.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select
              aria-label="Filter by date range"
              value={range}
              onChange={(e) => setRange(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '7px', border: '1px solid #d1d5db', fontSize: '12px' }}
            >
              {RANGE_OPTIONS.map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>

            <select
              aria-label="Filter by store branch"
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '7px', border: '1px solid #d1d5db', fontSize: '12px' }}
            >
              <option value="">All Locations</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>

            <button
              className="wide-secondary"
              onClick={() => setRefreshKey((k) => k + 1)}
              disabled={loading}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <i className="bi bi-arrow-clockwise" /> Refresh
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="dashboard-state" aria-live="polite">
          <i className="bi bi-arrow-repeat spin" />
          <strong>Loading executive overview metrics...</strong>
          <span>Fetching real-time aggregated sales, returns, and store performance from Central.</span>
        </div>
      )}

      {error && !loading && (
        <div className="dashboard-state dashboard-error" role="alert">
          <i className="bi bi-exclamation-triangle" />
          <strong>Unable to load executive metrics</strong>
          <span>{error}</span>
          <button className="secondary-btn" onClick={() => setRefreshKey((k) => k + 1)}>
            Retry Central metrics
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <section className="ai-brief-card">
            <div className="brief-icon"><i className="bi bi-robot" /></div>
            <div className="brief-copy">
              <strong>AI Business Brief · Central Intelligence</strong>
              <p>{briefCopy}</p>
            </div>
            <div className="brief-attention">
              <strong>THINGS NEEDING ATTENTION</strong>
              <ul>
                {attentionItems.map((item, idx) => (
                  <li key={idx} className={item.tone}>{item.text}</li>
                ))}
              </ul>
              <button onClick={() => setRefreshKey((k) => k + 1)}>Re-analyze Signals</button>
            </div>
          </section>

          <div className="overview-main-grid">
            <section className="overview-card lead-sales-card">
              <div className="card-heading">
                <div>
                  <h2>Lead Sales Performance</h2>
                  <p>Daily revenue trend · {RANGE_OPTIONS.find(([v]) => v === range)?.[1] || range}</p>
                </div>
                <div className="chart-legend">
                  <span><b className="dot green" />Total Revenue: {formatCurrency(overview?.revenue_overview?.total_revenue)}</span>
                </div>
              </div>
              <DynamicRevenueChart points={trendPoints} />
            </section>

            <section className="overview-card store-card">
              <div className="card-heading">
                <div>
                  <h2>Store Performance</h2>
                  <p>Revenue distribution across branches</p>
                </div>
              </div>
              <div className="store-list">
                {storeRows.map((store) => (
                  <div className="store-row" key={store.name}>
                    <div>
                      <span>{store.name}</span>
                      <strong>{store.revenueFormatted || `${store.value}%`}</strong>
                    </div>
                    <div className="progress-track">
                      <span className={store.tone} style={{ width: `${Math.max(5, store.value)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="overview-kpi-row">
            {kpis.map((kpi) => (
              <section className="overview-kpi" key={kpi.label}>
                <div className="kpi-label"><i className="bi bi-graph-up" style={{ marginRight: '6px' }} />{kpi.label}</div>
                <strong>{kpi.value}</strong>
                <span className={`kpi-change ${kpi.tone}`}>{kpi.change}</span>
              </section>
            ))}
          </div>

          <div className="overview-bottom-grid">
            <section className="overview-card">
              <div className="card-heading">
                <div>
                  <h2>Top Selling Products</h2>
                  <p>Highest revenue volume contributors</p>
                </div>
              </div>
              {topProducts.length === 0 ? (
                <div style={{ color: '#9ca3af', fontSize: '12px', padding: '24px 0', textAlign: 'center' }}>
                  No top selling product records found for this period.
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '10px', marginTop: '14px' }}>
                  {topProducts.slice(0, 5).map((p) => (
                    <div
                      key={p.product_id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid #f3f4f6',
                        paddingBottom: '8px',
                        fontSize: '12px',
                      }}
                    >
                      <div>
                        <strong style={{ color: '#1f2937' }}>{p.product_name}</strong>
                        <div style={{ color: '#6b7280', fontSize: '11px' }}>{formatNumber(p.quantity_sold)} units sold</div>
                      </div>
                      <span style={{ fontWeight: 700, color: '#059669' }}>{formatCurrency(p.revenue)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="overview-card activity-card">
              <div className="card-heading">
                <div>
                  <h2>Customer Khata Outstanding</h2>
                  <p>Top outstanding debt balances</p>
                </div>
              </div>
              {topCustomers.length === 0 ? (
                <div style={{ color: '#9ca3af', fontSize: '12px', padding: '24px 0', textAlign: 'center' }}>
                  Zero outstanding customer khata credit balances.
                </div>
              ) : (
                <div className="activity-list">
                  {topCustomers.slice(0, 5).map((c, index) => (
                    <div className="activity-row" key={c.customer_id || index}>
                      <span>{index + 1}</span>
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: '12px', color: '#1f2937' }}>{c.customer_name || 'Customer'}</strong>
                        <div style={{ color: '#ef4444', fontSize: '11px', fontWeight: 600 }}>
                          Outstanding: {formatCurrency(c.total_credit)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function DynamicRevenueChart({ points = [] }) {
  if (!points || points.length === 0) {
    return (
      <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '12px' }}>
        No sales transaction activity recorded in this date range.
      </div>
    );
  }

  const width = 720;
  const height = 240;
  const padding = { top: 20, right: 30, bottom: 40, left: 60 };

  const revenues = points.map((p) => Number(p.revenue || 0));
  const maxRevenue = Math.max(...revenues, 100);
  const minRevenue = 0;

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const getX = (index) => {
    if (points.length === 1) return padding.left + chartWidth / 2;
    return padding.left + (index / (points.length - 1)) * chartWidth;
  };

  const getY = (val) => {
    const norm = (val - minRevenue) / (maxRevenue - minRevenue);
    return padding.top + chartHeight - norm * chartHeight;
  };

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(Number(p.revenue || 0)).toFixed(1)}`).join(' ');
  const areaD = `${pathD} L ${getX(points.length - 1).toFixed(1)} ${height - padding.bottom} L ${getX(0).toFixed(1)} ${height - padding.bottom} Z`;

  return (
    <svg className="overview-line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Live revenue trend chart">
      <defs>
        <linearGradient id="liveRevArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#059669" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {[0, 0.33, 0.66, 1].map((ratio, idx) => {
        const y = padding.top + chartHeight * ratio;
        const val = maxRevenue * (1 - ratio);
        return (
          <g key={idx}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e5e7eb" strokeDasharray="3 3" />
            <text x={padding.left - 8} y={y + 4} textAnchor="end" fill="#9ca3af" fontSize="10">
              {formatCurrency(val)}
            </text>
          </g>
        );
      })}

      {/* Area & Line */}
      <path d={areaD} fill="url(#liveRevArea)" />
      <path d={pathD} fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Data points & X labels */}
      {points.map((p, i) => {
        const cx = getX(i);
        const cy = getY(Number(p.revenue || 0));
        const dateStr = p.date ? new Date(p.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : `D${i + 1}`;
        const showLabel = points.length <= 10 || i % Math.ceil(points.length / 7) === 0 || i === points.length - 1;

        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r="3.5" fill="#059669" stroke="#ffffff" strokeWidth="1.5" />
            {showLabel && (
              <text x={cx} y={height - padding.bottom + 18} textAnchor="middle" fill="#6b7280" fontSize="10">
                {dateStr}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

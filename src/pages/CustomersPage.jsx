import React from 'react';

const purchases = [
  { id: '#10421', date: 'Oct 24, 2023 - 11:30 AM', items: '3 items', total: 'Rs 4,200' },
  { id: '#10385', date: 'Oct 12, 2023 - 4:15 PM', items: '1 item', total: 'Rs 18,500' },
];

const tabs = ['Overview', 'Purchase History', 'Loyalty & Rewards', 'AI Insights', 'Activity Feed'];

export default function CustomersPage() {
  return <div className="customer-profile-screen">
    <section className="customer-hero">
      <div className="customer-identity">
        <div className="customer-photo-wrap">
          <img
            className="customer-photo"
            src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80"
            alt="Ananya Sharma"
          />
          <span className="photo-device"><i className="bi bi-phone" /></span>
        </div>
        <div className="customer-title-block">
          <div className="name-row">
            <h1>Ananya Sharma</h1>
            <span className="elite-badge">Gold Elite</span>
          </div>
          <div className="customer-meta">
            <span><i className="bi bi-square" /> ananya.s@example.com</span>
            <span><i className="bi bi-square" /> +91 98765 43210</span>
            <span><i className="bi bi-square" /> CUST-8421</span>
          </div>
          <div className="customer-stats">
            <Stat label="Lifetime Value" value="Rs 1,24,580" />
            <Stat label="Total Orders" value="42" />
            <Stat label="Last Visit" value="2 days ago" />
          </div>
        </div>
      </div>
      <div className="quick-actions">
        <button>Add Note</button>
        <button>Add Loyalty Points</button>
        <button>Create Special Offer</button>
      </div>
    </section>

    <nav className="profile-tabs" aria-label="Customer profile sections">
      {tabs.map((tab, index) => <button className={index === 0 ? 'active' : ''} key={tab}>{tab}</button>)}
    </nav>

    <div className="customer-profile-grid">
      <main className="profile-main-column">
        <section className="customer-ai-card">
          <div className="brief-icon"><i className="bi bi-phone" /></div>
          <div className="ai-copy">
            <h2>AI Customer Brief</h2>
            <p>Ananya is a <strong>High-Value Loyalist</strong> who primarily shops at the Downtown branch on weekends. She shows a 82% preference for Premium Skin Care and Accessories. Her average spend is 3.4x higher than your typical customer.</p>
            <div className="ai-signal-grid">
              <div><span>Predicted Next Purchase</span><strong>Within 10-12 days</strong></div>
              <div><span>Churn Risk</span><strong className="success-text">Very Low (4%)</strong></div>
            </div>
          </div>
        </section>

        <section className="customer-card recent-purchases">
          <div className="customer-card-head">
            <h2>Recent Purchases</h2>
            <button>View all</button>
          </div>
          <div className="purchase-list">
            {purchases.map((purchase) => <div className="purchase-row" key={purchase.id}>
              <div><strong>Order {purchase.id}</strong><span>{purchase.date}</span></div>
              <span>{purchase.items}</span>
              <strong>{purchase.total}</strong>
              <span className="completed-pill">Completed</span>
            </div>)}
          </div>
        </section>

        <section className="customer-card spending-card">
          <h2>Spending Distribution</h2>
          <div className="spending-chart-wrap">
            <div className="semi-donut" aria-label="Spending distribution chart">
              <span className="donut-hole" />
            </div>
            <span className="chart-label accessories">Accessories<br />25%</span>
            <span className="chart-label skincare">Skin Care<br />45%</span>
          </div>
        </section>
      </main>

      <aside className="profile-side-column">
        <section className="side-panel loyalty-panel">
          <h2>Loyalty Progress</h2>
          <div className="points-row"><span>Current Points</span><strong>4,820</strong></div>
          <div className="loyalty-track"><span style={{ width: '76%' }} /></div>
          <p>Only <strong>180 points</strong> more to unlock <em>Platinum Status</em></p>
        </section>

        <section className="side-panel offer-panel">
          <h2>Active Offers (2)</h2>
          <div className="offer-card anniversary"><strong>15% Anniversary Off</strong><span>Expires in 4 days</span></div>
          <div className="offer-card sample"><strong>Free Gift: Luxury Sample</strong><span>Valid on orders &gt; Rs 5,000</span></div>
        </section>

        <section className="side-panel notes-panel">
          <div className="side-panel-head"><h2>Staff Notes</h2><button>New</button></div>
          <blockquote>"Prefers evening visits. Always asks for Sarah at the fragrance counter."</blockquote>
          <p>- Amit, Oct 18</p>
        </section>

        <dl className="customer-facts">
          <div><dt>Branch Association</dt><dd>Downtown (Primary)</dd></div>
          <div><dt>Customer Since</dt><dd>Jan 12, 2021</dd></div>
          <div><dt>Last Modified</dt><dd>2 days ago by System</dd></div>
        </dl>
      </aside>
    </div>
  </div>;
}

function Stat({ label, value }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

import React from 'react';
import ConfigurationPage from './ConfigurationPage';
import '../styles/dashboard.css';

export default function InventoryPoliciesPage() {
  return <>
    <ConfigurationPage kind="inventory" />
    <section className="panel dashboard-scope-note" aria-label="Inventory policy authority boundaries">
      <i className="bi bi-shield-check" />
      <div>
        <strong>Inventory policy authority</strong>
        <span>These settings flow through the existing System → Business → Store → POS effective-configuration hierarchy. They control runtime policy only; they do not directly change product stock, batches, purchases, returns, or audited stock-adjustment facts.</span>
      </div>
    </section>
    <section className="panel">
      <div className="panel-title"><i className="bi bi-diagram-3" /><div><h2>Safe inheritance model</h2><p>Use the narrowest scope only when a store or POS genuinely differs from the business default.</p></div></div>
      <div className="content-grid two-one">
        <div className="dashboard-scope-note"><i className="bi bi-building" /><div><strong>Business default</strong><span>Set the normal inventory policy once for the tenant. Stores and POS devices inherit it unless an explicit override exists.</span></div></div>
        <div className="dashboard-scope-note"><i className="bi bi-shop" /><div><strong>Store / POS override</strong><span>Overrides remain explicit and resettable. Resetting removes the override and restores the effective parent value instead of copying stale settings.</span></div></div>
      </div>
    </section>
  </>;
}

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { findV1Section, flatV1Items } from '../config/v1Navigation';
import StatusBadge from '../components/StatusBadge';
import { PageHeader } from './BusinessPage';

export default function V1FeaturePage() {
  const location = useLocation();
  const section = findV1Section(location.pathname);
  const item = flatV1Items.find((entry) => entry.path === location.pathname) || section.items[0];
  const siblingItems = section.items.filter((entry) => entry.path !== item.path).slice(0, 8);

  return (
    <div className="page-stack">
      <PageHeader
        title={item.label}
        subtitle={`${section.label} - planned for a later release; not available yet.`}
        action={<StatusBadge status="contract" />}
      />
      <section className="panel">
        <div className="panel-title">
          <i className="bi bi-layout-text-window-reverse" />
          <div>
            <h2>Coming later</h2>
            <p>This workflow is not part of the current release. The route is reserved so navigation stays intact; no data is shown or changed here.</p>
          </div>
        </div>
        <div className="summary-cards">
          <div className="summary-card"><span>Section</span><strong>{section.label}</strong></div>
          <div className="summary-card"><span>Feature</span><strong>{item.label}</strong></div>
          <div className="summary-card"><span>Route</span><strong>{item.path}</strong></div>
          <div className="summary-card"><span>Status</span><strong>Coming later</strong></div>
        </div>
      </section>
      <section className="panel">
        <div className="table-head">
          <div>
            <h2>Related {section.label} features</h2>
            <p>Other workflows in this section.</p>
          </div>
        </div>
        <div className="chip-list">
          {siblingItems.map((entry) => (
            <Link className="feature-chip" to={entry.path} key={entry.path}>{entry.label}</Link>
          ))}
        </div>
      </section>
    </div>
  );
}

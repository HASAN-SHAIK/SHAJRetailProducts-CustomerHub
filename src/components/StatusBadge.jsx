import React from 'react';

const labels = { live: 'Live', partial: 'Partially live', contract: 'API contract ready', future: 'Future' };
export default function StatusBadge({ status = 'contract', compact = false }) {
  return <span className={`status-badge status-${status}${compact ? ' compact' : ''}`}>{labels[status] || status}</span>;
}

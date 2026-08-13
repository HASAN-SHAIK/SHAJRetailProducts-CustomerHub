export const moduleGroups = [
  { label: 'Operate', items: [
    { path: '/', label: 'Overview', icon: 'bi-grid-1x2', status: 'live' },
    { path: '/stores', label: 'Stores & Branches', icon: 'bi-shop', status: 'live' },
    { path: '/devices', label: 'POS & Devices', icon: 'bi-pc-display-horizontal', status: 'live' },
    { path: '/offline-sync', label: 'Offline & Sync', icon: 'bi-arrow-repeat', status: 'partial' }
  ]},
  { label: 'Configure', items: [
    { path: '/business', label: 'Business Profile', icon: 'bi-building', status: 'live' },
    { path: '/billing', label: 'Billing & Checkout', icon: 'bi-receipt', status: 'partial' },
    { path: '/inventory', label: 'Inventory Policies', icon: 'bi-box-seam', status: 'partial' },
    { path: '/receipts', label: 'Receipts & Printing', icon: 'bi-printer', status: 'live' },
    { path: '/tax', label: 'Tax & GST', icon: 'bi-percent', status: 'live' },
    { path: '/users', label: 'Users & Access', icon: 'bi-people', status: 'contract' },
    { path: '/payments', label: 'Payments', icon: 'bi-credit-card', status: 'contract' }
  ]},
  { label: 'Platform', items: [
    { path: '/integrations', label: 'Integrations', icon: 'bi-plug', status: 'contract' },
    { path: '/security', label: 'Security & Audit', icon: 'bi-shield-check', status: 'contract' },
    { path: '/notifications', label: 'Notifications', icon: 'bi-bell', status: 'contract' },
    { path: '/data', label: 'Data & Backup', icon: 'bi-database-check', status: 'contract' }
  ]},
  { label: 'Future', items: [
    { path: '/automation', label: 'Automation', icon: 'bi-lightning-charge', status: 'future' },
    { path: '/ai-insights', label: 'AI & Insights', icon: 'bi-stars', status: 'future' },
    { path: '/commerce', label: 'Commerce Channels', icon: 'bi-bag', status: 'future' },
    { path: '/developer', label: 'Developer & API', icon: 'bi-code-slash', status: 'future' }
  ]}
];

# SHAJ Retail Hub

Customer administration and operations control plane for SHAJTech Retail OS.

The Hub is separate from the cashier POS frontend and from SHAJTech's internal AdminDashboard. It is for business owners and managers to configure their business, stores, POS terminals and operational policies.

## Visual system

The UI follows the existing SHAJRetail Frontend design language: deep navy gradients, cyan and indigo accents, translucent dark panels, rounded controls, compact status pills and light/dark mode support.

## Live integrations

- Backend authentication
- application settings and business profile
- GST mode and default tax
- receipt paper width
- branches
- POS registration and deactivation
- POSService local health

## Product areas

Overview, Business Profile, Stores & Branches, POS & Devices, Offline & Sync, Billing & Checkout, Inventory Policies, Receipts & Printing, Tax & GST, Users & Access, Payments, Integrations, Security & Audit, Notifications, Data & Backup, Automation, AI & Insights, Commerce Channels and Developer/API.

Capabilities without a real service contract are labelled API contract ready or Future.

## Development

```bash
cp .env.example .env
npm install
npm run dev
```

See the docs folder for architecture, API contracts, feature matrix and roadmap.

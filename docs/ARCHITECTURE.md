# SHAJ Retail Hub Architecture

SHAJ Retail Hub is the customer control plane for SHAJTech Retail OS. It is separate from the cashier/front-office application, the store-local POSService, and the SHAJTech internal AdminDashboard.

## Configuration hierarchy

System defaults -> Tenant/Business -> Branch/Store -> POS/Device -> Effective configuration.

The central Backend should resolve effective configuration. POSService should cache the effective snapshot locally so checkout remains correct while offline.

## Responsibilities

- Central Backend: tenant identity, settings, branches, permissions, policies, audit and integrations.
- POSService: SQLite durability, local transactions, runtime health, sync state, backup and recovery.
- POS Frontend: cashier/store runtime consuming effective configuration.
- Customer Hub: customer-safe configuration, fleet management and operational health.
- AdminDashboard: SHAJTech internal onboarding, provisioning, subscriptions and support.

## Principles

1. No fake actions.
2. Offline-first configuration.
3. Scope-aware configuration and explicit inheritance.
4. Tenant isolation and least privilege.
5. Customer-friendly health summaries.
6. Reuse existing Backend APIs before adding duplicate endpoints.
7. Independent deployment.

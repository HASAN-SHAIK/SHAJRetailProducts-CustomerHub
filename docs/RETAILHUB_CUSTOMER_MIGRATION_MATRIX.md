# RetailHub Customer Management Migration Matrix

Status: IN PROGRESS

## Authority

- Central/PostgreSQL is authoritative for customer master data, canonical customer IDs, credit limit/current balance, order/payment history and management updates.
- RetailHub owns customer administration and management presentation.
- POS owns checkout-time search/select, offline cached customer projection, and architecture-approved lightweight capture needed to complete a sale while disconnected.
- RetailHub must not read POS SQLite for management views or recalculate balances/credit from browser state.

## Screen / API / Data ownership

| Capability | Current POS surface | Target | Canonical API/data | Decision |
| --- | --- | --- | --- | --- |
| Customer list/search | `/customers` | RetailHub `/customers` | `GET /v1/customers` | MOVE |
| Customer profile/detail | `/customers/:id` | RetailHub customer workspace | `GET /v1/customers/:id` | MOVE |
| Create customer | `/customers/new` | RetailHub customer workspace | `POST /v1/customers` | MOVE; POS keeps lightweight checkout capture only |
| Edit master profile | `/customers/:id/edit` | RetailHub customer workspace | `PUT /v1/customers/:id` | MOVE |
| Order/payment history | customer detail | RetailHub customer workspace | canonical detail response | MOVE |
| Credit limit/current balance | customer list/detail | RetailHub customer workspace | Central projection | MOVE; read-only at POS |
| Reorder/management workflow | `/customers/reorder` | RetailHub follow-up slice | Central customer/order facts | MOVE |
| Checkout customer search/select | billing flows | POS | POSService/local projection synced from Central | KEEP |
| Offline cached customer projection | local repository | POS | POS SQLite/cache projection | KEEP |
| Offline lightweight capture | checkout/customer capture | POS | durable POS customer sync/outbox | KEEP, bounded to sale execution |

## Acceptance before POS retirement

1. RetailHub list/search uses Central only and has Loading / Error+Retry / Empty / Data states.
2. RetailHub detail preserves canonical customer ID and presents Central-provided order/payment history.
3. RetailHub create/update uses Central APIs and never edits financial snapshot fields in browser-derived logic.
4. Tenant authorization remains inherited from authenticated Central tenant context; no caller-selected tenant/database authority.
5. RetailHub build and focused customer migration acceptance are green.
6. POS checkout-time lookup/select remains functional offline through POSService/local projection.
7. Only after 1–6 pass may the POS management routes be redirected/removed; checkout customer capability stays.

## Ordered implementation

1. RetailHub list/search + profile/detail + create/edit master profile.
2. Credit/history/loyalty/admin presentation using canonical Central fields/contracts.
3. Customer reorder/management follow-up where Central contract is adequate.
4. POS route/nav retirement while retaining billing lookup/select and lightweight offline capture.
5. Cross-repository customer migration release certification.

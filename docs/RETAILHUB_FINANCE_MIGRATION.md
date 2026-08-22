# RetailHub Finance migration authority matrix

## Domain boundary

RetailHub owns business-management finance UX. Central/PostgreSQL remains canonical. POS retains only store-execution cash/register actions required during selling and offline operation.

| Capability | Canonical authority | RetailHub | POS after migration |
| --- | --- | --- | --- |
| Expense register/history | Central PostgreSQL `expenses` | Manage/view/filter | Remove management reports |
| Expense create/update/delete | Central `/expenses` with `expenses:write` | Manage | Remove management forms |
| Expense daily/monthly reporting | Central `/expenses/daily`, `/expenses/monthly` | Analyze | Remove management reports |
| Staff-expense attribution | Canonical staff ID | Manage | No staff-profile management |
| Receipt/payment accounting entries | Central accounting APIs | Accounts area (next slice) | Retain only transaction-required store actions |
| Cash book / bank book / ledger / outstanding | Central accounting projection | Accounts area (next slice) | Remove management screens after acceptance |
| Opening setup | Central accounting state | Accounts/admin workflow to be migrated separately | Keep only until replacement is certified |
| Cash drawer / register execution | POSService/SQLite where offline-critical | Operational visibility only | KEEP |

## Expense acceptance

- Uses Central `/expenses` only; no POS SQLite or browser-local finance authority.
- Preserves Central permission checks (`expenses:read`, `expenses:write`).
- Preserves trusted branch scoping and canonical staff IDs.
- Distinguishes loading, error/retry, empty and data states.
- POS expense-management screens must not be retired until this RetailHub slice is merged and production build is green.

## Accounts next

Accounts remains a separate finance concept. Receipt/payment entries, cash book, bank book, ledger, outstanding and opening setup will be migrated using the existing Central accounting contracts before corresponding POS management routes are retired.

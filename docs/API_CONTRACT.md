# API Contract Map

## Backend APIs consumed now

- POST /auth/login
- POST /auth/refresh
- GET /auth/getLogin
- POST /auth/logout
- GET /settings/application
- PUT /settings/application
- GET /branches
- POST /branches
- GET /branches/:branchId/devices
- POST /branches/:branchId/devices/register
- PATCH /branches/:branchId/devices/:deviceId/deactivate
- GET /configuration/catalog
- GET /configuration/effective
- GET /configuration/scopes/:scopeType/:scopeId
- PUT /configuration/scopes/:scopeType/:scopeId
- DELETE /configuration/scopes/:scopeType/:scopeId/:settingKey
- GET /configuration/scopes/:scopeType/:scopeId/audit

## Effective configuration hierarchy

System defaults -> Tenant / Business -> Branch / Store -> POS / Device -> Effective configuration.

The configuration response includes a deterministic ETag/hash and per-setting source metadata. Existing tenant-level application settings remain backward-compatible with the Frontend through their current app_settings groups.

## POSService API consumed now

- GET /api/v1/health
- GET /api/v1/status
- GET /api/v1/config
- POST /api/v1/config/refresh

POSService pulls its machine-scoped configuration from Central using:

- GET /api/v1/sync/config/effective
- X-POS-Tenant-ID
- X-POS-Device-ID
- X-POS-Sync-Token
- If-None-Match / ETag

The last known-good effective configuration is persisted in SQLite and remains available during Central or network outages.

## Backend contracts required next

- User management, role templates and scoped permissions.
- Branch/device last-seen and version telemetry.
- POS configuration revision acknowledgement/fleet compliance.
- Integration registry and provider health.
- Notification preferences.
- Export and backup policy.

## POSService contracts required next

- GET /api/v1/sync/status
- POST /api/v1/sync/now
- GET /api/v1/devices
- GET /api/v1/backups/status
- GET /api/v1/version

Sensitive provider values should be write-only or masked after setup.

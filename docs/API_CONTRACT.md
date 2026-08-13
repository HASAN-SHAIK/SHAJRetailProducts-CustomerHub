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

## POSService API consumed now

- GET /api/v1/health

## Backend contracts required next

- Effective configuration schema, scoped updates, resolved config and revision history.
- User management, role templates and scoped permissions.
- Branch/device last-seen and version telemetry.
- Configuration revision acknowledgement.
- Integration registry and provider health.
- Settings audit history.
- Notification preferences.
- Export and backup policy.

## POSService contracts required next

- GET /api/v1/status
- GET /api/v1/sync/status
- POST /api/v1/sync/now
- GET /api/v1/devices
- GET /api/v1/backups/status
- POST /api/v1/config/reload
- GET /api/v1/version

Sensitive provider values should be write-only or masked after setup.

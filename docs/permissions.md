# Permissions Matrix (v1)

| Permission | owner | admin | member | viewer |
|---|---:|---:|---:|---:|
| organization:update | ✅ | ✅ | ❌ | ❌ |
| organization:billing.manage | ✅ | ❌ | ❌ | ❌ |
| members:read | ✅ | ✅ | ✅ | ✅ |
| members:invite | ✅ | ✅ | ❌ | ❌ |
| members:remove | ✅ | ✅ | ❌ | ❌ |
| members:role.update | ✅ | ✅ | ❌ | ❌ |
| app:use | ✅ | ✅ | ✅ | ❌ |
| admin:access | ❌ (platform scoped) | ❌ | ❌ | ❌ |

Notes:
- Platform admin permissions are separate from organization role permissions.
- UI visibility follows this table, but backend services are source of truth.

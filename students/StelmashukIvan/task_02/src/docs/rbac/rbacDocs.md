# RBAC Matrix

| Operation | Admin | User | Service |
| View users | Yes | No | No |
| Create user | Yes | No | No |
| View own user | Yes | Yes | No |
| Update own user | Yes | Yes | No |
| Delete user | Yes | No | No |
| View devices | Yes (all) | Yes (own) | No |
| Create device | Yes | Yes (own) | No |
| View device | Yes | Yes (own) | No |
| Update device | Yes | Yes (own) | No |
| Delete device | Yes | Yes (own) | No |
| View metrics | Yes | Yes (own devices) | No |
| Create metric | Yes | No | No |
| View metric | Yes | Yes (own) | No |
| Update metric | Yes | No | No |
| Delete metric | Yes | No | No |
| Create readings | Yes | Yes | Yes |
| View readings | Yes | Yes (own) | No |
| View alerts | Yes | Yes (own) | No |
| Create alert (manual) | Yes | No | No |
| Acknowledge alert | Yes | Yes (own) | No |
| View alert rules | Yes | Yes (own) | No |
| Create alert rule | Yes | No | No |
| Update alert rule | Yes | No | No |
| Delete alert rule | Yes | No | No |
| View tickets | Yes | Yes (own) | No |
| Create ticket | Yes | Yes | No |
| View ticket | Yes | Yes (own) | No |
| Update ticket | Yes | No | No |
| Delete ticket | Yes | No | No |
| View dashboard summary | Yes | Yes (own) | No |
| View system logs | Yes | No | No |

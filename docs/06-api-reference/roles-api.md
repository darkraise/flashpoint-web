# Roles & Permissions API

Manage role-based access control (RBAC).

## List Roles

`GET /api/roles` - Requires `roles.read` permission

Returns array of roles with id, name, description, priority, isSystem, createdAt, permissions array.

## List Permissions

`GET /api/roles/permissions` - Requires `roles.read` permission

Returns array of all permissions with id, name, description, category.

Categories: games, playlists, users, roles, system.

## Get Role

`GET /api/roles/:id` - Requires `roles.read` permission

Returns single role with all fields and permissions array.

Error: `404 Not Found`

## Create Role

`POST /api/roles` - Requires `roles.create` permission

Body: `{ "name": "string (3-50 chars)", "description": "optional", "priority": integer, "permissionIds": [1, 2, ...] }`

Returns `201 Created` with new role.

Error: `409 Conflict` if name already exists

## Update Role

`PATCH /api/roles/:id` - Requires `roles.update` permission

Body (all optional): `{ "name": "string", "description": "string", "priority": integer }`

Cannot modify system roles (admin, user, moderator, guest).

Error: `400 Bad Request` for system roles

## Update Role Permissions

`PUT /api/roles/:id/permissions` - Requires `roles.update` permission

Body: `{ "permissionIds": [1, 2, ...] }`

Returns updated role with new permissions.

## Delete Role

`DELETE /api/roles/:id` - Requires `roles.delete` permission

Cannot delete system roles.

Returns `{ "success": true }`

## System Roles

| Role | ID | Priority | Description |
|------|----|---------:|-------------|
| admin | 1 | 100 | Full system access |
| user | 2 | 10 | Standard user |
| moderator | 3 | 50 | Limited admin |
| guest | 4 | 1 | Read-only |

## Permission Categories

**Games:** games.play, games.read, games.download

**Playlists:** playlists.create, playlists.update, playlists.delete, playlists.manage

**Users:** users.read, users.create, users.update, users.delete

**Roles:** roles.read, roles.create, roles.update, roles.delete

**System:** system.settings, system.maintenance, system.logs

## RBAC Best Practices

1. Use principle of least privilege - grant only necessary permissions
2. Separate duties - create distinct roles for different responsibilities
3. Use role hierarchy via priority field
4. Never delete/drastically modify system roles
5. Audit role assignments regularly

## Example: Create Content Manager Role

```javascript
const permissions = await api.get('/roles/permissions');
const contentPerms = permissions
  .filter(p => p.category === 'games' ||
    (p.category === 'playlists' && p.name !== 'playlists.delete'))
  .map(p => p.id);

await api.post('/roles', {
  name: 'content_manager',
  description: 'Manages game content and playlists',
  priority: 40,
  permissionIds: contentPerms
});
```

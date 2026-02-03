# Domains API

Manage custom domains for playlist sharing URLs and CORS configuration.

**Authentication:** Required (JWT Bearer token)
**Permissions:** `settings.read` (list), `settings.update` (add, delete, set default)

## List Domains

`GET /api/domains` - Requires `settings.read` permission

Returns all configured domains, ordered by default status then hostname.

**Response:**
```json
[
  {
    "id": 1,
    "hostname": "play.example.com",
    "isDefault": true,
    "createdAt": "2026-02-04T12:00:00.000Z"
  },
  {
    "id": 2,
    "hostname": "games.example.com",
    "isDefault": false,
    "createdAt": "2026-02-04T12:30:00.000Z"
  }
]
```

## Add Domain

`POST /api/domains` - Requires `settings.update` permission

Adds a new domain for CORS and share link configuration.

**Request Body:**
```json
{
  "hostname": "play.example.com"
}
```

**Validation Rules:**
- No protocol prefix (`http://` or `https://` rejected)
- No path, query string, or fragment (`/`, `?`, `#` rejected)
- Ports allowed (e.g., `localhost:5173`)
- IP addresses and `localhost` allowed
- Case-insensitive uniqueness (stored lowercase)

Returns `201 Created`:
```json
{
  "id": 3,
  "hostname": "play.example.com",
  "isDefault": false,
  "createdAt": "2026-02-04T14:00:00.000Z"
}
```

Errors:
- `400 Bad Request` - Invalid hostname format, duplicate hostname, or empty hostname
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions

## Delete Domain

`DELETE /api/domains/:id` - Requires `settings.update` permission

Removes a domain. If the deleted domain was the default, no domain is default until one is explicitly set.

Returns `200 OK`:
```json
{
  "success": true
}
```

Errors:
- `404 Not Found` - Domain not found

## Set Default Domain

`PATCH /api/domains/:id/default` - Requires `settings.update` permission

Sets the specified domain as the default. Clears the previous default in a transaction.

The default domain is:
- Used in share links for non-admin users
- Exposed via `GET /api/settings/public` as `domains.defaultDomain`
- Returned to regular users through the `usePublicSettings()` hook

Returns `200 OK`:
```json
{
  "id": 1,
  "hostname": "play.example.com",
  "isDefault": true,
  "createdAt": "2026-02-04T12:00:00.000Z"
}
```

Errors:
- `404 Not Found` - Domain not found

## CORS Integration

All configured domains are automatically added to the backend's dynamic CORS whitelist. Both `http://` and `https://` variants are generated for each hostname.

The CORS cache refreshes every 60 seconds and is immediately invalidated when domains are added, deleted, or modified.

## Common Workflows

### Set Up a Custom Domain

```javascript
// 1. Add domain
const domain = await api.post('/domains', {
  hostname: 'play.example.com'
});

// 2. Make it default (used in share links)
await api.patch(`/domains/${domain.id}/default`);

// 3. Verify in public settings
const settings = await api.get('/settings/public');
console.log(settings.domains.defaultDomain); // 'play.example.com'
```

### List and Manage Domains

```javascript
// Get all domains
const domains = await api.get('/domains');

// Delete old domain
await api.delete(`/domains/${oldDomainId}`);

// Set new default
const newDefault = domains.find(d => d.hostname === 'new.example.com');
await api.patch(`/domains/${newDefault.id}/default`);
```

## Frontend Integration

```typescript
import { domainsApi } from '@/lib/api';

// List all domains (requires settings.read)
const domains = await domainsApi.getAll();

// Add domain (requires settings.update)
const domain = await domainsApi.add('play.example.com');

// Delete domain (requires settings.update)
await domainsApi.delete(3);

// Set default (requires settings.update)
const updated = await domainsApi.setDefault(1);
```

**React Query Hooks:**

```typescript
import { useDomains, useAddDomain, useDeleteDomain, useSetDefaultDomain } from '@/hooks/useDomains';

const { data: domains, isLoading } = useDomains();
const addMutation = useAddDomain();
const deleteMutation = useDeleteDomain();
const setDefaultMutation = useSetDefaultDomain();

// Add domain
addMutation.mutate('play.example.com', {
  onSuccess: (newDomain) => {
    console.log('Domain added:', newDomain.hostname);
  }
});

// Delete domain
deleteMutation.mutate(1, {
  onSuccess: () => {
    console.log('Domain deleted');
  }
});

// Set default (supports optimistic updates)
setDefaultMutation.mutate(1);
```

## Best Practices

- Use HTTPS domains in production
- Set a single default domain for consistent share links
- Remove unused domains to reduce CORS overhead
- Consider regional domains for distributed deployments
- Document your configured domains for team reference
- Test share links after changing the default domain

## Related

- [Settings API](./settings-api.md) - Public settings include `domains.defaultDomain`
- [System Settings Feature](../10-features/system-settings.md) - Domain Settings UI tab
- [Database Schema](../12-reference/database-schema-reference.md) - `domains` table schema

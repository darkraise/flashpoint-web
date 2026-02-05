# Security Considerations

Production deployment security checklist for Flashpoint Web.

## Pre-Production Checklist

**Critical Items:**

- [ ] Change default JWT secret (min 64 characters)
- [ ] Set strong CORS origin (no wildcards)
- [ ] Enable HTTPS with valid SSL certificate
- [ ] Configure rate limiting on all endpoints
- [ ] Enable security headers (Helmet.js)
- [ ] Scan Docker images for vulnerabilities
- [ ] Run containers as non-root user
- [ ] Set resource limits on containers
- [ ] Enable firewall (allow only 80, 443)
- [ ] Configure Nginx reverse proxy
- [ ] Set up fail2ban for intrusion detection
- [ ] Enable security event logging
- [ ] Implement password complexity requirements (min 12 chars, uppercase,
      lowercase, numbers)
- [ ] Configure session timeout (1h access token, 7d refresh token)
- [ ] Enable database encryption for sensitive fields
- [ ] Set up encrypted backups
- [ ] Update all dependencies (`npm audit fix`)
- [ ] Configure log rotation and retention

## JWT Security

**CRITICAL: Change default JWT secret in production!**

Generate 64+ character secret:

```bash
openssl rand -hex 64
```

Set in environment:

```bash
JWT_SECRET=a1b2c3d4e5f6789012345678901234567890abcdefghijklmnopqrstuvwxyz
JWT_EXPIRES_IN=1h
```

Store in secure secret management system (AWS Secrets Manager, HashiCorp Vault,
not in config files).

## Authentication & Authorization

**Password Hashing:**

- Algorithm: bcrypt with cost 12
- Min length: 8 (recommend 12+)
- Requirements: uppercase, lowercase, numbers

**Permission System:**

- Admin > Moderator > User > Guest
- Permissions cached 5 minutes (auto-invalidated on changes)
- System roles (Admin, User, Guest) cannot be modified
- All protected endpoints require explicit permissions

**Session Management:**

- Access tokens: 1 hour (short-lived)
- Refresh tokens: 7 days (stored in database)
- Old tokens automatically revoked on refresh
- Logout invalidates all user sessions

## CORS Configuration

```bash
# Single domain (production)
DOMAIN=https://flashpoint.example.com

# Multiple domains (comma-separated)
DOMAIN=https://flashpoint.example.com,https://www.flashpoint.example.com

# Never use wildcards in production
```

## Rate Limiting

Enable on all endpoints:

```bash
RATE_LIMIT_WINDOW_MS=60000      # 1 minute window
RATE_LIMIT_MAX_REQUESTS=100     # 100 requests per window
```

Nginx rate limiting zones:

```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=auth:10m rate=1r/m;
```

Auth endpoints: max 5 attempts per 15 minutes

## HTTP Security Headers

Using Helmet.js:

```typescript
// Enabled in production
- Strict-Transport-Security: 1 year, includeSubDomains, preload
- X-Frame-Options: SAMEORIGIN
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Content-Security-Policy: restrictive defaults
- Referrer-Policy: strict-origin-when-cross-origin
```

## SSL/TLS Configuration

**Protocols:** TLSv1.2, TLSv1.3 only

**Ciphers:** Modern Mozilla configuration (AES-GCM, ChaCha20-Poly1305)

**Certificate:** Let's Encrypt with auto-renewal:

```bash
certbot renew --dry-run
# Add cron job: 0 3 * * * certbot renew --post-hook "systemctl reload nginx" --quiet
```

## Container Security

**Non-root user:** All containers run as non-root (UID 1000)

**Resource limits:**

```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 1G
    reservations:
      memory: 512M
```

**Image scanning:**

```bash
docker scout cves flashpoint-backend:latest
# or
trivy image flashpoint-backend:latest
```

**Secrets management:** Never embed in images. Use environment variables or
Docker secrets.

## Network Security

**Firewall (UFW):**

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw deny 3100/tcp      # Block direct backend access
sudo ufw deny 22500/tcp
sudo ufw deny 22501/tcp
sudo ufw enable
```

**Docker network isolation:**

- Internal networks only accessible within Docker
- Services behind reverse proxy only
- Backend/game-service not exposed to host

**Reverse proxy only:** All external traffic goes through Nginx, services bind
to localhost.

## Input Validation

All user input validated with Zod schemas:

- Username: 3-50 chars, alphanumeric + hyphens/underscores
- Email: valid format, max 255 chars
- Password: 8+ chars, uppercase, lowercase, numbers
- Game IDs: UUID format
- Search: max 200 chars, SQL injection prevention via parameterized queries

## Path Traversal Prevention

All file paths validated:

```typescript
const resolvedPath = path.resolve(baseDir, userPath);
if (!resolvedPath.startsWith(baseDir)) {
  return null; // Blocked: path escape attempt
}
```

URL paths sanitized before processing (null bytes, ../, backslash checks).

## SQL Injection Prevention

**ALWAYS use parameterized queries:**

```typescript
// Good
db.prepare('SELECT * FROM game WHERE title LIKE ?').all(`%${query}%`);

// Never do this
db.prepare(`SELECT * FROM game WHERE title LIKE '%${query}%'`).all();
```

**Database permissions:**

- Flashpoint database: read-only
- User database: read/write by app only
- No DROP/ALTER permissions
- Foreign key constraints enabled

## Logging and Monitoring

**Security events logged:**

- Failed login attempts
- Permission violations (403 errors)
- Rate limit violations
- Path traversal attempts
- SQL injection attempts
- System configuration changes

**Intrusion detection:** fail2ban with:

- Max 5 failed logins per 600s
- Ban for 3600s
- Monitor `/var/log/nginx/flashpoint-access.log`

**Alert on:**

- Multiple failed logins from same IP
- Repeated rate limit violations
- Database access errors
- Unusual file access patterns

## Data Protection

**Sensitive fields encrypted:**

```typescript
// AES-256-GCM encryption for sensitive data
encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  // ... encrypt ...
}
```

**Backups encrypted with GPG:**

```bash
sqlite3 user.db ".backup user-db.backup"
gpg --symmetric --cipher-algo AES256 user-db.backup
shred -u user-db.backup  # Securely delete unencrypted
```

**Data retention:**

```sql
-- Delete old play sessions
DELETE FROM play_sessions WHERE created_at < datetime('now', '-90 days');

-- Delete old audit logs
DELETE FROM audit_logs WHERE created_at < datetime('now', '-1 year');
```

## Regular Maintenance

**Weekly:**

- Review security logs for anomalies
- Check failed login attempts
- Monitor rate limit violations

**Monthly:**

- Update dependencies (`npm audit`)
- Review user permissions
- Check SSL certificate expiration
- Test backup restoration

**Quarterly:**

- Rotate JWT secrets
- Security audit of codebase
- Penetration testing
- Update firewall rules

**Annually:**

- Full security assessment
- Third-party audit
- Disaster recovery drill
- Update incident response plan

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Docker Security Best Practices](https://docs.docker.com/engine/security/)
- [Let's Encrypt](https://letsencrypt.org/)

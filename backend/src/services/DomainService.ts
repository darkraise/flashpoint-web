import { UserDatabaseService } from './UserDatabaseService';
import { logger } from '../utils/logger';

export interface Domain {
  id: number;
  hostname: string;
  isDefault: boolean;
  createdAt: string;
}

interface DomainRow {
  id: number;
  hostname: string;
  is_default: number;
  created_at: string;
  created_by: number | null;
}

// In-memory cache with TTL
let cachedDomains: Domain[] | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000; // 60 seconds

export class DomainService {
  private get db() {
    return UserDatabaseService.getDatabase();
  }

  private invalidateCache(): void {
    cachedDomains = null;
    cacheTimestamp = 0;
  }

  private mapRow(row: DomainRow): Domain {
    return {
      id: row.id,
      hostname: row.hostname,
      isDefault: row.is_default === 1,
      createdAt: row.created_at,
    };
  }

  /**
   * Get all configured domains
   */
  getAllDomains(): Domain[] {
    const now = Date.now();
    if (cachedDomains && now - cacheTimestamp < CACHE_TTL_MS) {
      return cachedDomains;
    }

    const rows = this.db
      .prepare('SELECT id, hostname, is_default, created_at FROM domains ORDER BY is_default DESC, hostname ASC')
      .all() as DomainRow[];

    cachedDomains = rows.map(this.mapRow);
    cacheTimestamp = now;
    return cachedDomains;
  }

  /**
   * Get the default domain hostname, or null if none configured
   */
  getDefaultDomain(): string | null {
    const domains = this.getAllDomains();
    const defaultDomain = domains.find((d) => d.isDefault);
    return defaultDomain?.hostname ?? null;
  }

  /**
   * Validate and normalize a hostname
   */
  private validateHostname(hostname: string): string {
    const trimmed = hostname.trim().toLowerCase();

    if (!trimmed) {
      throw new Error('Hostname cannot be empty');
    }

    // Reject protocol prefixes
    if (/^https?:\/\//i.test(trimmed)) {
      throw new Error('Hostname must not include a protocol (http:// or https://)');
    }

    // Reject path, query, or fragment
    if (/[/?#]/.test(trimmed)) {
      throw new Error('Hostname must not include a path, query string, or fragment');
    }

    // Basic hostname validation: allow alphanumeric, dots, hyphens, colons (for port)
    if (!/^[a-z0-9._-]+(:[0-9]+)?$/i.test(trimmed)) {
      throw new Error('Invalid hostname format');
    }

    return trimmed;
  }

  /**
   * Add a new domain
   */
  addDomain(hostname: string, createdBy: number): Domain {
    const validated = this.validateHostname(hostname);

    // Check for duplicate
    const existing = this.db
      .prepare('SELECT id FROM domains WHERE hostname = ?')
      .get(validated) as { id: number } | undefined;

    if (existing) {
      throw new Error(`Domain "${validated}" already exists`);
    }

    const stmt = this.db.prepare(
      'INSERT INTO domains (hostname, created_by) VALUES (?, ?)'
    );
    const result = stmt.run(validated, createdBy);

    this.invalidateCache();
    logger.info(`[Domains] Added domain "${validated}" (by user ${createdBy})`);

    const row = this.db
      .prepare('SELECT id, hostname, is_default, created_at FROM domains WHERE id = ?')
      .get(result.lastInsertRowid) as DomainRow;

    return this.mapRow(row);
  }

  /**
   * Delete a domain by ID
   */
  deleteDomain(id: number): boolean {
    const existing = this.db
      .prepare('SELECT hostname FROM domains WHERE id = ?')
      .get(id) as { hostname: string } | undefined;

    if (!existing) {
      return false;
    }

    this.db.prepare('DELETE FROM domains WHERE id = ?').run(id);
    this.invalidateCache();
    logger.info(`[Domains] Deleted domain "${existing.hostname}" (id: ${id})`);
    return true;
  }

  /**
   * Set a domain as the default (clears previous default in a transaction)
   */
  setDefault(id: number): Domain | null {
    const existing = this.db
      .prepare('SELECT id, hostname, is_default, created_at FROM domains WHERE id = ?')
      .get(id) as DomainRow | undefined;

    if (!existing) {
      return null;
    }

    const transaction = this.db.transaction(() => {
      this.db.prepare('UPDATE domains SET is_default = 0 WHERE is_default = 1').run();
      this.db.prepare('UPDATE domains SET is_default = 1 WHERE id = ?').run(id);
    });

    transaction();
    this.invalidateCache();
    logger.info(`[Domains] Set default domain to "${existing.hostname}" (id: ${id})`);

    return this.mapRow({ ...existing, is_default: 1 });
  }

  /**
   * Get allowed origins for CORS (generates http:// and https:// variants)
   */
  getAllowedOrigins(): Set<string> {
    const domains = this.getAllDomains();
    const origins = new Set<string>();

    for (const domain of domains) {
      origins.add(`http://${domain.hostname}`);
      origins.add(`https://${domain.hostname}`);
    }

    return origins;
  }
}

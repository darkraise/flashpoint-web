import { UserDatabaseService } from './UserDatabaseService';
import { AppError } from '../middleware/errorHandler';
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

export class DomainService {
  private static instance: DomainService;

  private cachedDomains: Domain[] | null = null;
  private cachedOrigins: Set<string> | null = null;
  private cacheTimestamp = 0;
  private readonly CACHE_TTL_MS = 60_000; // 60 seconds
  private readonly MAX_DOMAINS = 50;

  private constructor() {}

  static getInstance(): DomainService {
    if (!DomainService.instance) {
      DomainService.instance = new DomainService();
    }
    return DomainService.instance;
  }

  private get db() {
    return UserDatabaseService.getDatabase();
  }

  private invalidateCache(): void {
    this.cachedDomains = null;
    this.cachedOrigins = null;
    this.cacheTimestamp = 0;
  }

  private mapRow(row: DomainRow): Domain {
    return {
      id: row.id,
      hostname: row.hostname,
      isDefault: row.is_default === 1,
      createdAt: row.created_at,
    };
  }

  getAllDomains(): Domain[] {
    const now = Date.now();
    if (this.cachedDomains && now - this.cacheTimestamp < this.CACHE_TTL_MS) {
      return this.cachedDomains;
    }

    const rows = this.db
      .prepare(
        'SELECT id, hostname, is_default, created_at FROM domains ORDER BY is_default DESC, hostname ASC'
      )
      .all() as DomainRow[];

    this.cachedDomains = rows.map(this.mapRow);
    this.cacheTimestamp = now;
    return this.cachedDomains;
  }

  getDefaultDomain(): string | null {
    const domains = this.getAllDomains();
    const defaultDomain = domains.find((d) => d.isDefault);
    return defaultDomain?.hostname ?? null;
  }

  /** Route-level Zod validation performs comprehensive checks; this is basic sanitization only */
  private validateHostname(hostname: string): string {
    const trimmed = hostname.trim().toLowerCase();

    if (!trimmed) {
      throw new AppError(400, 'Hostname cannot be empty');
    }

    return trimmed;
  }

  addDomain(hostname: string, createdBy: number): Domain {
    const validated = this.validateHostname(hostname);

    // Wrap count check + duplicate check + insert in a transaction to prevent TOCTOU races
    const transaction = this.db.transaction(() => {
      const count = this.db.prepare('SELECT COUNT(*) as count FROM domains').get() as {
        count: number;
      };
      if (count.count >= this.MAX_DOMAINS) {
        throw new AppError(400, `Maximum of ${this.MAX_DOMAINS} domains allowed`);
      }

      const existing = this.db
        .prepare('SELECT id FROM domains WHERE hostname = ?')
        .get(validated) as { id: number } | undefined;

      if (existing) {
        throw new AppError(409, `Domain "${validated}" already exists`);
      }

      const stmt = this.db.prepare('INSERT INTO domains (hostname, created_by) VALUES (?, ?)');
      return stmt.run(validated, createdBy);
    });

    const result = transaction();

    this.invalidateCache();
    logger.info(`[Domains] Added domain "${validated}" (by user ${createdBy})`);

    const row = this.db
      .prepare('SELECT id, hostname, is_default, created_at FROM domains WHERE id = ?')
      .get(result.lastInsertRowid) as DomainRow;

    return this.mapRow(row);
  }

  deleteDomain(id: number): void {
    const db = this.db;
    const transaction = db.transaction(() => {
      const current = db
        .prepare('SELECT hostname, is_default FROM domains WHERE id = ?')
        .get(id) as { hostname: string; is_default: number } | undefined;

      if (!current) {
        throw new AppError(404, 'Domain not found');
      }

      db.prepare('DELETE FROM domains WHERE id = ?').run(id);

      // If the deleted domain was the default, promote the next one
      if (current.is_default === 1) {
        const next = db.prepare('SELECT id FROM domains ORDER BY created_at ASC LIMIT 1').get() as
          | { id: number }
          | undefined;

        if (next) {
          db.prepare('UPDATE domains SET is_default = 1 WHERE id = ?').run(next.id);
          logger.info(
            `[Domains] Auto-promoted domain (id: ${next.id}) as new default after deleting previous default`
          );
        }
      }

      return current.hostname;
    });

    const hostname = transaction();
    this.invalidateCache();
    logger.info(`[Domains] Deleted domain "${hostname}" (id: ${id})`);
  }

  setDefault(id: number): Domain {
    const existing = this.db
      .prepare('SELECT id, hostname, is_default, created_at FROM domains WHERE id = ?')
      .get(id) as DomainRow | undefined;

    if (!existing) {
      throw new AppError(404, 'Domain not found');
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
   * Get allowed origins for CORS (generates http:// and https:// variants).
   * The result is cached alongside the domains cache to avoid rebuilding on every request.
   */
  getAllowedOrigins(): Set<string> {
    const domains = this.getAllDomains();

    // Only reuse cached origins if they were built from the same domains array
    if (this.cachedOrigins && domains === this.cachedDomains) {
      return this.cachedOrigins;
    }

    const origins = new Set<string>();
    for (const domain of domains) {
      origins.add(`http://${domain.hostname}`);
      origins.add(`https://${domain.hostname}`);
    }

    this.cachedOrigins = origins;
    return origins;
  }
}

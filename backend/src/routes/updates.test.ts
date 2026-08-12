import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

// The route's own behaviour is what is under test, not the middleware stack.
vi.mock('../middleware/auth', () => ({
  authenticate: (_req: unknown, _res: unknown, next: () => void) => next(),
}));
vi.mock('../middleware/rbac', () => ({
  requirePermission: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));
vi.mock('../middleware/activityLogger', () => ({
  logActivity: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));
vi.mock('../middleware/rateLimiter', () => ({
  rateLimitStandard: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

const getUpdateInfo = vi.hoisted(() => vi.fn());
vi.mock('../services/AppUpdateService', () => ({
  AppUpdateService: { getUpdateInfo },
}));

// Imported for their side effects only; the route under test does not use them.
vi.mock('../services/UpdateService', () => ({ updateService: {} }));
vi.mock('../services/MetadataUpdateService', () => ({ MetadataUpdateService: class {} }));
vi.mock('../services/MetadataSyncService', () => ({ MetadataSyncService: class {} }));
vi.mock('../services/AssetDownloadService', () => ({ AssetDownloadService: {} }));
vi.mock('../services/SyncStatusService', () => ({
  SyncStatusService: { getInstance: () => ({}) },
}));

import updatesRouter from './updates';

const INFO = {
  currentVersion: '1.0.38',
  latestVersion: '1.0.42',
  updateAvailable: true,
  isUnreleasedBuild: false,
  publishedAt: '2026-08-12T07:11:45Z',
  releaseUrl: 'https://github.com/darkraise/flashpoint-web/releases/tag/v1.0.42',
  changelog: '## Changes',
  checkedAt: '2026-08-12T08:00:00.000Z',
  lastCheckFailed: false,
};

let app: Express;

beforeEach(() => {
  vi.clearAllMocks();
  getUpdateInfo.mockResolvedValue(INFO);
  app = express();
  app.use('/api/updates', updatesRouter);
});

describe('GET /api/updates/app', () => {
  it('returns the update info as a bare object', async () => {
    const response = await request(app).get('/api/updates/app');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(INFO);
  });

  it('does not force a refresh by default', async () => {
    await request(app).get('/api/updates/app');

    expect(getUpdateInfo).toHaveBeenCalledWith(false);
  });

  it('forces a refresh for refresh=true', async () => {
    await request(app).get('/api/updates/app?refresh=true');

    expect(getUpdateInfo).toHaveBeenCalledWith(true);
  });

  it('ignores any other refresh value', async () => {
    await request(app).get('/api/updates/app?refresh=1');
    await request(app).get('/api/updates/app?refresh=yes');
    await request(app).get('/api/updates/app?refresh[]=true');

    expect(getUpdateInfo).toHaveBeenNthCalledWith(1, false);
    expect(getUpdateInfo).toHaveBeenNthCalledWith(2, false);
    expect(getUpdateInfo).toHaveBeenNthCalledWith(3, false);
  });
});

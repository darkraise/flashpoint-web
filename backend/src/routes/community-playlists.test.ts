import { describe, it, expect, vi } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

// The route's own behaviour is what is under test, not the middleware stack.
const passThrough = vi.hoisted(() => (_req: unknown, _res: unknown, next: () => void) => next());
vi.mock('../middleware/auth', () => ({
  optionalAuth: passThrough,
  authenticate: passThrough,
}));
vi.mock('../middleware/rbac', () => ({
  requirePermission: () => passThrough,
}));
vi.mock('../middleware/activityLogger', () => ({
  logActivity: () => passThrough,
}));

// The playlist index used to be scraped from the Flashpoint wiki on every
// request, which now fails: the wiki sits behind a Cloudflare challenge.
const axiosGet = vi.hoisted(() => vi.fn());
vi.mock('axios', () => ({
  default: { get: axiosGet, isAxiosError: () => false },
}));

import communityPlaylistsRouter from './community-playlists';

function createApp(): Express {
  const app = express();
  app.use('/api/community-playlists', communityPlaylistsRouter);
  return app;
}

describe('GET /api/community-playlists', () => {
  it('serves the bundled playlist index', async () => {
    const response = await request(createApp()).get('/api/community-playlists');

    expect(response.status).toBe(200);
    expect(response.body.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(response.body.categories.length).toBeGreaterThan(0);
    expect(response.body.categories[0].playlists[0]).toMatchObject({
      name: expect.any(String),
      author: expect.any(String),
      downloadUrl: expect.any(String),
    });
  });

  it('answers without reaching out to the wiki', async () => {
    await request(createApp()).get('/api/community-playlists');

    expect(axiosGet).not.toHaveBeenCalled();
  });
});

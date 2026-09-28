import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

const passThrough = vi.hoisted(() => (_req: unknown, _res: unknown, next: () => void) => next());
vi.mock('../middleware/rateLimiter', () => ({
  rateLimitStandard: passThrough,
}));
vi.mock('../middleware/activityLogger', () => ({
  logActivity: () => passThrough,
}));

// Auth and RBAC run for real; only token verification and settings are stubbed.
vi.mock('../services/AuthService');

const getGameById = vi.hoisted(() => vi.fn());
vi.mock('../services/GameService', () => ({
  GameService: vi.fn().mockImplementation(() => ({
    getGameById,
    getGameDataPath: vi.fn().mockResolvedValue(null),
  })),
}));
vi.mock('../services/GameSearchCache', () => ({
  GameSearchCache: {},
}));
const mountGameZip = vi.hoisted(() => vi.fn());
vi.mock('../services/GameDataService', () => ({
  gameDataService: { mountGameZip },
}));

import gamesRouter from './games';
import { errorHandler } from '../middleware/errorHandler';
import { AuthService } from '../services/AuthService';

const GAME_ID = '11111111-2222-4333-8444-555555555555';

function createApp(): Express {
  const app = express();
  app.use('/api/games', gamesRouter);
  app.use(errorHandler);
  return app;
}

function signInAs(permissions: string[]): void {
  vi.mocked(AuthService.prototype.verifyAccessToken).mockResolvedValue({
    id: 42,
    username: 'player',
    email: 'player@example.com',
    role: 'user',
    permissions,
  });
}

describe('GET /api/games/:id/launch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getGameById.mockResolvedValue({
      id: GAME_ID,
      title: 'Test Game',
      platformName: 'Flash',
      launchCommand: 'http://example.com/game.swf',
      source: 'http://example.com',
    });
    mountGameZip.mockResolvedValue({ mounted: true, downloading: false });
  });

  it('rejects users without games.play before mounting anything', async () => {
    signInAs(['games.read']);

    const response = await request(createApp())
      .get(`/api/games/${GAME_ID}/launch`)
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(403);
    expect(mountGameZip).not.toHaveBeenCalled();
  });

  it('launches for users with games.play', async () => {
    signInAs(['games.read', 'games.play']);

    const response = await request(createApp())
      .get(`/api/games/${GAME_ID}/launch`)
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ gameId: GAME_ID, canPlayInBrowser: true });
    expect(mountGameZip).toHaveBeenCalledWith(GAME_ID, { allowRecovery: true });
  });

  it('launches for guests when guest access is enabled', async () => {
    vi.mocked(AuthService.prototype.isGuestAccessEnabled).mockReturnValue(true);

    const response = await request(createApp()).get(`/api/games/${GAME_ID}/launch`);

    expect(response.status).toBe(200);
    expect(mountGameZip).toHaveBeenCalledOnce();
  });
});

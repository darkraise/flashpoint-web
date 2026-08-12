import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import fs from 'fs';
import os from 'os';
import path from 'path';

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

vi.mock('../config', () => ({
  config: {
    serveFrontend: true,
    frontendDistPath: '/unused-in-tests',
  },
}));

import { registerPreListenStack } from './frontendServing';
import { StartupState } from '../services/StartupState';

const INDEX_HTML = '<!doctype html><title>Flashpoint Web</title><div id="root"></div>';
const ASSET_JS = 'console.log("bundle");';

let distDir: string;
let app: Express;

/**
 * Exercises the same registration server.ts uses, so a reordering there is
 * caught here. Only the API routes that would normally come from setupRoutes are
 * stubbed — the shell-before-gate ordering under test is the real one.
 */
beforeEach(() => {
  StartupState.reset();

  distDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fp-dist-'));
  fs.mkdirSync(path.join(distDir, 'assets'));
  fs.writeFileSync(path.join(distDir, 'index.html'), INDEX_HTML);
  fs.writeFileSync(path.join(distDir, 'assets', 'app-abc123.js'), ASSET_JS);

  app = express();
  registerPreListenStack(app, distDir);
  app.get('/api/games', (_req, res) => {
    res.json({ success: true, data: [] });
  });
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
});

afterEach(() => {
  fs.rmSync(distDir, { recursive: true, force: true });
});

describe('startup request ordering', () => {
  describe('while the server is still starting', () => {
    it('serves the app shell', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.text).toContain('id="root"');
    });

    it('serves hashed asset bundles', async () => {
      const response = await request(app).get('/assets/app-abc123.js');

      expect(response.status).toBe(200);
      expect(response.text).toBe(ASSET_JS);
    });

    it('serves the shell for client-side routes', async () => {
      const response = await request(app).get('/games/some-game-id');

      expect(response.status).toBe(200);
      expect(response.text).toContain('id="root"');
    });

    it('holds off API requests with the starting marker', async () => {
      StartupState.setPhase('Connecting to the Flashpoint database');

      const response = await request(app).get('/api/games');

      expect(response.status).toBe(503);
      expect(response.body).toMatchObject({
        starting: true,
        phase: 'Connecting to the Flashpoint database',
      });
    });

    it('reports starting on the health endpoint', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(503);
      expect(response.body).toMatchObject({ status: 'starting' });
    });
  });

  describe('once startup finishes', () => {
    beforeEach(() => {
      StartupState.markReady();
    });

    it('lets API requests reach their route', async () => {
      const response = await request(app).get('/api/games');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ success: true });
    });

    it('lets the health check reach its route', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({ status: 'ok' });
    });

    it('still serves the app shell', async () => {
      const response = await request(app).get('/');

      expect(response.status).toBe(200);
      expect(response.text).toContain('id="root"');
    });
  });
});

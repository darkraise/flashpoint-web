import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express, { Express } from 'express';
import request from 'supertest';
import fs from 'fs';
import os from 'os';
import path from 'path';

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

let ruffleDir: string;

vi.mock('../config', () => ({
  config: {
    serveFrontend: true,
    get ruffleDataPath() {
      return ruffleDir;
    },
  },
}));

import { registerFrontendServing } from './frontendServing';

const HASHED_CHUNK = 'core.ruffle.4ca82b563e9711217164.js';

let distDir: string;
let app: Express;

beforeEach(() => {
  distDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fp-serve-dist-'));
  ruffleDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fp-serve-ruffle-'));

  fs.writeFileSync(path.join(distDir, 'index.html'), '<!doctype html><div id="root"></div>');
  fs.mkdirSync(path.join(distDir, 'ruffle'));
  fs.writeFileSync(path.join(distDir, 'ruffle', 'ruffle.js'), 'bundled loader');
  fs.writeFileSync(path.join(distDir, 'ruffle', 'only-in-bundle.js'), 'bundled extra');

  fs.writeFileSync(path.join(ruffleDir, 'ruffle.js'), 'updated loader');
  fs.writeFileSync(path.join(ruffleDir, HASHED_CHUNK), 'updated chunk');

  app = express();
  registerFrontendServing(app, distDir);
});

afterEach(() => {
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.rmSync(ruffleDir, { recursive: true, force: true });
});

describe('Ruffle serving', () => {
  it('serves the persisted copy in preference to the bundled one', async () => {
    const response = await request(app).get('/ruffle/ruffle.js');

    expect(response.status).toBe(200);
    expect(response.text).toBe('updated loader');
  });

  it('falls back to the bundled copy for a file the persisted copy lacks', async () => {
    const response = await request(app).get('/ruffle/only-in-bundle.js');

    expect(response.status).toBe(200);
    expect(response.text).toBe('bundled extra');
  });

  it('makes the stable-named loader revalidate', async () => {
    const response = await request(app).get('/ruffle/ruffle.js');

    expect(response.headers['cache-control']).toBe('no-cache, no-store, must-revalidate');
  });

  it('makes a content-hashed chunk immutable', async () => {
    const response = await request(app).get(`/ruffle/${HASHED_CHUNK}`);

    expect(response.headers['cache-control']).toBe('public, max-age=31536000, immutable');
  });

  it('makes the bundled fallback loader revalidate too', async () => {
    const response = await request(app).get('/ruffle/only-in-bundle.js');

    expect(response.headers['cache-control']).toBe('no-cache, no-store, must-revalidate');
  });
});

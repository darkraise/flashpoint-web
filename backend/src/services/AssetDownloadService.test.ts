import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

let imagesDir: string;

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

vi.mock('../config', () => ({
  config: {
    get flashpointImagesPath() {
      return imagesDir;
    },
  },
  getExternalImageUrls: vi.fn(async () => ['https://cdn.example/Flashpoint/Data/Images']),
}));

vi.mock('axios', () => ({
  default: { get: vi.fn() },
}));

import axios from 'axios';
import { AssetDownloadService } from './AssetDownloadService';

const GAME_ID = 'abcd1234-1111-2222-3333-444455556666';

beforeEach(async () => {
  imagesDir = await fs.mkdtemp(path.join(os.tmpdir(), 'fp-assets-'));
  vi.clearAllMocks();
});

afterEach(async () => {
  await fs.rm(imagesDir, { recursive: true, force: true });
});

describe('AssetDownloadService', () => {
  it('derives the sharded logo and screenshot paths', () => {
    expect(AssetDownloadService.relativePathsFor(GAME_ID)).toEqual([
      `Logos/ab/cd/${GAME_ID}.png`,
      `Screenshots/ab/cd/${GAME_ID}.png`,
    ]);
  });

  it('downloads missing images and writes them where the proxy serves from', async () => {
    vi.mocked(axios.get).mockResolvedValue({ status: 200, data: Buffer.from('png-bytes') });

    const result = await AssetDownloadService.downloadForGames([GAME_ID]);

    expect(result.downloaded).toBe(2);
    expect(result.failed).toBe(0);

    const logo = await fs.readFile(path.join(imagesDir, `Logos/ab/cd/${GAME_ID}.png`), 'utf8');
    expect(logo).toBe('png-bytes');
  });

  it('skips images already present instead of refetching', async () => {
    const logoPath = path.join(imagesDir, `Logos/ab/cd/${GAME_ID}.png`);
    await fs.mkdir(path.dirname(logoPath), { recursive: true });
    await fs.writeFile(logoPath, 'existing');
    vi.mocked(axios.get).mockResolvedValue({ status: 200, data: Buffer.from('png-bytes') });

    const result = await AssetDownloadService.downloadForGames([GAME_ID]);

    expect(result.skipped).toBe(1);
    expect(result.downloaded).toBe(1);
    expect(await fs.readFile(logoPath, 'utf8')).toBe('existing');
  });

  it('counts a missing image as failed without throwing', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('404'));

    const result = await AssetDownloadService.downloadForGames([GAME_ID]);

    expect(result.failed).toBe(2);
    expect(result.downloaded).toBe(0);
    expect(result.isRunning).toBe(false);
  });

  it('leaves no temp file behind when a write completes', async () => {
    vi.mocked(axios.get).mockResolvedValue({ status: 200, data: Buffer.from('png-bytes') });

    await AssetDownloadService.downloadForGames([GAME_ID]);

    const entries = await fs.readdir(path.join(imagesDir, 'Logos/ab/cd'));
    expect(entries.some((name) => name.endsWith('.tmp'))).toBe(false);
  });

  it('reports idle progress before any run', () => {
    const progress = AssetDownloadService.getProgress();
    expect(progress.isRunning).toBe(false);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

const configMock = vi.hoisted(() => ({ config: { flashpointPath: '/flashpoint' } }));
vi.mock('../config', () => configMock);

import { PreferencesService, GameMetadataSource } from './PreferencesService';

function source(actualUpdateTime: string, name = 'Flashpoint Archive'): GameMetadataSource {
  const timestamps = { actualUpdateTime, latestDeleteTime: '1970-01-01', latestUpdateTime: '' };
  return {
    name,
    baseUrl: 'https://fpfss.flashpointarchive.org',
    games: { ...timestamps },
    tags: { ...timestamps },
  };
}

let flashpointDir: string;

/** Writes a preferences.json for the service to read, as an install would ship it. */
function writePreferences(contents: unknown): void {
  fs.writeFileSync(
    path.join(flashpointDir, 'preferences.json'),
    typeof contents === 'string' ? contents : JSON.stringify(contents)
  );
}

beforeEach(() => {
  vi.restoreAllMocks();
  flashpointDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fp-prefs-'));
  configMock.config.flashpointPath = flashpointDir;
  PreferencesService.clearCache();
});

afterEach(() => {
  fs.rmSync(flashpointDir, { recursive: true, force: true });
});

describe('PreferencesService.getPreferences', () => {
  // Ultimate ships preferences.json with neither gameDataSources nor
  // gameMetadataSources, which used to fail validation and discard the file.
  it('keeps the settings of an install that declares no data sources', async () => {
    writePreferences({
      dataPacksFolderPath: 'Data/Games',
      imageFolderPath: 'Data/Images',
      htdocsFolderPath: 'Legacy/htdocs',
      onDemandImages: false,
      onDemandBaseUrl: 'https://infinity.flashpointarchive.org/images/',
    });

    const prefs = await PreferencesService.getPreferences();

    expect(prefs.imageFolderPath).toBe('Data/Images');
    expect(prefs.htdocsFolderPath).toBe('Legacy/htdocs');
    expect(prefs.onDemandImages).toBe(false);
    expect(prefs.gameDataSources).toEqual([]);
    expect(prefs.dataPacksFolderPath).toBe('Data/Games');
  });

  it('keeps the data sources of an install that declares them', async () => {
    const gameDataSources = [
      {
        type: 'raw',
        name: 'Flashpoint Project',
        arguments: ['https://download.flashpointarchive.org/gib-roms/Games/'],
      },
    ];
    writePreferences({ dataPacksFolderPath: 'Data/Games', gameDataSources });

    const prefs = await PreferencesService.getPreferences();

    expect(prefs.gameDataSources).toEqual(gameDataSources);
  });

  it('drops malformed data sources and keeps the rest of the file', async () => {
    const valid = { type: 'raw', name: 'Flashpoint Project', arguments: ['https://example.test/'] };
    writePreferences({
      imageFolderPath: 'Data/Images',
      gameDataSources: [valid, { type: 'raw', name: 'No arguments', arguments: [] }, null],
    });

    const prefs = await PreferencesService.getPreferences();

    expect(prefs.gameDataSources).toEqual([valid]);
    expect(prefs.imageFolderPath).toBe('Data/Images');
  });

  it('substitutes a default pack path when the declared one is unusable', async () => {
    writePreferences({ dataPacksFolderPath: 42, imageFolderPath: 'Data/Images' });

    const prefs = await PreferencesService.getPreferences();

    expect(prefs.dataPacksFolderPath).toBe('Data/Games');
    expect(prefs.imageFolderPath).toBe('Data/Images');
  });

  it('falls back to defaults when the file is missing or unparseable', async () => {
    const missing = await PreferencesService.getPreferences();
    expect(missing).toEqual({ gameDataSources: [], dataPacksFolderPath: 'Data/Games' });

    PreferencesService.clearCache();
    writePreferences('not json');

    const unparseable = await PreferencesService.getPreferences();
    expect(unparseable).toEqual({ gameDataSources: [], dataPacksFolderPath: 'Data/Games' });
  });

  it('falls back to defaults when the file is not an object', async () => {
    writePreferences([{ dataPacksFolderPath: 'Data/Games' }]);

    const prefs = await PreferencesService.getPreferences();

    expect(prefs).toEqual({ gameDataSources: [], dataPacksFolderPath: 'Data/Games' });
  });
});

describe('PreferencesService.getLastMetadataUpdate', () => {
  it('returns null when no source is configured (Ultimate ships none)', async () => {
    vi.spyOn(PreferencesService, 'getGameMetadataSources').mockResolvedValue([]);

    expect(await PreferencesService.getLastMetadataUpdate()).toBeNull();
  });

  it('returns null for the epoch placeholder of a never-synced source', async () => {
    vi.spyOn(PreferencesService, 'getGameMetadataSources').mockResolvedValue([
      source('1970-01-01'),
    ]);

    expect(await PreferencesService.getLastMetadataUpdate()).toBeNull();
  });

  it('returns null for a missing or unparseable timestamp', async () => {
    vi.spyOn(PreferencesService, 'getGameMetadataSources').mockResolvedValue([
      source(''),
      source('not a date'),
    ]);

    expect(await PreferencesService.getLastMetadataUpdate()).toBeNull();
  });

  it('returns the sync time of a synced source', async () => {
    vi.spyOn(PreferencesService, 'getGameMetadataSources').mockResolvedValue([
      source('2026-02-13T10:57:46.117Z'),
    ]);

    expect(await PreferencesService.getLastMetadataUpdate()).toBe('2026-02-13T10:57:46.117Z');
  });

  it('returns the most recent time across sources, ignoring unset ones', async () => {
    vi.spyOn(PreferencesService, 'getGameMetadataSources').mockResolvedValue([
      source('1970-01-01', 'Never synced'),
      source('2025-08-17T05:24:20.000Z', 'Older'),
      source('2026-02-13T10:57:46.117Z', 'Newer'),
    ]);

    expect(await PreferencesService.getLastMetadataUpdate()).toBe('2026-02-13T10:57:46.117Z');
  });
});

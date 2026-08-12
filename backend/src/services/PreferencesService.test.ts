import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

vi.mock('../config', () => ({
  config: { flashpointPath: '/flashpoint' },
}));

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

beforeEach(() => {
  vi.restoreAllMocks();
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

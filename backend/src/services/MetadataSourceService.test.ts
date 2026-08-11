import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

const getCategory = vi.fn();

vi.mock('./CachedSystemSettingsService', () => ({
  CachedSystemSettingsService: {
    getInstance: () => ({ getCategory }),
  },
}));

vi.mock('./PreferencesService', () => ({
  PreferencesService: {
    getGameMetadataSources: vi.fn(),
  },
}));

import { PreferencesService } from './PreferencesService';
import { MetadataSourceService } from './MetadataSourceService';

const PREFERENCES_SOURCE = {
  name: 'Flashpoint Archive',
  baseUrl: 'https://fpfss.flashpointarchive.org',
  games: { actualUpdateTime: '', latestDeleteTime: '', latestUpdateTime: '' },
  tags: { actualUpdateTime: '', latestDeleteTime: '', latestUpdateTime: '' },
};

beforeEach(() => {
  vi.clearAllMocks();
  getCategory.mockReturnValue({});
  vi.mocked(PreferencesService.getGameMetadataSources).mockResolvedValue([]);
});

describe('MetadataSourceService', () => {
  it('reports no source when preferences define none and the override is off', async () => {
    expect(await MetadataSourceService.hasSource()).toBe(false);
  });

  it('falls back to preferences when the override is off', async () => {
    vi.mocked(PreferencesService.getGameMetadataSources).mockResolvedValue([PREFERENCES_SOURCE]);

    const sources = await MetadataSourceService.getEffectiveSources();

    expect(sources).toEqual([PREFERENCES_SOURCE]);
    expect(MetadataSourceService.isUsingOverride()).toBe(false);
  });

  it('uses the override when enabled, so an edition without preferences can sync', async () => {
    getCategory.mockReturnValue({
      customSourceEnabled: true,
      customSourceUrl: 'https://fpfss.flashpointarchive.org',
    });

    const sources = await MetadataSourceService.getEffectiveSources();

    expect(sources).toHaveLength(1);
    expect(sources[0].baseUrl).toBe('https://fpfss.flashpointarchive.org');
    expect(MetadataSourceService.isUsingOverride()).toBe(true);
    expect(await MetadataSourceService.hasSource()).toBe(true);
  });

  it('ignores an override pointing at an untrusted host', async () => {
    getCategory.mockReturnValue({
      customSourceEnabled: true,
      customSourceUrl: 'https://evil.example/fpfss',
    });
    vi.mocked(PreferencesService.getGameMetadataSources).mockResolvedValue([PREFERENCES_SOURCE]);

    const sources = await MetadataSourceService.getEffectiveSources();

    expect(sources).toEqual([PREFERENCES_SOURCE]);
    expect(MetadataSourceService.isUsingOverride()).toBe(false);
  });

  it('ignores an override that is enabled with no URL', async () => {
    getCategory.mockReturnValue({ customSourceEnabled: true, customSourceUrl: '' });

    expect(await MetadataSourceService.getEffectiveSources()).toEqual([]);
    expect(MetadataSourceService.isUsingOverride()).toBe(false);
  });

  it('ignores a URL that is set while the override is disabled', async () => {
    getCategory.mockReturnValue({
      customSourceEnabled: false,
      customSourceUrl: 'https://fpfss.flashpointarchive.org',
    });

    expect(await MetadataSourceService.getEffectiveSources()).toEqual([]);
  });
});

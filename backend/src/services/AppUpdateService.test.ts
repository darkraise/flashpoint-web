import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

const configMock = vi.hoisted(() => ({ config: { appVersion: '1.0.38' as string | null } }));
vi.mock('../config', () => configMock);

vi.mock('axios', () => ({
  default: { get: vi.fn() },
}));

import axios from 'axios';
import { AppUpdateService } from './AppUpdateService';

/** The shape of the fields this service reads from a GitHub release. */
function release(tagName: string) {
  return {
    data: {
      tag_name: tagName,
      published_at: '2026-08-12T07:11:45Z',
      html_url: `https://github.com/darkraise/flashpoint-web/releases/tag/${tagName}`,
      body: '## Changes since v1.0.37\n\n- feat: something',
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  AppUpdateService.clearCache();
  configMock.config.appVersion = '1.0.38';
});

describe('AppUpdateService.getUpdateInfo', () => {
  it('reports an update when the release is newer', async () => {
    vi.mocked(axios.get).mockResolvedValue(release('v1.0.42'));

    const info = await AppUpdateService.getUpdateInfo();

    expect(info.updateAvailable).toBe(true);
    expect(info.currentVersion).toBe('1.0.38');
    expect(info.latestVersion).toBe('1.0.42');
    expect(info.isUnreleasedBuild).toBe(false);
    expect(info.lastCheckFailed).toBe(false);
    expect(info.publishedAt).toBe('2026-08-12T07:11:45Z');
    expect(info.releaseUrl).toContain('/releases/tag/v1.0.42');
    expect(info.changelog).toContain('Changes since');
    expect(info.checkedAt).not.toBeNull();
  });

  it('reports no update when the versions match', async () => {
    vi.mocked(axios.get).mockResolvedValue(release('v1.0.38'));

    const info = await AppUpdateService.getUpdateInfo();

    expect(info.updateAvailable).toBe(false);
    expect(info.latestVersion).toBe('1.0.38');
  });

  it('reports no update when the running build is newer than the release', async () => {
    configMock.config.appVersion = '1.0.42';
    vi.mocked(axios.get).mockResolvedValue(release('v1.0.38'));

    const info = await AppUpdateService.getUpdateInfo();

    expect(info.updateAvailable).toBe(false);
  });

  it('never claims an update on an unreleased build, but still reports the release', async () => {
    configMock.config.appVersion = '1.0.38-5-gabc123';
    vi.mocked(axios.get).mockResolvedValue(release('v1.0.42'));

    const info = await AppUpdateService.getUpdateInfo();

    expect(info.isUnreleasedBuild).toBe(true);
    expect(info.updateAvailable).toBe(false);
    expect(info.latestVersion).toBe('1.0.42');
    expect(info.changelog).toContain('Changes since');
  });

  it('treats an unset version as an unreleased build', async () => {
    configMock.config.appVersion = null;
    vi.mocked(axios.get).mockResolvedValue(release('v1.0.42'));

    const info = await AppUpdateService.getUpdateInfo();

    expect(info.currentVersion).toBeNull();
    expect(info.isUnreleasedBuild).toBe(true);
    expect(info.updateAvailable).toBe(false);
  });

  it('reports no update when the release tag is malformed', async () => {
    vi.mocked(axios.get).mockResolvedValue(release('v2.0'));

    const info = await AppUpdateService.getUpdateInfo();

    expect(info.updateAvailable).toBe(false);
    expect(info.latestVersion).toBe('2.0');
  });

  it('requests the latest release with a timeout', async () => {
    vi.mocked(axios.get).mockResolvedValue(release('v1.0.38'));

    await AppUpdateService.getUpdateInfo();

    expect(axios.get).toHaveBeenCalledWith(
      'https://api.github.com/repos/darkraise/flashpoint-web/releases/latest',
      expect.objectContaining({ timeout: 10000 })
    );
  });
});

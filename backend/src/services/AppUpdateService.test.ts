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

describe('AppUpdateService caching', () => {
  it('serves the cached release inside the hour', async () => {
    vi.mocked(axios.get).mockResolvedValue(release('v1.0.42'));

    await AppUpdateService.getUpdateInfo();
    await AppUpdateService.getUpdateInfo();

    expect(axios.get).toHaveBeenCalledTimes(1);
  });

  it('refetches after the cache expires', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-08-12T00:00:00Z'));
      vi.mocked(axios.get).mockResolvedValue(release('v1.0.42'));

      await AppUpdateService.getUpdateInfo();
      vi.setSystemTime(new Date('2026-08-12T01:00:01Z'));
      await AppUpdateService.getUpdateInfo();

      expect(axios.get).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('ignores a forced refresh inside the 60 second floor', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-08-12T00:00:00Z'));
      vi.mocked(axios.get).mockResolvedValue(release('v1.0.42'));

      await AppUpdateService.getUpdateInfo();
      vi.setSystemTime(new Date('2026-08-12T00:00:30Z'));
      await AppUpdateService.getUpdateInfo(true);

      expect(axios.get).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('honours a forced refresh past the floor', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-08-12T00:00:00Z'));
      vi.mocked(axios.get).mockResolvedValue(release('v1.0.42'));

      await AppUpdateService.getUpdateInfo();
      vi.setSystemTime(new Date('2026-08-12T00:01:01Z'));
      await AppUpdateService.getUpdateInfo(true);

      expect(axios.get).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('makes one request for concurrent callers on a cold cache', async () => {
    vi.mocked(axios.get).mockResolvedValue(release('v1.0.42'));

    await Promise.all([
      AppUpdateService.getUpdateInfo(),
      AppUpdateService.getUpdateInfo(),
      AppUpdateService.getUpdateInfo(),
    ]);

    expect(axios.get).toHaveBeenCalledTimes(1);
  });
});

describe('AppUpdateService failures', () => {
  it('keeps serving the held release and flags the failed check', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-08-12T00:00:00Z'));
      vi.mocked(axios.get).mockResolvedValue(release('v1.0.42'));
      await AppUpdateService.getUpdateInfo();

      vi.setSystemTime(new Date('2026-08-12T02:00:00Z'));
      vi.mocked(axios.get).mockRejectedValue(new Error('getaddrinfo ENOTFOUND'));
      const info = await AppUpdateService.getUpdateInfo();

      expect(info.lastCheckFailed).toBe(true);
      expect(info.latestVersion).toBe('1.0.42');
      expect(info.updateAvailable).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('reports a failed check with no release when it has never succeeded', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('getaddrinfo ENOTFOUND'));

    const info = await AppUpdateService.getUpdateInfo();

    expect(info.lastCheckFailed).toBe(true);
    expect(info.latestVersion).toBeNull();
    expect(info.checkedAt).toBeNull();
    expect(info.updateAvailable).toBe(false);
    expect(info.currentVersion).toBe('1.0.38');
  });

  it('treats a response with no tag_name as a failed check', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: { body: 'no tag here' } });

    const info = await AppUpdateService.getUpdateInfo();

    expect(info.lastCheckFailed).toBe(true);
    expect(info.latestVersion).toBeNull();
  });

  // Adjusted from the brief: with the failure floor in place, a retry right
  // after a failure is now suppressed rather than firing immediately, so the
  // clock has to move past FORCED_REFRESH_FLOOR_MS before the recovery call
  // is allowed to actually reach the network.
  it('clears the failure flag once a later check succeeds', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-08-12T00:00:00Z'));
      vi.mocked(axios.get).mockRejectedValueOnce(new Error('offline'));
      const failed = await AppUpdateService.getUpdateInfo();
      expect(failed.lastCheckFailed).toBe(true);

      vi.setSystemTime(new Date('2026-08-12T00:01:01Z'));
      vi.mocked(axios.get).mockResolvedValue(release('v1.0.42'));
      const recovered = await AppUpdateService.getUpdateInfo();

      expect(recovered.lastCheckFailed).toBe(false);
      expect(recovered.latestVersion).toBe('1.0.42');
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not retry within 60 seconds of a failure, even so the check is still flagged failed', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-08-12T00:00:00Z'));
      vi.mocked(axios.get).mockRejectedValue(new Error('offline'));
      await AppUpdateService.getUpdateInfo();

      vi.setSystemTime(new Date('2026-08-12T00:00:30Z'));
      const info = await AppUpdateService.getUpdateInfo();

      expect(axios.get).toHaveBeenCalledTimes(1);
      expect(info.lastCheckFailed).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not let a forced refresh bypass the failure floor', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-08-12T00:00:00Z'));
      vi.mocked(axios.get).mockRejectedValue(new Error('offline'));
      await AppUpdateService.getUpdateInfo();

      vi.setSystemTime(new Date('2026-08-12T00:00:30Z'));
      const info = await AppUpdateService.getUpdateInfo(true);

      expect(axios.get).toHaveBeenCalledTimes(1);
      expect(info.lastCheckFailed).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('retries once more than 60 seconds have passed since the failure', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-08-12T00:00:00Z'));
      vi.mocked(axios.get).mockRejectedValue(new Error('offline'));
      await AppUpdateService.getUpdateInfo();

      vi.setSystemTime(new Date('2026-08-12T00:01:01Z'));
      const info = await AppUpdateService.getUpdateInfo();

      expect(axios.get).toHaveBeenCalledTimes(2);
      expect(info.lastCheckFailed).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('serves the cache without a new request once a recovered check is still inside the TTL', async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date('2026-08-12T00:00:00Z'));
      vi.mocked(axios.get).mockRejectedValueOnce(new Error('offline'));
      await AppUpdateService.getUpdateInfo();

      vi.setSystemTime(new Date('2026-08-12T00:01:01Z'));
      vi.mocked(axios.get).mockResolvedValue(release('v1.0.42'));
      const recovered = await AppUpdateService.getUpdateInfo();
      expect(recovered.lastCheckFailed).toBe(false);

      vi.setSystemTime(new Date('2026-08-12T00:30:00Z'));
      const later = await AppUpdateService.getUpdateInfo();

      expect(axios.get).toHaveBeenCalledTimes(2);
      expect(later.lastCheckFailed).toBe(false);
      expect(later.latestVersion).toBe('1.0.42');
    } finally {
      vi.useRealTimers();
    }
  });
});

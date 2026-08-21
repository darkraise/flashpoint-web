import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import nodeFs from 'fs';
import os from 'os';
import nodePath from 'path';
import AdmZip from 'adm-zip';

let distDir: string;
let dataDir: string;
/** Error code the next directory rename should fail with, or null to allow it. */
let renameFailureCode: string | null = null;
/** Path that behaves like a mount point: emptiable, but never unlinkable. */
let mountPointPath: string | null = null;
/** Basename whose copy lands truncated, simulating an interrupted copy. */
let truncateCopyOf: string | null = null;
/** Path whose removal fails, with the error code to fail it with. */
let rmFailure: { path: string; code: string } | null = null;

function errnoError(code: string, message: string): NodeJS.ErrnoException {
  const error = new Error(`${code}: ${message}`) as NodeJS.ErrnoException;
  error.code = code;
  return error;
}

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  const path = await import('path');

  const renameSync = (src: nodeFs.PathLike, dest: nodeFs.PathLike): void => {
    if (renameFailureCode !== null) {
      throw errnoError(renameFailureCode, `rename '${String(src)}' -> '${String(dest)}'`);
    }
    actual.renameSync(src, dest);
  };

  const copyFileSync = (src: nodeFs.PathLike, dest: nodeFs.PathLike): void => {
    if (truncateCopyOf !== null && path.basename(String(dest)) === truncateCopyOf) {
      actual.writeFileSync(dest, '');
      return;
    }
    actual.copyFileSync(src, dest);
  };

  const rmSync = (target: nodeFs.PathLike, options?: nodeFs.RmOptions): void => {
    if (rmFailure !== null && path.resolve(String(target)) === path.resolve(rmFailure.path)) {
      throw errnoError(rmFailure.code, `rm '${String(target)}'`);
    }

    const isMountPoint =
      mountPointPath !== null &&
      path.resolve(String(target)) === path.resolve(mountPointPath) &&
      actual.existsSync(target);

    if (!isMountPoint) {
      actual.rmSync(target, options);
      return;
    }

    // A recursive remove of a mount point deletes the contents, then fails to
    // unlink the directory itself.
    for (const entry of actual.readdirSync(target)) {
      actual.rmSync(path.join(String(target), entry), { recursive: true, force: true });
    }
    throw errnoError('EBUSY', `rmdir '${String(target)}'`);
  };

  return {
    ...actual,
    default: { ...actual, renameSync, rmSync, copyFileSync },
    renameSync,
    rmSync,
    copyFileSync,
  };
});

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

vi.mock('../config', () => ({
  config: {
    serveFrontend: true,
    get frontendDistPath() {
      return distDir;
    },
    get ruffleDataPath() {
      return nodePath.join(dataDir, 'ruffle');
    },
  },
}));

vi.mock('axios', () => ({
  default: { get: vi.fn() },
}));

const settingsState = vi.hoisted(() => ({ channel: 'nightly' as 'stable' | 'nightly' }));

vi.mock('./CachedSystemSettingsService', () => ({
  CachedSystemSettingsService: {
    getInstance: () => ({
      get: (key: string) => (key === 'ruffle.channel' ? settingsState.channel : null),
      set: vi.fn(),
    }),
  },
}));

import axios from 'axios';
import { RuffleService } from './RuffleService';

const NEW_VERSION = '2026-08-01';
const RELEASE = {
  tag_name: `nightly-${NEW_VERSION}`,
  published_at: '2026-08-01T00:00:00Z',
  body: 'Nightly build',
  prerelease: true,
  draft: false,
  assets: [
    {
      name: 'ruffle-nightly-2026_08_01-web-selfhosted.zip',
      browser_download_url: 'https://example.test/ruffle-web-selfhosted.zip',
    },
  ],
};

const STABLE_VERSION = '0.5.0';
const STABLE_RELEASE = {
  tag_name: `v${STABLE_VERSION}`,
  published_at: '2026-08-03T00:00:00Z',
  body: 'Stable release',
  prerelease: false,
  draft: false,
  assets: [
    {
      name: 'ruffle-0.5.0-web-selfhosted.zip',
      browser_download_url: 'https://example.test/ruffle-0.5.0-web-selfhosted.zip',
    },
  ],
};

const OLDER_STABLE_RELEASE = {
  tag_name: 'v0.4.1',
  published_at: '2026-07-20T00:00:00Z',
  body: 'Older stable release',
  prerelease: false,
  draft: false,
  assets: [
    {
      name: 'ruffle-0.4.1-web-selfhosted.zip',
      browser_download_url: 'https://example.test/ruffle-0.4.1-web-selfhosted.zip',
    },
  ],
};

function buildRuffleZip(files: Record<string, string>): Buffer {
  const zip = new AdmZip();
  for (const [name, content] of Object.entries(files)) {
    zip.addFile(name, Buffer.from(content));
  }
  return zip.toBuffer();
}

function mockDownload(
  zipBuffer: Buffer,
  releases: unknown[] = [RELEASE],
  latestStable: unknown = STABLE_RELEASE
): void {
  vi.mocked(axios.get).mockImplementation(async (url: string) => {
    if (url.startsWith('https://api.github.com/')) {
      return url.endsWith('/latest') ? { data: latestStable } : { data: releases };
    }
    return { data: zipBuffer };
  });
}

function installRuffleVersion(version: string): void {
  nodeFs.mkdirSync(ruffleDir(), { recursive: true });
  nodeFs.writeFileSync(nodePath.join(ruffleDir(), 'ruffle.js'), 'old build');
  nodeFs.writeFileSync(nodePath.join(ruffleDir(), 'package.json'), JSON.stringify({ version }));
}

function ruffleDir(): string {
  return nodePath.join(dataDir, 'ruffle');
}

function installExistingRuffle(): void {
  nodeFs.mkdirSync(ruffleDir(), { recursive: true });
  nodeFs.writeFileSync(nodePath.join(ruffleDir(), 'ruffle.js'), 'old build');
  nodeFs.writeFileSync(nodePath.join(ruffleDir(), 'stale.js'), 'removed by update');
  nodeFs.writeFileSync(
    nodePath.join(ruffleDir(), 'package.json'),
    JSON.stringify({ version: '0.2.0-nightly.2026.1.22' })
  );
}

beforeEach(() => {
  distDir = nodeFs.mkdtempSync(nodePath.join(os.tmpdir(), 'fp-ruffle-dist-'));
  dataDir = nodeFs.mkdtempSync(nodePath.join(os.tmpdir(), 'fp-ruffle-data-'));
  renameFailureCode = null;
  mountPointPath = null;
  truncateCopyOf = null;
  rmFailure = null;
  settingsState.channel = 'nightly';
  vi.clearAllMocks();
  mockDownload(
    buildRuffleZip({
      'ruffle.js': 'new build',
      'package.json': JSON.stringify({ version: `0.2.0-nightly.2026.8.1` }),
    })
  );
});

afterEach(() => {
  mountPointPath = null;
  rmFailure = null;
  nodeFs.rmSync(distDir, { recursive: true, force: true });
  nodeFs.rmSync(dataDir, { recursive: true, force: true });
});

describe('RuffleService.updateRuffle', () => {
  it('installs over an existing installation when renames work', async () => {
    installExistingRuffle();

    const result = await new RuffleService().updateRuffle();

    expect(result.success).toBe(true);
    expect(result.version).toBe(NEW_VERSION);
    expect(nodeFs.readFileSync(nodePath.join(ruffleDir(), 'ruffle.js'), 'utf-8')).toBe('new build');
    expect(nodeFs.existsSync(nodePath.join(ruffleDir(), 'stale.js'))).toBe(false);
    expect(nodeFs.existsSync(nodePath.join(dataDir, 'ruffle-backup'))).toBe(false);
    expect(nodeFs.existsSync(nodePath.join(dataDir, 'ruffle-temp'))).toBe(false);
  });

  it('installs when directory renames fail with EXDEV (overlay2 image layer)', async () => {
    installExistingRuffle();
    renameFailureCode = 'EXDEV';

    const result = await new RuffleService().updateRuffle();

    expect(result.success).toBe(true);
    expect(nodeFs.readFileSync(nodePath.join(ruffleDir(), 'ruffle.js'), 'utf-8')).toBe('new build');
    expect(nodeFs.existsSync(nodePath.join(ruffleDir(), 'stale.js'))).toBe(false);
    expect(nodeFs.existsSync(nodePath.join(dataDir, 'ruffle-backup'))).toBe(false);
    expect(nodeFs.existsSync(nodePath.join(dataDir, 'ruffle-temp'))).toBe(false);
  });

  it('installs into a mount point without unlinking or renaming it', async () => {
    installExistingRuffle();
    renameFailureCode = 'EBUSY';
    mountPointPath = ruffleDir();

    const result = await new RuffleService().updateRuffle();

    expect(result.success).toBe(true);
    expect(nodeFs.existsSync(ruffleDir())).toBe(true);
    expect(nodeFs.readFileSync(nodePath.join(ruffleDir(), 'ruffle.js'), 'utf-8')).toBe('new build');
    expect(nodeFs.existsSync(nodePath.join(ruffleDir(), 'stale.js'))).toBe(false);
    expect(nodeFs.existsSync(nodePath.join(dataDir, 'ruffle-backup'))).toBe(false);
  });

  it('installs a first-time copy when nothing is present', async () => {
    renameFailureCode = 'EXDEV';

    const result = await new RuffleService().updateRuffle();

    expect(result.success).toBe(true);
    expect(nodeFs.readFileSync(nodePath.join(ruffleDir(), 'ruffle.js'), 'utf-8')).toBe('new build');
  });

  it('restores the previous installation when the new files fail verification', async () => {
    installExistingRuffle();
    renameFailureCode = 'EXDEV';
    mockDownload(buildRuffleZip({ 'package.json': JSON.stringify({ version: '0.2.0' }) }));

    await expect(new RuffleService().updateRuffle()).rejects.toThrow(/Failed to update Ruffle/);

    expect(nodeFs.readFileSync(nodePath.join(ruffleDir(), 'ruffle.js'), 'utf-8')).toBe('old build');
    expect(nodeFs.existsSync(nodePath.join(ruffleDir(), 'stale.js'))).toBe(true);
    expect(nodeFs.existsSync(nodePath.join(dataDir, 'ruffle-backup'))).toBe(false);
    expect(nodeFs.existsSync(nodePath.join(dataDir, 'ruffle-temp'))).toBe(false);
  });

  it('restores the previous installation when a copied file lands truncated', async () => {
    installExistingRuffle();
    renameFailureCode = 'EXDEV';
    truncateCopyOf = 'package.json';

    await expect(new RuffleService().updateRuffle()).rejects.toThrow(/installation is incomplete/);

    expect(nodeFs.readFileSync(nodePath.join(ruffleDir(), 'ruffle.js'), 'utf-8')).toBe('old build');
    expect(nodeFs.existsSync(nodePath.join(dataDir, 'ruffle-backup'))).toBe(false);
  });

  it('completes when the staging directory cannot be removed after copying', async () => {
    installExistingRuffle();
    renameFailureCode = 'EXDEV';
    rmFailure = { path: nodePath.join(dataDir, 'ruffle-temp'), code: 'EACCES' };

    const result = await new RuffleService().updateRuffle();

    expect(result.success).toBe(true);
    expect(nodeFs.readFileSync(nodePath.join(ruffleDir(), 'ruffle.js'), 'utf-8')).toBe('new build');
  });

  it('restores a mount-point installation when verification fails', async () => {
    installExistingRuffle();
    renameFailureCode = 'EBUSY';
    mountPointPath = ruffleDir();
    mockDownload(buildRuffleZip({ 'package.json': JSON.stringify({ version: '0.2.0' }) }));

    await expect(new RuffleService().updateRuffle()).rejects.toThrow(/Failed to update Ruffle/);

    expect(nodeFs.existsSync(ruffleDir())).toBe(true);
    expect(nodeFs.readFileSync(nodePath.join(ruffleDir(), 'ruffle.js'), 'utf-8')).toBe('old build');
  });
});

describe('RuffleService release channels', () => {
  it('skips a newer stable release while tracking nightlies', async () => {
    mockDownload(
      buildRuffleZip({
        'ruffle.js': 'new build',
        'package.json': JSON.stringify({ version: '0.6.0-nightly.2026.8.1' }),
      }),
      [STABLE_RELEASE, RELEASE]
    );

    const result = await new RuffleService().updateRuffle();

    expect(result.channel).toBe('nightly');
    expect(result.version).toBe(NEW_VERSION);
  });

  it('skips nightlies while tracking stable', async () => {
    settingsState.channel = 'stable';
    mockDownload(
      buildRuffleZip({
        'ruffle.js': 'new build',
        'package.json': JSON.stringify({ version: STABLE_VERSION }),
      }),
      [RELEASE, STABLE_RELEASE]
    );

    const result = await new RuffleService().updateRuffle();

    expect(result.channel).toBe('stable');
    expect(result.version).toBe(STABLE_VERSION);
  });

  it('falls back to the latest-release endpoint when no stable is in the recent feed', async () => {
    settingsState.channel = 'stable';
    mockDownload(
      buildRuffleZip({
        'ruffle.js': 'new build',
        'package.json': JSON.stringify({ version: STABLE_VERSION }),
      }),
      [RELEASE]
    );

    const result = await new RuffleService().updateRuffle();

    expect(result.version).toBe(STABLE_VERSION);
  });

  it('reports a switch when the installed build is on the other channel', async () => {
    settingsState.channel = 'stable';
    installRuffleVersion('0.6.0-nightly.2026.8.1');
    mockDownload(Buffer.alloc(0), [RELEASE, STABLE_RELEASE]);

    const check = await new RuffleService().checkForUpdate();

    expect(check.installedChannel).toBe('nightly');
    expect(check.channel).toBe('stable');
    expect(check.channelSwitch).toBe(true);
    expect(check.updateAvailable).toBe(true);
    expect(check.latestVersion).toBe(STABLE_VERSION);
  });

  it('orders stable versions numerically rather than by date', async () => {
    settingsState.channel = 'stable';
    installRuffleVersion('0.4.1');
    mockDownload(Buffer.alloc(0), [RELEASE, STABLE_RELEASE, OLDER_STABLE_RELEASE]);

    const check = await new RuffleService().checkForUpdate();

    expect(check.channelSwitch).toBe(false);
    expect(check.updateAvailable).toBe(true);
    expect(check.changelog).toContain('v0.5.0');
    expect(check.changelog).not.toContain('v0.4.1');
    expect(check.changelog).not.toContain('nightly-2026-08-01');
  });

  it('reports no update when the installed stable is the latest', async () => {
    settingsState.channel = 'stable';
    installRuffleVersion(STABLE_VERSION);
    mockDownload(Buffer.alloc(0), [RELEASE, STABLE_RELEASE]);

    const check = await new RuffleService().checkForUpdate();

    expect(check.updateAvailable).toBe(false);
  });

  it('compares nightlies by build date', async () => {
    installRuffleVersion('0.2.0-nightly.2026.1.22');
    mockDownload(Buffer.alloc(0), [RELEASE, STABLE_RELEASE]);

    const check = await new RuffleService().checkForUpdate();

    expect(check.channel).toBe('nightly');
    expect(check.channelSwitch).toBe(false);
    expect(check.updateAvailable).toBe(true);
    expect(check.latestVersion).toBe(NEW_VERSION);
  });
});

function installBundledRuffle(): void {
  const bundled = nodePath.join(distDir, 'ruffle');
  nodeFs.mkdirSync(bundled, { recursive: true });
  nodeFs.writeFileSync(nodePath.join(bundled, 'ruffle.js'), 'bundled build');
  nodeFs.writeFileSync(
    nodePath.join(bundled, 'package.json'),
    JSON.stringify({ version: '0.2.0-nightly.2026.1.29' })
  );
}

describe('RuffleService.ensureInstalled', () => {
  it('leaves an existing installation alone', async () => {
    installExistingRuffle();
    installBundledRuffle();

    const result = await new RuffleService().ensureInstalled();

    expect(result).toBe('present');
    expect(nodeFs.readFileSync(nodePath.join(ruffleDir(), 'ruffle.js'), 'utf-8')).toBe('old build');
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('seeds from the bundled copy when nothing is installed', async () => {
    installBundledRuffle();
    const service = new RuffleService();

    const result = await service.ensureInstalled();

    expect(result).toBe('seeded');
    expect(nodeFs.readFileSync(nodePath.join(ruffleDir(), 'ruffle.js'), 'utf-8')).toBe(
      'bundled build'
    );
    expect(service.getCurrentVersion()).toBe('0.2.0-nightly.2026.1.29');
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('downloads when neither an installation nor a bundled copy exists', async () => {
    const result = await new RuffleService().ensureInstalled();

    expect(result).toBe('downloaded');
    expect(nodeFs.readFileSync(nodePath.join(ruffleDir(), 'ruffle.js'), 'utf-8')).toBe('new build');
    expect(axios.get).toHaveBeenCalled();
  });
});

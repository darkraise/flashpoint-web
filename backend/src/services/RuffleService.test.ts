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

import axios from 'axios';
import { RuffleService } from './RuffleService';

const NEW_VERSION = '2026-08-01';
const RELEASE = {
  tag_name: `nightly-${NEW_VERSION}`,
  published_at: '2026-08-01T00:00:00Z',
  body: 'Nightly build',
  assets: [
    {
      name: 'ruffle-nightly-2026_08_01-web-selfhosted.zip',
      browser_download_url: 'https://example.test/ruffle-web-selfhosted.zip',
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

function mockDownload(zipBuffer: Buffer): void {
  vi.mocked(axios.get).mockImplementation(async (url: string) => {
    if (url.startsWith('https://api.github.com/')) {
      return { data: [RELEASE] };
    }
    return { data: zipBuffer };
  });
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

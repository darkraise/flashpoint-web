import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import nodeFs from 'fs';
import os from 'os';
import nodePath from 'path';

/** Error code the next rename should fail with, or null to allow it. */
let renameFailure: { code: string; times: number } | null = null;
let renameAttempts = 0;

vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs/promises')>();
  const rename = async (src: string, dest: string): Promise<void> => {
    renameAttempts += 1;
    if (renameFailure && renameAttempts <= renameFailure.times) {
      const error = new Error(
        `${renameFailure.code}: rename '${src}' -> '${dest}'`
      ) as NodeJS.ErrnoException;
      error.code = renameFailure.code;
      throw error;
    }
    await actual.rename(src, dest);
  };
  return { ...actual, default: { ...actual, rename }, rename };
});

vi.mock('./logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

import { writeFileAtomic } from './atomicFile';

let dir: string;

function siblings(): string[] {
  return nodeFs.readdirSync(dir);
}

beforeEach(() => {
  dir = nodeFs.mkdtempSync(nodePath.join(os.tmpdir(), 'fp-atomic-'));
  renameFailure = null;
  renameAttempts = 0;
});

afterEach(() => {
  nodeFs.rmSync(dir, { recursive: true, force: true });
});

describe('writeFileAtomic', () => {
  it('writes the file and leaves no temp file behind', async () => {
    const target = nodePath.join(dir, 'preferences.json');

    await writeFileAtomic(target, '{"a":1}');

    expect(nodeFs.readFileSync(target, 'utf-8')).toBe('{"a":1}');
    expect(siblings()).toEqual(['preferences.json']);
  });

  it('replaces an existing file', async () => {
    const target = nodePath.join(dir, 'playlist.json');
    nodeFs.writeFileSync(target, 'old');

    await writeFileAtomic(target, 'new');

    expect(nodeFs.readFileSync(target, 'utf-8')).toBe('new');
    expect(siblings()).toEqual(['playlist.json']);
  });

  it('creates missing parent directories', async () => {
    const target = nodePath.join(dir, 'Logos', 'ab', 'cd', 'game.png');

    await writeFileAtomic(target, Buffer.from([1, 2, 3]));

    expect(nodeFs.readFileSync(target)).toEqual(Buffer.from([1, 2, 3]));
  });

  it('retries a rename the OS reports as temporarily locked', async () => {
    const target = nodePath.join(dir, 'locked.json');
    nodeFs.writeFileSync(target, 'old');
    renameFailure = { code: 'EPERM', times: 2 };

    await writeFileAtomic(target, 'new');

    expect(renameAttempts).toBe(3);
    expect(nodeFs.readFileSync(target, 'utf-8')).toBe('new');
    expect(siblings()).toEqual(['locked.json']);
  });

  it('leaves the original intact and removes the temp file when the rename fails', async () => {
    const target = nodePath.join(dir, 'preferences.json');
    nodeFs.writeFileSync(target, 'original');
    renameFailure = { code: 'EROFS', times: 99 };

    await expect(writeFileAtomic(target, 'replacement')).rejects.toThrow(/EROFS/);

    expect(nodeFs.readFileSync(target, 'utf-8')).toBe('original');
    expect(siblings()).toEqual(['preferences.json']);
  });

  it('gives up after the retry budget rather than writing in place', async () => {
    const target = nodePath.join(dir, 'held.json');
    nodeFs.writeFileSync(target, 'original');
    renameFailure = { code: 'EBUSY', times: 99 };

    await expect(writeFileAtomic(target, 'replacement')).rejects.toThrow(/EBUSY/);

    expect(renameAttempts).toBe(3);
    expect(nodeFs.readFileSync(target, 'utf-8')).toBe('original');
    expect(siblings()).toEqual(['held.json']);
  });
});

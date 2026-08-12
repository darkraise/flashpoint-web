import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import nodeFs from 'fs';
import os from 'os';
import nodePath from 'path';

let packsDir: string;
/** When set, copyFile writes this many bytes instead of the real content. */
let truncateCopyTo: number | null = null;

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  const copyFile = async (src: string, dest: string): Promise<void> => {
    if (truncateCopyTo === null) {
      await actual.promises.copyFile(src, dest);
      return;
    }
    const data = await actual.promises.readFile(src);
    await actual.promises.writeFile(dest, data.subarray(0, truncateCopyTo));
  };
  const promises = { ...actual.promises, copyFile };
  return { ...actual, promises, default: { ...actual, promises } };
});

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

vi.mock('./PreferencesService', () => ({
  PreferencesService: {
    getDataPacksPath: async () => packsDir,
  },
}));

import { FileImporter } from './FileImporter';

const GAME_ID = 'abcd1234-1111-2222-3333-444455556666';
const FILENAME = `${GAME_ID}-1700000000000.zip`;

let tempFile: string;

beforeEach(() => {
  packsDir = nodeFs.mkdtempSync(nodePath.join(os.tmpdir(), 'fp-packs-'));
  tempFile = nodePath.join(packsDir, '..', `${GAME_ID}.zip.temp`);
  nodeFs.writeFileSync(tempFile, 'pretend zip payload');
  truncateCopyTo = null;
  vi.clearAllMocks();
});

afterEach(() => {
  nodeFs.rmSync(packsDir, { recursive: true, force: true });
  nodeFs.rmSync(tempFile, { force: true });
});

describe('FileImporter.import', () => {
  it('imports under the launcher-convention filename it is given', async () => {
    const finalPath = await FileImporter.import(GAME_ID, tempFile, FILENAME);

    expect(finalPath).toBe(nodePath.join(packsDir, FILENAME));
    expect(nodeFs.readFileSync(finalPath, 'utf-8')).toBe('pretend zip payload');
    expect(nodeFs.readdirSync(packsDir)).toEqual([FILENAME]);
    expect(nodeFs.existsSync(tempFile)).toBe(false);
  });

  it('leaves no file behind when the copy is truncated', async () => {
    truncateCopyTo = 4;

    await expect(FileImporter.import(GAME_ID, tempFile, FILENAME)).rejects.toThrow(/size mismatch/);

    // Neither the partial nor a final path a later mount could pick up.
    expect(nodeFs.readdirSync(packsDir)).toEqual([]);
    expect(nodeFs.existsSync(tempFile)).toBe(true);
  });

  it('reports a missing source file without creating anything', async () => {
    nodeFs.rmSync(tempFile, { force: true });

    await expect(FileImporter.import(GAME_ID, tempFile, FILENAME)).rejects.toThrow(
      /Temporary file not found/
    );

    expect(nodeFs.readdirSync(packsDir)).toEqual([]);
  });
});

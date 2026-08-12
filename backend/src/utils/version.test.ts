import { describe, it, expect } from 'vitest';
import { compareVersions, isReleaseVersion, normalizeVersion } from './version';

describe('normalizeVersion', () => {
  it('strips a single leading v', () => {
    expect(normalizeVersion('v1.0.38')).toBe('1.0.38');
    expect(normalizeVersion('1.0.38')).toBe('1.0.38');
  });
});

describe('isReleaseVersion', () => {
  it('accepts three numeric parts with or without a v', () => {
    expect(isReleaseVersion('1.0.38')).toBe(true);
    expect(isReleaseVersion('v1.0.38')).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isReleaseVersion(null)).toBe(false);
    expect(isReleaseVersion('')).toBe(false);
    expect(isReleaseVersion('dev')).toBe(false);
    expect(isReleaseVersion('latest')).toBe(false);
    expect(isReleaseVersion('1.0')).toBe(false);
    expect(isReleaseVersion('1.1.0-rc1')).toBe(false);
    expect(isReleaseVersion('1.0.38-5-gabc123')).toBe(false);
  });
});

describe('compareVersions', () => {
  it('reports equality', () => {
    expect(compareVersions('1.0.38', '1.0.38')).toBe(0);
    expect(compareVersions('1.0.38', 'v1.0.38')).toBe(0);
  });

  it('reports a newer right side as negative', () => {
    expect(compareVersions('1.0.38', 'v1.0.42')).toBeLessThan(0);
    expect(compareVersions('1.0.38', 'v1.1.0')).toBeLessThan(0);
    expect(compareVersions('1.0.38', 'v2.0.0')).toBeLessThan(0);
  });

  it('reports an older right side as positive', () => {
    expect(compareVersions('1.0.38', 'v1.0.37')).toBeGreaterThan(0);
  });

  it('compares numerically, not as strings', () => {
    expect(compareVersions('1.0.38', 'v1.0.9')).toBeGreaterThan(0);
  });

  it('returns null when either side is not a release version', () => {
    expect(compareVersions('dev', 'v1.0.38')).toBeNull();
    expect(compareVersions('1.0.38-5-gabc123', 'v1.0.38')).toBeNull();
    expect(compareVersions('1.0.38', 'v2.0')).toBeNull();
    expect(compareVersions('', '')).toBeNull();
  });
});

import { describe, it, expect } from 'vitest';
import {
  buildFilterSearchParams,
  parseFilterParams,
  compressFilters,
  decompressFilters,
} from './filterUrlCompression';

describe('downloaded filter URL round-trip', () => {
  it('round-trips an explicit on', () => {
    const encoded = compressFilters({ downloaded: '1' });
    expect(encoded).not.toBeNull();
    expect(decompressFilters(encoded ?? '')?.downloaded).toBe('1');
  });

  it('round-trips an explicit off rather than dropping it', () => {
    const encoded = compressFilters({ downloaded: '0' });
    expect(encoded).not.toBeNull();
    expect(decompressFilters(encoded ?? '')?.downloaded).toBe('0');
  });

  it('survives buildFilterSearchParams and parseFilterParams', () => {
    const params = buildFilterSearchParams({ downloaded: '0', search: 'sonic' });
    const parsed = parseFilterParams(params);
    expect(parsed.downloaded).toBe('0');
    expect(parsed.search).toBe('sonic');
  });

  it('leaves downloaded undefined when absent', () => {
    const parsed = parseFilterParams(new URLSearchParams());
    expect(parsed.downloaded).toBeUndefined();
  });
});

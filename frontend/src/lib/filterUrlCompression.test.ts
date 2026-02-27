import { describe, it, expect } from 'vitest';
import {
  compressFilters,
  decompressFilters,
  parseFilterParams,
  buildFilterSearchParams,
  hasLegacyParams,
  FilterUrlParams,
} from './filterUrlCompression';

describe('filterUrlCompression', () => {
  describe('compressFilters', () => {
    it('should return null for empty params', () => {
      const result = compressFilters({});
      expect(result).toBeNull();
    });

    it('should compress simple search', () => {
      const result = compressFilters({ search: 'mario' });
      expect(result).toBeDefined();
      expect(result).toContain('q.mario');
    });

    it('should compress platform filter', () => {
      const result = compressFilters({ platform: 'Flash' });
      expect(result).toContain('p.Flash');
    });

    it('should compress multiple filters', () => {
      const result = compressFilters({
        search: 'mario',
        platform: 'Flash',
        tags: 'Action',
      });
      expect(result).toBeDefined();
      expect(result).toContain('q.mario');
      expect(result).toContain('p.Flash');
      expect(result).toContain('t.Action');
    });

    it('should compress year range', () => {
      const result = compressFilters({
        yearFrom: 2000,
        yearTo: 2010,
      });
      expect(result).toContain('f.2000');
      expect(result).toContain('e.2010');
    });

    it('should escape special characters', () => {
      const result = compressFilters({
        search: 'value.with.dots',
      });
      expect(result).toBeDefined();
      // Dots should be escaped
      expect(result).not.toContain('.with.');
    });

    it('should escape commas as dashes', () => {
      const result = compressFilters({
        tags: 'Action,Adventure',
      });
      expect(result).toBeDefined();
      // Comma should become dash
      expect(result).toContain('-');
    });
  });

  describe('decompressFilters', () => {
    it('should decompress simple search', () => {
      const result = decompressFilters('q.mario');
      expect(result).toEqual({ search: 'mario' });
    });

    it('should decompress multiple filters', () => {
      const result = decompressFilters('q.mario_p.Flash_t.Action');
      expect(result).toEqual({
        search: 'mario',
        platform: 'Flash',
        tags: 'Action',
      });
    });

    it('should decompress year range', () => {
      const result = decompressFilters('f.2000_e.2010');
      expect(result).toEqual({
        yearFrom: 2000,
        yearTo: 2010,
      });
    });

    it('should unescape special characters', () => {
      const compressed = compressFilters({ search: 'test.value' });
      const result = decompressFilters(compressed!);
      expect(result?.search).toBe('test.value');
    });

    it('should unescape commas from dashes', () => {
      const compressed = compressFilters({ tags: 'Action,Adventure' });
      const result = decompressFilters(compressed!);
      expect(result?.tags).toBe('Action,Adventure');
    });

    it('should return null for invalid input', () => {
      const result = decompressFilters('invalid');
      expect(result).toBeNull();
    });

    it('should handle compressed format with ~ prefix', () => {
      // Create a large filter state that would trigger compression
      const largeFilter = {
        search: 'a'.repeat(100),
        tags: 'b'.repeat(100),
      };
      const compressed = compressFilters(largeFilter);

      if (compressed?.startsWith('~')) {
        const result = decompressFilters(compressed);
        expect(result?.search).toBe(largeFilter.search);
        expect(result?.tags).toBe(largeFilter.tags);
      }
    });
  });

  describe('roundtrip compression', () => {
    it('should preserve all filter types', () => {
      const original: FilterUrlParams = {
        search: 'test game',
        platform: 'Flash',
        series: 'Pokemon',
        developers: 'Nintendo',
        publishers: 'Sega',
        playModes: 'Single Player',
        languages: 'en',
        tags: 'Action',
        yearFrom: 1995,
        yearTo: 2020,
        fo: 'Platform,Series,Tag',
      };

      const compressed = compressFilters(original);
      const decompressed = decompressFilters(compressed!);

      expect(decompressed?.search).toBe(original.search);
      expect(decompressed?.platform).toBe(original.platform);
      expect(decompressed?.series).toBe(original.series);
      expect(decompressed?.developers).toBe(original.developers);
      expect(decompressed?.publishers).toBe(original.publishers);
      expect(decompressed?.playModes).toBe(original.playModes);
      expect(decompressed?.languages).toBe(original.languages);
      expect(decompressed?.tags).toBe(original.tags);
      expect(decompressed?.yearFrom).toBe(original.yearFrom);
      expect(decompressed?.yearTo).toBe(original.yearTo);
      expect(decompressed?.fo).toBe(original.fo);
    });

    it('should handle special characters', () => {
      const original: FilterUrlParams = {
        search: 'test.value_with-special~chars',
        tags: 'Action,Adventure,RPG',
      };

      const compressed = compressFilters(original);
      const decompressed = decompressFilters(compressed!);

      expect(decompressed?.search).toBe(original.search);
      expect(decompressed?.tags).toBe(original.tags);
    });

    it('should handle language codes with dashes', () => {
      const original: FilterUrlParams = {
        languages: 'pt-br',
      };

      const compressed = compressFilters(original);
      const decompressed = decompressFilters(compressed!);

      expect(decompressed?.languages).toBe('pt-br');
    });
  });

  describe('parseFilterParams', () => {
    it('should parse compressed format', () => {
      const params = new URLSearchParams();
      params.set('f', 'q.mario_p.Flash');

      const result = parseFilterParams(params);

      expect(result.search).toBe('mario');
      expect(result.platform).toBe('Flash');
    });

    it('should parse sort and page separately', () => {
      const params = new URLSearchParams();
      params.set('f', 'q.mario');
      params.set('sortBy', 'dateAdded');
      params.set('sortOrder', 'desc');
      params.set('page', '5');

      const result = parseFilterParams(params);

      expect(result.search).toBe('mario');
      expect(result.sortBy).toBe('dateAdded');
      expect(result.sortOrder).toBe('desc');
      expect(result.page).toBe(5);
    });

    it('should parse legacy format as fallback', () => {
      const params = new URLSearchParams();
      params.set('search', 'mario');
      params.set('platform', 'Flash');

      const result = parseFilterParams(params);

      expect(result.search).toBe('mario');
      expect(result.platform).toBe('Flash');
    });

    it('should handle invalid page number', () => {
      const params = new URLSearchParams();
      params.set('page', 'invalid');

      const result = parseFilterParams(params);

      expect(result.page).toBeUndefined();
    });

    it('should parse year filters', () => {
      const params = new URLSearchParams();
      params.set('yearFrom', '2000');
      params.set('yearTo', '2010');

      const result = parseFilterParams(params);

      expect(result.yearFrom).toBe(2000);
      expect(result.yearTo).toBe(2010);
    });
  });

  describe('buildFilterSearchParams', () => {
    it('should build compressed params', () => {
      const params = buildFilterSearchParams({
        search: 'mario',
        platform: 'Flash',
      });

      expect(params.has('f')).toBe(true);
      expect(params.get('f')).toContain('q.mario');
    });

    it('should include sortBy when not default', () => {
      const params = buildFilterSearchParams({
        sortBy: 'dateAdded',
      });

      expect(params.get('sortBy')).toBe('dateAdded');
    });

    it('should exclude sortBy when default (title)', () => {
      const params = buildFilterSearchParams({
        sortBy: 'title',
      });

      expect(params.has('sortBy')).toBe(false);
    });

    it('should include sortOrder when not default', () => {
      const params = buildFilterSearchParams({
        sortOrder: 'desc',
      });

      expect(params.get('sortOrder')).toBe('desc');
    });

    it('should exclude sortOrder when default (asc)', () => {
      const params = buildFilterSearchParams({
        sortOrder: 'asc',
      });

      expect(params.has('sortOrder')).toBe(false);
    });

    it('should include page when greater than 1', () => {
      const params = buildFilterSearchParams({
        page: 3,
      });

      expect(params.get('page')).toBe('3');
    });

    it('should exclude page when 1', () => {
      const params = buildFilterSearchParams({
        page: 1,
      });

      expect(params.has('page')).toBe(false);
    });
  });

  describe('hasLegacyParams', () => {
    it('should return true for search param', () => {
      const params = new URLSearchParams();
      params.set('search', 'mario');

      expect(hasLegacyParams(params)).toBe(true);
    });

    it('should return true for platform param', () => {
      const params = new URLSearchParams();
      params.set('platform', 'Flash');

      expect(hasLegacyParams(params)).toBe(true);
    });

    it('should return true for any filter param', () => {
      const legacyKeys = [
        'search',
        'platform',
        'series',
        'developers',
        'publishers',
        'playModes',
        'languages',
        'tags',
        'yearFrom',
        'yearTo',
        'fo',
      ];

      for (const key of legacyKeys) {
        const params = new URLSearchParams();
        params.set(key, 'value');
        expect(hasLegacyParams(params)).toBe(true);
      }
    });

    it('should return false for compressed format only', () => {
      const params = new URLSearchParams();
      params.set('f', 'q.mario');

      expect(hasLegacyParams(params)).toBe(false);
    });

    it('should return false for empty params', () => {
      const params = new URLSearchParams();

      expect(hasLegacyParams(params)).toBe(false);
    });
  });

  describe('filter order encoding', () => {
    it('should encode filter order with abbreviations', () => {
      const result = compressFilters({
        fo: 'Language,Series,Tag',
      });

      expect(result).toContain('o.L.R.T');
    });

    it('should decode filter order from abbreviations', () => {
      const result = decompressFilters('o.L.R.T');

      expect(result?.fo).toBe('Language,Series,Tag');
    });

    it('should roundtrip filter order', () => {
      const original: FilterUrlParams = {
        fo: 'Platform,Developer,Publisher,Play Mode',
      };

      const compressed = compressFilters(original);
      const decompressed = decompressFilters(compressed!);

      expect(decompressed?.fo).toBe(original.fo);
    });
  });
});

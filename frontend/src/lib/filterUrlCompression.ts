import LZString from 'lz-string';

/**
 * Full URL params including sort and pagination
 */
export interface FilterUrlParams {
  search?: string;
  platform?: string;
  series?: string;
  developers?: string;
  publishers?: string;
  playModes?: string;
  languages?: string;
  tags?: string;
  yearFrom?: number;
  yearTo?: number;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  fo?: string; // filter order
}

// Filter order category abbreviations
const CATEGORY_TO_ABBR: Record<string, string> = {
  Search: 'S',
  Platform: 'P',
  Series: 'R',
  Developer: 'D',
  Publisher: 'B',
  'Play Mode': 'M',
  Language: 'L',
  Tag: 'T',
  Year: 'Y',
};

const ABBR_TO_CATEGORY: Record<string, string> = Object.fromEntries(
  Object.entries(CATEGORY_TO_ABBR).map(([k, v]) => [v, k])
);

/**
 * Escape special characters in values for URL-safe format
 * Order matters: escape ~ first (our escape char), then other delimiters
 */
function escapeValue(value: string): string {
  return value
    .replace(/~/g, '~0') // ~ -> ~0 (escape char first)
    .replace(/\./g, '~1') // . -> ~1
    .replace(/_/g, '~2') // _ -> ~2
    .replace(/-/g, '~3') // - -> ~3 (escape original dashes like pt-br)
    .replace(/,/g, '-'); // , -> - (list separator)
}

/**
 * Unescape special characters from URL-safe format
 * Order matters: restore list separator first, then escaped chars
 */
function unescapeValue(value: string): string {
  return value
    .replace(/-/g, ',') // - -> , (list separator)
    .replace(/~3/g, '-') // ~3 -> - (restore original dashes)
    .replace(/~2/g, '_') // ~2 -> _
    .replace(/~1/g, '.') // ~1 -> .
    .replace(/~0/g, '~'); // ~0 -> ~
}

/**
 * Encode filter order using abbreviations
 * "Language,Series,Tag" -> "L.R.T"
 */
function encodeFilterOrder(fo: string): string {
  return fo
    .split(',')
    .map((cat) => CATEGORY_TO_ABBR[cat] ?? cat)
    .join('.');
}

/**
 * Decode filter order from abbreviations
 * "L.R.T" -> "Language,Series,Tag"
 */
function decodeFilterOrder(encoded: string): string {
  return encoded
    .split('.')
    .map((abbr) => ABBR_TO_CATEGORY[abbr] ?? abbr)
    .join(',');
}

/**
 * Build URL-safe format string: key.value_key.value
 * Uses only unreserved URI characters: A-Z a-z 0-9 - _ . ~
 */
function toUrlSafeFormat(params: FilterUrlParams): string | null {
  const parts: string[] = [];

  // Process each param with single-char key
  // Format: key.value (dot separates key from value)
  if (params.search) parts.push(`q.${escapeValue(params.search)}`);
  if (params.platform) parts.push(`p.${escapeValue(params.platform)}`);
  if (params.series) parts.push(`s.${escapeValue(params.series)}`);
  if (params.developers) parts.push(`d.${escapeValue(params.developers)}`);
  if (params.publishers) parts.push(`b.${escapeValue(params.publishers)}`);
  if (params.playModes) parts.push(`m.${escapeValue(params.playModes)}`);
  if (params.languages) parts.push(`l.${escapeValue(params.languages)}`);
  if (params.tags) parts.push(`t.${escapeValue(params.tags)}`);
  if (params.yearFrom !== undefined) parts.push(`f.${params.yearFrom}`);
  if (params.yearTo !== undefined) parts.push(`e.${params.yearTo}`);
  if (params.fo) parts.push(`o.${encodeFilterOrder(params.fo)}`);

  // Join with underscore (URL-safe)
  return parts.length > 0 ? parts.join('_') : null;
}

/**
 * Parse URL-safe format string back to params
 */
function fromUrlSafeFormat(encoded: string): FilterUrlParams | null {
  try {
    const params: FilterUrlParams = {};
    const parts = encoded.split('_');

    for (const part of parts) {
      const dotIdx = part.indexOf('.');
      if (dotIdx === -1) continue;

      const key = part.slice(0, dotIdx);
      const value = part.slice(dotIdx + 1);

      switch (key) {
        case 'q':
          params.search = unescapeValue(value);
          break;
        case 'p':
          params.platform = unescapeValue(value);
          break;
        case 's':
          params.series = unescapeValue(value);
          break;
        case 'd':
          params.developers = unescapeValue(value);
          break;
        case 'b':
          params.publishers = unescapeValue(value);
          break;
        case 'm':
          params.playModes = unescapeValue(value);
          break;
        case 'l':
          params.languages = unescapeValue(value);
          break;
        case 't':
          params.tags = unescapeValue(value);
          break;
        case 'f': {
          const parsed = parseInt(value, 10);
          if (!isNaN(parsed)) params.yearFrom = parsed;
          break;
        }
        case 'e': {
          const parsed = parseInt(value, 10);
          if (!isNaN(parsed)) params.yearTo = parsed;
          break;
        }
        case 'o':
          params.fo = decodeFilterOrder(value);
          break;
      }
    }

    return Object.keys(params).length > 0 ? params : null;
  } catch {
    return null;
  }
}

/**
 * Compress filter state to a URL-safe string
 * Uses URL-safe format by default, lz-string only for very large states
 */
export function compressFilters(params: FilterUrlParams): string | null {
  const urlSafe = toUrlSafeFormat(params);
  if (!urlSafe) return null;

  // Try lz-string compression for large filter states
  const compressed = LZString.compressToEncodedURIComponent(urlSafe);

  // Use compressed only if it's significantly shorter (prefix with ~)
  // Add some margin because ~ prefix and potential issues
  if (compressed && compressed.length + 2 < urlSafe.length * 0.7) {
    return '~' + compressed;
  }

  // Use URL-safe format directly (no encoding needed!)
  return urlSafe;
}

/**
 * Decompress filter state from URL string
 */
export function decompressFilters(encoded: string): FilterUrlParams | null {
  try {
    if (encoded.startsWith('~')) {
      // Compressed format - decompress with lz-string
      const decompressed = LZString.decompressFromEncodedURIComponent(encoded.slice(1));
      if (!decompressed) return null;
      return fromUrlSafeFormat(decompressed);
    }

    // URL-safe format - parse directly
    return fromUrlSafeFormat(encoded);
  } catch {
    return null;
  }
}

/**
 * Try to parse old colon/pipe format (l:en|s:Pokemon)
 */
function tryParseColonPipeFormat(encoded: string): FilterUrlParams | null {
  try {
    // URL decode first
    const decoded = decodeURIComponent(encoded);
    if (!decoded.includes(':') || !decoded.includes('|')) return null;

    const params: FilterUrlParams = {};
    const parts = decoded.split('|');

    for (const part of parts) {
      const colonIdx = part.indexOf(':');
      if (colonIdx === -1) continue;

      const key = part.slice(0, colonIdx);
      const value = part.slice(colonIdx + 1);

      switch (key) {
        case 'q':
          params.search = value;
          break;
        case 'p':
          params.platform = value;
          break;
        case 's':
          params.series = value;
          break;
        case 'd':
          params.developers = value;
          break;
        case 'b':
          params.publishers = value;
          break;
        case 'm':
          params.playModes = value;
          break;
        case 'l':
          params.languages = value;
          break;
        case 't':
          params.tags = value;
          break;
        case 'f': {
          const parsed = parseInt(value, 10);
          if (!isNaN(parsed)) params.yearFrom = parsed;
          break;
        }
        case 'e': {
          const parsed = parseInt(value, 10);
          if (!isNaN(parsed)) params.yearTo = parsed;
          break;
        }
        case 'o':
          // Old format used comma-separated abbreviations
          params.fo = value
            .split(',')
            .map((abbr) => ABBR_TO_CATEGORY[abbr] ?? abbr)
            .join(',');
          break;
      }
    }

    return Object.keys(params).length > 0 ? params : null;
  } catch {
    return null;
  }
}

/**
 * Try to parse old JSON-based compressed format (for backward compatibility)
 */
function tryParseOldJsonFormat(encoded: string): FilterUrlParams | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) return null;

    const state = JSON.parse(json);
    const params: FilterUrlParams = {};

    // Old format used short keys like sr, dv, pb, etc.
    if (state.q) params.search = state.q;
    if (state.p) params.platform = state.p;
    if (state.sr) params.series = state.sr;
    if (state.dv) params.developers = state.dv;
    if (state.pb) params.publishers = state.pb;
    if (state.pm) params.playModes = state.pm;
    if (state.ln) params.languages = state.ln;
    if (state.tg) params.tags = state.tg;
    if (state.yf !== undefined) params.yearFrom = state.yf;
    if (state.yt !== undefined) params.yearTo = state.yt;
    if (state.fo) params.fo = state.fo;

    return Object.keys(params).length > 0 ? params : null;
  } catch {
    return null;
  }
}

/**
 * Safely parse an integer from a string, returning undefined if invalid
 */
function safeParseInt(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? undefined : parsed;
}

/**
 * Parse URL search params - handles compressed, compact, and legacy formats
 * Returns normalized filter params
 */
export function parseFilterParams(searchParams: URLSearchParams): FilterUrlParams {
  // Check for compressed/compact format first
  const encoded = searchParams.get('f');
  if (encoded) {
    // Try formats in order: new URL-safe -> old colon/pipe -> old JSON
    let decompressed = decompressFilters(encoded);

    if (!decompressed) {
      decompressed = tryParseColonPipeFormat(encoded);
    }

    if (!decompressed) {
      decompressed = tryParseOldJsonFormat(encoded);
    }

    if (decompressed) {
      // Also get sort/page from URL (not compressed)
      return {
        ...decompressed,
        sortBy: searchParams.get('sortBy') ?? undefined,
        sortOrder: searchParams.get('sortOrder') ?? undefined,
        page: safeParseInt(searchParams.get('page')),
      };
    }
  }

  // Fallback to legacy format (individual params)
  return {
    search: searchParams.get('search') ?? undefined,
    platform: searchParams.get('platform') ?? undefined,
    series: searchParams.get('series') ?? undefined,
    developers: searchParams.get('developers') ?? undefined,
    publishers: searchParams.get('publishers') ?? undefined,
    playModes: searchParams.get('playModes') ?? undefined,
    languages: searchParams.get('languages') ?? undefined,
    tags: searchParams.get('tags') ?? undefined,
    yearFrom: safeParseInt(searchParams.get('yearFrom')),
    yearTo: safeParseInt(searchParams.get('yearTo')),
    sortBy: searchParams.get('sortBy') ?? undefined,
    sortOrder: searchParams.get('sortOrder') ?? undefined,
    page: safeParseInt(searchParams.get('page')),
    fo: searchParams.get('fo') ?? undefined,
  };
}

/**
 * Build URL search params from filter state
 * Uses compressed format for filters, keeps sort/page as regular params
 */
export function buildFilterSearchParams(params: FilterUrlParams): URLSearchParams {
  const newParams = new URLSearchParams();

  // Compress filter state
  const compressed = compressFilters(params);
  if (compressed) {
    newParams.set('f', compressed);
  }

  // Keep sort and page as regular params (for readability and SEO)
  if (params.sortBy && params.sortBy !== 'title') {
    newParams.set('sortBy', params.sortBy);
  }
  if (params.sortOrder && params.sortOrder !== 'asc') {
    newParams.set('sortOrder', params.sortOrder);
  }
  if (params.page && params.page > 1) {
    newParams.set('page', params.page.toString());
  }

  return newParams;
}

/**
 * Check if URL has legacy (uncompressed) filter params
 */
export function hasLegacyParams(searchParams: URLSearchParams): boolean {
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
  return legacyKeys.some((key) => searchParams.has(key));
}

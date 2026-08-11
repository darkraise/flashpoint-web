import { describe, it, expect } from 'vitest';
import { normalizeOrigin, parseOriginList, isOriginAllowed } from './origins';

describe('normalizeOrigin', () => {
  it('drops the default port for http and https', () => {
    expect(normalizeOrigin('http://192.168.0.118:80')).toBe('http://192.168.0.118');
    expect(normalizeOrigin('https://example.com:443')).toBe('https://example.com');
  });

  it('keeps a non-default port', () => {
    expect(normalizeOrigin('http://192.168.0.118:8080')).toBe('http://192.168.0.118:8080');
  });

  it('drops path, query and trailing slash', () => {
    expect(normalizeOrigin('http://example.com/app?x=1')).toBe('http://example.com');
    expect(normalizeOrigin('http://example.com/')).toBe('http://example.com');
  });

  it('returns null for values that are not absolute URLs', () => {
    expect(normalizeOrigin('example.com')).toBeNull();
    expect(normalizeOrigin('')).toBeNull();
    expect(normalizeOrigin('   ')).toBeNull();
  });
});

describe('parseOriginList', () => {
  it('parses a comma-separated list and normalizes each entry', () => {
    expect(parseOriginList('http://192.168.0.118:80, https://flashpoint.example.com')).toEqual([
      'http://192.168.0.118',
      'https://flashpoint.example.com',
    ]);
  });

  it('ignores blank and unparseable entries', () => {
    expect(parseOriginList('http://a.example, , not-a-url,https://b.example')).toEqual([
      'http://a.example',
      'https://b.example',
    ]);
  });

  it('de-duplicates entries that normalize to the same origin', () => {
    expect(parseOriginList('http://a.example:80,http://a.example')).toEqual(['http://a.example']);
  });

  it('returns an empty list when unset', () => {
    expect(parseOriginList(undefined)).toEqual([]);
  });
});

describe('isOriginAllowed', () => {
  const noDomains = new Set<string>();

  it('allows a request without an Origin header', () => {
    expect(
      isOriginAllowed({
        origin: undefined,
        host: '192.168.0.118',
        configuredOrigins: [],
        domainOrigins: noDomains,
      })
    ).toBe(true);
  });

  it('allows a same-origin request even when nothing is configured', () => {
    expect(
      isOriginAllowed({
        origin: 'http://192.168.0.118',
        host: '192.168.0.118',
        configuredOrigins: [],
        domainOrigins: noDomains,
      })
    ).toBe(true);
  });

  it('allows a same-origin request on a non-default port', () => {
    expect(
      isOriginAllowed({
        origin: 'http://192.168.0.118:8080',
        host: '192.168.0.118:8080',
        configuredOrigins: [],
        domainOrigins: noDomains,
      })
    ).toBe(true);
  });

  it('allows a configured origin written with an explicit default port', () => {
    expect(
      isOriginAllowed({
        origin: 'http://192.168.0.118',
        host: 'internal-proxy:3100',
        configuredOrigins: parseOriginList('http://192.168.0.118:80'),
        domainOrigins: noDomains,
      })
    ).toBe(true);
  });

  it('allows every origin in a multi-entry DOMAIN', () => {
    const configuredOrigins = parseOriginList(
      'http://192.168.0.118,https://flashpoint.example.com'
    );

    expect(
      isOriginAllowed({
        origin: 'https://flashpoint.example.com',
        host: 'internal-proxy:3100',
        configuredOrigins,
        domainOrigins: noDomains,
      })
    ).toBe(true);
  });

  it('allows an origin from the domains table', () => {
    expect(
      isOriginAllowed({
        origin: 'https://shared.example.com',
        host: 'internal-proxy:3100',
        configuredOrigins: [],
        domainOrigins: new Set(['https://shared.example.com']),
      })
    ).toBe(true);
  });

  it('rejects an unknown cross-origin request', () => {
    expect(
      isOriginAllowed({
        origin: 'https://evil.example',
        host: '192.168.0.118',
        configuredOrigins: parseOriginList('http://192.168.0.118'),
        domainOrigins: noDomains,
      })
    ).toBe(false);
  });

  it('rejects an origin that only shares a hostname prefix', () => {
    expect(
      isOriginAllowed({
        origin: 'http://192.168.0.1180',
        host: '192.168.0.118',
        configuredOrigins: parseOriginList('http://192.168.0.118'),
        domainOrigins: noDomains,
      })
    ).toBe(false);
  });

  it('rejects a scheme mismatch against a configured origin', () => {
    expect(
      isOriginAllowed({
        origin: 'http://flashpoint.example.com',
        host: 'internal-proxy:3100',
        configuredOrigins: parseOriginList('https://flashpoint.example.com'),
        domainOrigins: noDomains,
      })
    ).toBe(false);
  });

  it('rejects an unparseable Origin header', () => {
    expect(
      isOriginAllowed({
        origin: 'null',
        host: '192.168.0.118',
        configuredOrigins: [],
        domainOrigins: noDomains,
      })
    ).toBe(false);
  });
});

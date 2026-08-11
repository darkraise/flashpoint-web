/**
 * Origin matching for CORS.
 *
 * Browsers serialize origins without the scheme's default port, so a page at
 * http://host:80 sends "Origin: http://host". Comparing raw configuration
 * strings therefore fails for exactly the deployments that use port 80 or 443.
 * Everything here compares normalized origins instead.
 */

/** Normalize to scheme://host[:port], dropping default ports. Null if unparseable. */
export function normalizeOrigin(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    return url.origin === 'null' ? null : url.origin;
  } catch {
    return null;
  }
}

/** Parse a comma-separated DOMAIN value into normalized origins, preserving order. */
export function parseOriginList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  const origins: string[] = [];
  for (const entry of value.split(',')) {
    const normalized = normalizeOrigin(entry);
    if (normalized !== null && !origins.includes(normalized)) {
      origins.push(normalized);
    }
  }

  return origins;
}

interface OriginCheck {
  /** Origin header from the request; undefined for same-origin GETs and non-browser clients. */
  readonly origin: string | undefined;
  /** Host header from the request, including a non-default port. */
  readonly host: string | undefined;
  /** Request scheme ('http' or 'https'), honouring X-Forwarded-Proto behind a trusted proxy. */
  readonly protocol?: string;
  /** Origins from the DOMAIN setting, already normalized. */
  readonly configuredOrigins: readonly string[];
  /** Origins derived from the domains table, already normalized. */
  readonly domainOrigins: ReadonlySet<string>;
}

/**
 * A same-origin request is always allowed: the browser sends an Origin header on
 * same-origin POST/PUT/DELETE, and rejecting those breaks a single-image
 * deployment (SERVE_FRONTEND) at any address the operator did not pre-declare.
 */
export function isOriginAllowed({
  origin,
  host,
  protocol,
  configuredOrigins,
  domainOrigins,
}: OriginCheck): boolean {
  if (origin === undefined) {
    return true;
  }

  const normalized = normalizeOrigin(origin);
  if (normalized === null) {
    return false;
  }

  if (host !== undefined && host !== '' && protocol !== undefined && protocol !== '') {
    // Compare the whole origin, not just the host: http://example.com and
    // https://example.com are different origins, and treating them as one would
    // let a plaintext page claim same-origin against an HTTPS deployment.
    const requestOrigin = normalizeOrigin(`${protocol}://${host}`);
    if (requestOrigin !== null && requestOrigin === normalized) {
      return true;
    }
  }

  return configuredOrigins.includes(normalized) || domainOrigins.has(normalized);
}

/**
 * Trusted metadata source hosts.
 *
 * Metadata sync rewrites rows in flashpoint.sqlite, so the source is restricted
 * to hosts the project trusts rather than any URL an admin can type.
 */
export const ALLOWED_METADATA_HOSTS: readonly string[] = [
  'fpfss.unstable.life',
  'fpfss.flashpointarchive.org',
];

/** The source the Flashpoint Infinity build ships with, used as the default offer. */
export const DEFAULT_METADATA_SOURCE_URL = 'https://fpfss.flashpointarchive.org';

export function isAllowedMetadataSourceUrl(baseUrl: string): boolean {
  try {
    return ALLOWED_METADATA_HOSTS.includes(new URL(baseUrl).hostname);
  } catch {
    return false;
  }
}

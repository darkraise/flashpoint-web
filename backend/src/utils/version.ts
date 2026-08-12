/** A release version is exactly three numeric parts, with an optional leading v. */
const RELEASE_VERSION = /^v?(\d+)\.(\d+)\.(\d+)$/;

/** GitHub tags carry a leading v that APP_VERSION does not. */
export function normalizeVersion(value: string): string {
  const trimmed = value.trim();
  return trimmed.startsWith('v') ? trimmed.slice(1) : trimmed;
}

export function isReleaseVersion(value: string | null): boolean {
  return typeof value === 'string' && RELEASE_VERSION.test(value.trim());
}

/**
 * Negative when a is older than b, positive when newer, zero when equal.
 * Null when either side is not a release version, which is what keeps an
 * unreleased build from claiming to be behind.
 */
export function compareVersions(a: string, b: string): number | null {
  const left = RELEASE_VERSION.exec(a.trim());
  const right = RELEASE_VERSION.exec(b.trim());

  if (!left || !right) {
    return null;
  }

  for (let part = 1; part <= 3; part++) {
    const difference = Number(left[part]) - Number(right[part]);
    if (difference !== 0) {
      return difference;
    }
  }

  return 0;
}

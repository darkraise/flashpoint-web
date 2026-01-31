/**
 * Browser API Extensions
 *
 * Type definitions for non-standard browser APIs and experimental features
 */

/**
 * Network Information API
 * @see https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation
 */
interface NetworkInformation {
  downlink?: number;
  effectiveType?: '4g' | '3g' | '2g' | 'slow-2g';
  rtt?: number;
  saveData?: boolean;
}

/**
 * Extended Navigator interface with connection properties
 */
interface Navigator {
  connection?: NetworkInformation;
  mozConnection?: NetworkInformation;
  webkitConnection?: NetworkInformation;
}

/**
 * Extended Window interface for legacy browser detection
 */
interface Window {
  opera?: string;
}

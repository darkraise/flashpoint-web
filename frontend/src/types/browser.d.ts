/** @see https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation */
interface NetworkInformation {
  downlink?: number;
  effectiveType?: '4g' | '3g' | '2g' | 'slow-2g';
  rtt?: number;
  saveData?: boolean;
}

interface Navigator {
  connection?: NetworkInformation;
  mozConnection?: NetworkInformation;
  webkitConnection?: NetworkInformation;
}

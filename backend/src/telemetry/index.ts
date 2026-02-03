/**
 * OpenTelemetry Initialization
 *
 * IMPORTANT: This must be imported FIRST, before any other modules,
 * to ensure auto-instrumentation works correctly.
 *
 * Usage in server.ts:
 * ```typescript
 * import './telemetry'; // Must be first!
 * import express from 'express';
 * // ... rest of imports
 * ```
 */

import { initializeTelemetry } from './otel';

// Initialize telemetry immediately
initializeTelemetry();

// Re-export for convenience
export {
  initializeTelemetry,
  shutdownTelemetry,
  isTelemetryEnabled,
  getTelemetryConfig,
} from './otel';

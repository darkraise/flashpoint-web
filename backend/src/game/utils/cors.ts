import { ServerResponse } from 'http';

interface CorsSettings {
  allowCrossDomain: boolean;
}

/**
 * Sets CORS headers on the response if cross-domain is enabled.
 *
 * Note: COEP headers (Cross-Origin-Embedder-Policy, Cross-Origin-Resource-Policy)
 * are set by the gameCors middleware in server.ts for /game-proxy and /game-zip routes.
 * This function only handles the configurable CORS headers.
 */
export function setCorsHeaders(res: ServerResponse, settings: CorsSettings): void {
  if (settings.allowCrossDomain) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
  }
}

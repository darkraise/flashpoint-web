import { ServerResponse } from 'http';

interface CorsSettings {
  allowCrossDomain: boolean;
}

export function setCorsHeaders(res: ServerResponse, settings: CorsSettings): void {
  if (settings.allowCrossDomain) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
  }
}

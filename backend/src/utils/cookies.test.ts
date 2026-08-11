import { describe, it, expect, afterEach } from 'vitest';
import express from 'express';
import type { AddressInfo } from 'net';
import type { Server } from 'http';
import { resolveSecureFlag, setAccessTokenCookie, setRefreshTokenCookie } from './cookies';

describe('resolveSecureFlag', () => {
  describe('auto (default)', () => {
    it('marks cookies Secure on an HTTPS request', () => {
      expect(resolveSecureFlag(true, 'auto')).toBe(true);
    });

    it('omits Secure on a plain HTTP request, so the browser keeps the cookie', () => {
      expect(resolveSecureFlag(false, 'auto')).toBe(false);
    });
  });

  describe('explicit override', () => {
    it('forces Secure even when the request looks plain, for a proxy that hides TLS', () => {
      expect(resolveSecureFlag(false, true)).toBe(true);
    });

    it('forces Secure off even on an HTTPS request', () => {
      expect(resolveSecureFlag(true, false)).toBe(false);
    });
  });
});

describe('auth cookies over a real request', () => {
  let server: Server | undefined;

  afterEach(async () => {
    if (server) {
      await new Promise<void>((resolve) => server?.close(() => resolve()));
      server = undefined;
    }
  });

  async function setCookiesVia(trustProxy: boolean, headers: Record<string, string> = {}) {
    const app = express();
    if (trustProxy) {
      app.set('trust proxy', 1);
    }
    app.get('/login', (req, res) => {
      setAccessTokenCookie(req, res, 'access-token');
      setRefreshTokenCookie(req, res, 'refresh-token');
      res.status(204).end();
    });

    server = app.listen(0);
    await new Promise<void>((resolve) => server?.once('listening', () => resolve()));
    const { port } = server.address() as AddressInfo;

    const response = await fetch(`http://127.0.0.1:${port}/login`, { headers });
    return response.headers.getSetCookie();
  }

  it('omits Secure over plain HTTP so the browser stores the cookies', async () => {
    const cookies = await setCookiesVia(false);

    expect(cookies).toHaveLength(2);
    expect(cookies.every((cookie) => !cookie.includes('Secure'))).toBe(true);
    expect(cookies.every((cookie) => cookie.includes('HttpOnly'))).toBe(true);
  });

  it('adds Secure when a trusted proxy reports the request arrived over HTTPS', async () => {
    const cookies = await setCookiesVia(true, { 'X-Forwarded-Proto': 'https' });

    expect(cookies).toHaveLength(2);
    expect(cookies.every((cookie) => cookie.includes('Secure'))).toBe(true);
  });

  it('ignores a forwarded protocol claim when the proxy is not trusted', async () => {
    const cookies = await setCookiesVia(false, { 'X-Forwarded-Proto': 'https' });

    expect(cookies.every((cookie) => !cookie.includes('Secure'))).toBe(true);
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

import { startupGate } from './startupGate';
import { StartupState } from '../services/StartupState';

let res: Partial<Response>;
let next: NextFunction;
let statusCode: number | null;
let body: unknown;

function requestFor(path: string): Request {
  return { path } as Request;
}

beforeEach(() => {
  StartupState.reset();
  statusCode = null;
  body = null;
  res = {
    status: vi.fn((code: number) => {
      statusCode = code;
      return res as Response;
    }),
    json: vi.fn((payload: unknown) => {
      body = payload;
      return res as Response;
    }),
  };
  next = vi.fn() as unknown as NextFunction;
});

describe('startupGate', () => {
  it('answers API requests with a machine-readable starting marker', () => {
    StartupState.setPhase('Connecting to the Flashpoint database');
    const request = requestFor('/api/games');

    startupGate(request, res as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(statusCode).toBe(503);
    expect(body).toMatchObject({
      success: false,
      starting: true,
      phase: 'Connecting to the Flashpoint database',
    });
  });

  it('reports starting on the health endpoint', () => {
    const request = requestFor('/health');

    startupGate(request, res as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(statusCode).toBe(503);
    expect(body).toMatchObject({ status: 'starting', phase: 'Starting up' });
  });

  it('gates game content requests too', () => {
    const request = requestFor('/some-game/index.html');

    startupGate(request, res as Response, next);

    expect(statusCode).toBe(503);
    expect(body).toMatchObject({ starting: true });
  });

  it('passes everything through once startup finishes', () => {
    const request = requestFor('/api/games');
    StartupState.markReady();

    startupGate(request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('passes the health check through once ready', () => {
    const request = requestFor('/health');
    StartupState.markReady();

    startupGate(request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
  });
});

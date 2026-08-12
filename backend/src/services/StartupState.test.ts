import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), debug: vi.fn(), warn: vi.fn() },
}));

import { StartupState } from './StartupState';

beforeEach(() => {
  StartupState.reset();
});

describe('StartupState', () => {
  it('starts not ready with an initial phase', () => {
    expect(StartupState.isReady()).toBe(false);
    expect(StartupState.getPhase()).toBe('Starting up');
  });

  it('reports the current phase while starting', () => {
    StartupState.setPhase('Connecting to the Flashpoint database');

    expect(StartupState.getPhase()).toBe('Connecting to the Flashpoint database');
    expect(StartupState.isReady()).toBe(false);
  });

  it('reports ready once startup completes', () => {
    StartupState.setPhase('Warming up game search');
    StartupState.markReady();

    expect(StartupState.isReady()).toBe(true);
    expect(StartupState.getPhase()).toBe('Ready');
  });

  it('ignores late phase updates from background work', () => {
    StartupState.markReady();
    StartupState.setPhase('Installing Ruffle');

    expect(StartupState.isReady()).toBe(true);
    expect(StartupState.getPhase()).toBe('Ready');
  });
});

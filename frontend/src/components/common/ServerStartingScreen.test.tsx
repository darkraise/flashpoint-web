import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

vi.mock('@/components/auth/ParticleNetworkBackground', () => ({
  ParticleNetworkBackground: () => <div data-testid="particles" />,
}));

import { ServerStartingScreen } from './ServerStartingScreen';
import { useServerStatusStore } from '@/store/serverStatus';

const POLL_INTERVAL_MS = 2000;

function startingResponse(phase: string): Response {
  return {
    ok: false,
    status: 503,
    json: async () => ({ status: 'starting', phase }),
  } as unknown as Response;
}

/** What a proxy in front of a dead backend returns: a reply, but not ours. */
function proxyErrorResponse(): Response {
  return {
    ok: false,
    status: 502,
    json: async () => {
      throw new Error('not JSON');
    },
  } as unknown as Response;
}

function readyResponse(): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({ status: 'ok' }),
  } as unknown as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;
let reload: ReturnType<typeof vi.fn>;

/** Advance the poll timer and let the awaited fetch chain settle. */
async function advanceOnePoll(): Promise<void> {
  await act(async () => {
    vi.advanceTimersByTime(POLL_INTERVAL_MS);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  useServerStatusStore.setState({ isStarting: true, phase: 'Starting up' });

  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);

  reload = vi.fn();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, reload },
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('ServerStartingScreen', () => {
  it('shows the phase the server reports', async () => {
    fetchMock.mockResolvedValue(startingResponse('Warming up game search'));

    render(<ServerStartingScreen />);
    await advanceOnePoll();

    expect(screen.getByText(/Server is starting/i)).toBeInTheDocument();
    expect(screen.getByText(/Warming up game search/)).toBeInTheDocument();
  });

  it('advances the phase as startup progresses', async () => {
    fetchMock
      .mockResolvedValueOnce(startingResponse('Connecting to the Flashpoint database'))
      .mockResolvedValue(startingResponse('Loading game service configuration'));

    render(<ServerStartingScreen />);
    await advanceOnePoll();
    await advanceOnePoll();

    expect(screen.getByText(/Loading game service configuration/)).toBeInTheDocument();
  });

  it('reloads once the server reports ready', async () => {
    fetchMock.mockResolvedValue(readyResponse());

    render(<ServerStartingScreen />);
    await advanceOnePoll();

    expect(reload).toHaveBeenCalled();
  });

  it('warns after repeated unreachable polls', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    render(<ServerStartingScreen />);
    for (let i = 0; i < 9; i++) {
      await advanceOnePoll();
    }

    expect(screen.getByText(/Server is not responding/i)).toBeInTheDocument();
  });

  it('treats a proxy error page as unreachable, not as a live server', async () => {
    fetchMock.mockResolvedValue(proxyErrorResponse());

    render(<ServerStartingScreen />);
    for (let i = 0; i < 9; i++) {
      await advanceOnePoll();
    }

    expect(screen.getByText(/Server is not responding/i)).toBeInTheDocument();
    expect(reload).not.toHaveBeenCalled();
  });

  it('recovers the starting message when the server answers again', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    render(<ServerStartingScreen />);
    for (let i = 0; i < 9; i++) {
      await advanceOnePoll();
    }
    expect(screen.getByText(/Server is not responding/i)).toBeInTheDocument();

    fetchMock.mockResolvedValue(startingResponse('Preparing application data'));
    await advanceOnePoll();

    expect(screen.getByText(/Server is starting/i)).toBeInTheDocument();
    expect(screen.queryByText(/Server is not responding/i)).not.toBeInTheDocument();
  });

  it('stops polling after unmount', async () => {
    fetchMock.mockResolvedValue(startingResponse('Starting up'));

    const { unmount } = render(<ServerStartingScreen />);
    await advanceOnePoll();
    const callsBeforeUnmount = fetchMock.mock.calls.length;

    unmount();
    await advanceOnePoll();

    expect(fetchMock.mock.calls.length).toBe(callsBeforeUnmount);
  });
});

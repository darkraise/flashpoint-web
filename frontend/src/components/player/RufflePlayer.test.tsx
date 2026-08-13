import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { RufflePlayer } from './RufflePlayer';

/** Advance the component's init delay and let the awaited setTimeout settle. */
async function advance(ms: number): Promise<void> {
  await act(async () => {
    vi.advanceTimersByTime(ms);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('RufflePlayer script loading', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.querySelectorAll('script[src^="/ruffle/ruffle.js"]').forEach((el) => el.remove());
    delete window.RufflePlayer;
  });

  it('requests the cache-busted loader script', async () => {
    render(<RufflePlayer swfUrl="/proxy/games/example.swf" />);
    await advance(100);

    const script = document.querySelector('script[src^="/ruffle/ruffle.js"]');
    expect(script?.getAttribute('src')).toBe('/ruffle/ruffle.js?v=1');
  });

  it('does not inject a second script tag when a busted one is already present', async () => {
    // Regression guard: the duplicate-tag check must keep matching the
    // cache-busted URL, or every player mount injects another <script>.
    const existing = document.createElement('script');
    existing.src = '/ruffle/ruffle.js?v=1';
    document.head.appendChild(existing);

    render(<RufflePlayer swfUrl="/proxy/games/example.swf" />);
    await advance(100);

    expect(document.querySelectorAll('script[src^="/ruffle/ruffle.js"]')).toHaveLength(1);
  });
});

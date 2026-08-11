import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { LazyImage } from './LazyImage';

/**
 * jsdom has no IntersectionObserver, which is the branch LazyImage falls back
 * on by treating the image as immediately in view — exactly what we want here.
 */
class FakeImage {
  static instances: FakeImage[] = [];
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private _src = '';

  constructor() {
    FakeImage.instances.push(this);
  }

  get src(): string {
    return this._src;
  }

  set src(value: string) {
    this._src = value;
  }
}

const originalImage = globalThis.Image;
const originalObserver = globalThis.IntersectionObserver;

/**
 * The shared test setup stubs IntersectionObserver with one that never fires,
 * so nothing ever enters view. This one reports intersection on observe, which
 * is the state the preload path needs.
 */
class IntersectingObserver {
  constructor(private readonly callback: IntersectionObserverCallback) {}

  observe(target: Element): void {
    this.callback(
      [{ isIntersecting: true, target } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver
    );
  }

  unobserve(): void {}
  disconnect(): void {}
}

beforeEach(() => {
  FakeImage.instances = [];
  globalThis.Image = FakeImage as unknown as typeof Image;
  globalThis.IntersectionObserver = IntersectingObserver as unknown as typeof IntersectionObserver;
});

afterEach(() => {
  globalThis.Image = originalImage;
  globalThis.IntersectionObserver = originalObserver;
  vi.restoreAllMocks();
});

describe('LazyImage preload cleanup', () => {
  it('aborts the in-flight preload when the component unmounts', () => {
    const { unmount } = render(<LazyImage src="/api/proxy/images/game.png" alt="Game" />);

    const preload = FakeImage.instances[0];
    expect(preload).toBeDefined();
    expect(preload.src).toBe('/api/proxy/images/game.png');

    unmount();

    // Clearing src is what actually cancels the request; a detached Image would
    // otherwise keep downloading after the page it belonged to is gone.
    expect(preload.src).toBe('');
    expect(preload.onload).toBeNull();
    expect(preload.onerror).toBeNull();
  });

  it('aborts the previous preload when src changes', () => {
    const { rerender } = render(<LazyImage src="/api/proxy/images/first.png" alt="First" />);

    const first = FakeImage.instances[0];
    rerender(<LazyImage src="/api/proxy/images/second.png" alt="Second" />);

    expect(first.src).toBe('');
    expect(FakeImage.instances[1].src).toBe('/api/proxy/images/second.png');
  });
});

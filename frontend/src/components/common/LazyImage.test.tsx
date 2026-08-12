import { StrictMode } from 'react';
import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LazyImage } from './LazyImage';

describe('LazyImage', () => {
  it('keeps src through StrictMode double-mounting', () => {
    // StrictMode runs effect cleanups on a live element in development. An
    // unguarded abort blanks every image in `npm run dev`.
    render(
      <StrictMode>
        <LazyImage src="/api/proxy/images/game.png" alt="Game" />
      </StrictMode>
    );

    expect(screen.getByAltText('Game').getAttribute('src')).toBe('/api/proxy/images/game.png');
  });

  it('drops src on unmount so the request is aborted', () => {
    const { unmount } = render(<LazyImage src="/api/proxy/images/game.png" alt="Game" />);

    const img = screen.getByAltText('Game');
    expect(img.getAttribute('src')).toBe('/api/proxy/images/game.png');

    unmount();

    // Removing the attribute is what cancels an in-flight download; a detached
    // <img> keeps fetching until it completes.
    expect(img.hasAttribute('src')).toBe(false);
  });

  it('shows the skeleton until the image loads', () => {
    const { container } = render(<LazyImage src="/game.png" alt="Game" />);

    expect(container.querySelector('.animate-pulse')).not.toBeNull();

    fireEvent.load(screen.getByAltText('Game'));

    expect(container.querySelector('.animate-pulse')).toBeNull();
  });

  it('renders a custom skeleton node and omits it when skeleton is false', () => {
    const { rerender } = render(
      <LazyImage src="/game.png" alt="Game" skeleton={<span>Loading…</span>} />
    );
    expect(screen.getByText('Loading…')).toBeInTheDocument();

    rerender(<LazyImage src="/game.png" alt="Game" skeleton={false} />);
    expect(screen.queryByText('Loading…')).toBeNull();
  });

  it('replaces the image with the fallback on error', () => {
    render(<LazyImage src="/missing.png" alt="Game" fallback={<span>No image</span>} />);

    fireEvent.error(screen.getByAltText('Game'));

    expect(screen.queryByAltText('Game')).toBeNull();
    expect(screen.getByText('No image')).toBeInTheDocument();
  });

  it('renders nothing on error when no fallback is given', () => {
    render(<LazyImage src="/missing.png" alt="Game" />);

    fireEvent.error(screen.getByAltText('Game'));

    expect(screen.queryByAltText('Game')).toBeNull();
  });

  it('still notifies the caller on load and error', () => {
    const events: string[] = [];
    const { rerender } = render(
      <LazyImage src="/a.png" alt="A" onLoad={() => events.push('load')} />
    );
    fireEvent.load(screen.getByAltText('A'));

    rerender(<LazyImage src="/b.png" alt="B" onError={() => events.push('error')} />);
    fireEvent.error(screen.getByAltText('B'));

    expect(events).toEqual(['load', 'error']);
  });

  it('clears the loaded state when src changes', () => {
    const { container, rerender } = render(<LazyImage src="/first.png" alt="Game" />);
    fireEvent.load(screen.getByAltText('Game'));
    expect(container.querySelector('.animate-pulse')).toBeNull();

    rerender(<LazyImage src="/second.png" alt="Game" />);

    expect(container.querySelector('.animate-pulse')).not.toBeNull();
  });

  it('recovers from an error when src changes, without showing the fallback again', () => {
    const { rerender } = render(
      <LazyImage src="/missing.png" alt="Game" fallback={<span>No image</span>} />
    );
    fireEvent.error(screen.getByAltText('Game'));
    expect(screen.getByText('No image')).toBeInTheDocument();

    rerender(<LazyImage src="/present.png" alt="Game" fallback={<span>No image</span>} />);

    // The reset happens during render, so the new image is on screen in the
    // same commit rather than a frame after the stale fallback.
    expect(screen.getByAltText('Game')).toBeInTheDocument();
    expect(screen.queryByText('No image')).toBeNull();
  });
});

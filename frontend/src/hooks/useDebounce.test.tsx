import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 500));

    expect(result.current).toBe('initial');
  });

  it('should update value after delay', async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'initial' } }
    );

    // Update the value
    rerender({ value: 'updated' });

    // Value should not change immediately
    expect(result.current).toBe('initial');

    // Advance time past delay
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Value should now be updated
    expect(result.current).toBe('updated');
  });

  it('should reset timer on rapid changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'a' } }
    );

    // Make multiple rapid changes
    rerender({ value: 'b' });
    act(() => vi.advanceTimersByTime(200));

    rerender({ value: 'c' });
    act(() => vi.advanceTimersByTime(200));

    rerender({ value: 'd' });

    // Value should still be initial
    expect(result.current).toBe('a');

    // Advance time past delay
    act(() => vi.advanceTimersByTime(500));

    // Should have final value
    expect(result.current).toBe('d');
  });

  it('should use default delay of 500ms', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });

    // Should not update before 500ms
    act(() => vi.advanceTimersByTime(400));
    expect(result.current).toBe('initial');

    // Should update at 500ms
    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe('updated');
  });

  it('should support custom delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 1000),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });

    // Should not update before 1000ms
    act(() => vi.advanceTimersByTime(900));
    expect(result.current).toBe('initial');

    // Should update at 1000ms
    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe('updated');
  });

  it('should work with number values', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 0 } }
    );

    rerender({ value: 42 });

    act(() => vi.advanceTimersByTime(300));

    expect(result.current).toBe(42);
  });

  it('should work with object values', () => {
    const initial = { name: 'test' };
    const updated = { name: 'updated' };

    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: initial } }
    );

    rerender({ value: updated });

    act(() => vi.advanceTimersByTime(300));

    expect(result.current).toEqual(updated);
  });

  it('should cleanup timer on unmount', () => {
    const { result, rerender, unmount } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });

    // Unmount before timer fires
    unmount();

    // Advance time - should not cause errors
    act(() => vi.advanceTimersByTime(500));

    // Hook should have cleaned up without issues
    // No assertion needed - just checking for no errors
  });

  it('should update immediately when delay is 0', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 0),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'updated' });

    // Even with 0 delay, setTimeout(fn, 0) defers execution
    act(() => vi.advanceTimersByTime(0));

    expect(result.current).toBe('updated');
  });
});

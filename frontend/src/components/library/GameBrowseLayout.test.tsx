import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { GameBrowseLayout } from './GameBrowseLayout';
import { useGames } from '@/hooks/useGames';
import { useFilterOptions } from '@/hooks/useFilterOptions';
import { useFavoriteGameIds } from '@/hooks/useFavorites';
import { useBatchRatingAggregates } from '@/hooks/useRatings';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { buildFilterSearchParams, parseFilterParams } from '@/lib/filterUrlCompression';

/**
 * Covers the promise from the design spec's testing section: "Chip removal writes
 * an explicit off when the admin default is on." An absent `downloaded` URL param
 * means "use the admin default", so simply clearing the param on removal would let
 * the filter silently re-apply when the default is on. GameBrowseLayout has three
 * removal paths (handleRemoveChip, handleRemoveWithChildren, handleClearAllFilters)
 * that must each write an explicit '0' in that case, and leave the param cleared
 * otherwise.
 *
 * Rendering GameBrowseLayout pulls in data fetching (useGames, useFilterOptions,
 * useFavoriteGameIds, useBatchRatingAggregates) and FilterPanel's own filter-dropdown
 * machinery, none of which is relevant to the URL-writing logic under test. Those
 * hooks are stubbed out, and FilterPanel is replaced with a minimal stand-in that
 * exposes buttons wired to the exact callbacks GameBrowseLayout passes it - the same
 * callbacks the real FilterPanel invokes when a chip's remove button is clicked. This
 * exercises the real handler implementations rather than restating their logic.
 */

vi.mock('@/hooks/useGames', () => ({ useGames: vi.fn() }));
vi.mock('@/hooks/useFilterOptions', () => ({ useFilterOptions: vi.fn() }));
vi.mock('@/hooks/useFavorites', () => ({ useFavoriteGameIds: vi.fn() }));
vi.mock('@/hooks/useRatings', () => ({ useBatchRatingAggregates: vi.fn() }));
vi.mock('@/hooks/useFeatureFlags', () => ({ useFeatureFlags: vi.fn() }));

interface FilterPanelStubProps {
  onRemoveChip?: (chipId: string) => void;
  onRemoveWithChildren?: (categoryOrder: number) => void;
  onClearAllFilters?: () => void;
}

vi.mock('@/components/search/FilterPanel', () => ({
  FilterPanel: ({
    onRemoveChip,
    onRemoveWithChildren,
    onClearAllFilters,
  }: FilterPanelStubProps) => (
    <div>
      <button onClick={() => onRemoveChip?.('downloaded')}>remove-downloaded-chip</button>
      <button onClick={() => onRemoveWithChildren?.(0)}>remove-downloaded-with-children</button>
      <button onClick={() => onClearAllFilters?.()}>clear-all-filters</button>
    </div>
  ),
}));

/** Renders alongside GameBrowseLayout to surface the resolved `downloaded` URL param. */
function LocationDisplay() {
  const [searchParams] = useSearchParams();
  const parsed = parseFilterParams(searchParams);
  return <div data-testid="downloaded-param">{parsed.downloaded ?? 'unset'}</div>;
}

describe('GameBrowseLayout - downloaded filter removal', () => {
  beforeEach(() => {
    vi.mocked(useGames).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useGames>);
    vi.mocked(useFilterOptions).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useFilterOptions>);
    vi.mocked(useFavoriteGameIds).mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof useFavoriteGameIds>);
    vi.mocked(useBatchRatingAggregates).mockReturnValue({
      data: undefined,
    } as unknown as ReturnType<typeof useBatchRatingAggregates>);
  });

  function renderLayout(initialSearch: string, enableDownloadedFilterDefault: boolean) {
    vi.mocked(useFeatureFlags).mockReturnValue({
      enableDownloadedFilterDefault,
    } as unknown as ReturnType<typeof useFeatureFlags>);

    return render(
      <MemoryRouter initialEntries={[`/browse?${initialSearch}`]}>
        <GameBrowseLayout title="Browse" />
        <LocationDisplay />
      </MemoryRouter>
    );
  }

  describe('when the admin default is on', () => {
    const initialSearch = buildFilterSearchParams({ downloaded: '1', fo: 'Downloaded' }).toString();

    it('handleRemoveChip writes an explicit off', async () => {
      const user = userEvent.setup();
      renderLayout(initialSearch, true);

      await user.click(screen.getByText('remove-downloaded-chip'));

      await waitFor(() => {
        expect(screen.getByTestId('downloaded-param').textContent).toBe('0');
      });
    });

    it('handleRemoveWithChildren writes an explicit off', async () => {
      const user = userEvent.setup();
      renderLayout(initialSearch, true);

      await user.click(screen.getByText('remove-downloaded-with-children'));

      await waitFor(() => {
        expect(screen.getByTestId('downloaded-param').textContent).toBe('0');
      });
    });

    it('handleClearAllFilters writes an explicit off', async () => {
      const user = userEvent.setup();
      renderLayout(initialSearch, true);

      await user.click(screen.getByText('clear-all-filters'));

      await waitFor(() => {
        expect(screen.getByTestId('downloaded-param').textContent).toBe('0');
      });
    });
  });

  describe('when the admin default is off', () => {
    const initialSearch = buildFilterSearchParams({ downloaded: '1', fo: 'Downloaded' }).toString();

    it('handleRemoveChip clears the param instead of writing an explicit off', async () => {
      const user = userEvent.setup();
      renderLayout(initialSearch, false);

      await user.click(screen.getByText('remove-downloaded-chip'));

      await waitFor(() => {
        expect(screen.getByTestId('downloaded-param').textContent).toBe('unset');
      });
    });

    it('handleRemoveWithChildren clears the param instead of writing an explicit off', async () => {
      const user = userEvent.setup();
      renderLayout(initialSearch, false);

      await user.click(screen.getByText('remove-downloaded-with-children'));

      await waitFor(() => {
        expect(screen.getByTestId('downloaded-param').textContent).toBe('unset');
      });
    });

    it('handleClearAllFilters clears the param instead of writing an explicit off', async () => {
      const user = userEvent.setup();
      renderLayout(initialSearch, false);

      await user.click(screen.getByText('clear-all-filters'));

      await waitFor(() => {
        expect(screen.getByTestId('downloaded-param').textContent).toBe('unset');
      });
    });
  });
});

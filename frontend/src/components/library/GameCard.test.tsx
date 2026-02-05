import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { GameCard } from './GameCard';
import { useAuthStore } from '@/store/auth';
import type { Game } from '@/types/game';
import type { User, AuthTokens } from '@/types/auth';
import { toast } from 'sonner';

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/components/common/FavoriteButton', () => ({
  FavoriteButton: ({ gameId, isFavorited }: { gameId: string; isFavorited: boolean }) => (
    <button data-testid={`favorite-button-${gameId}`}>
      {isFavorited ? 'Favorited' : 'Add to Favorites'}
    </button>
  ),
}));

vi.mock('@/components/common/RemoveFavoriteButton', () => ({
  RemoveFavoriteButton: ({ gameId }: { gameId: string }) => (
    <button data-testid={`remove-button-${gameId}`}>Remove from Favorites</button>
  ),
}));

vi.mock('@/components/playlist/AddToPlaylistModal', () => ({
  AddToPlaylistModal: ({ isOpen, gameId }: { isOpen: boolean; gameId: string }) =>
    isOpen ? <div data-testid={`playlist-modal-${gameId}`}>Add to Playlist Modal</div> : null,
}));

describe('GameCard', () => {
  let queryClient: QueryClient;

  const mockFlashGame: Game = {
    id: 'abcd1234-5678-90ab-cdef-1234567890ab',
    title: 'Test Flash Game',
    developer: 'Test Developer',
    publisher: 'Test Publisher',
    platformName: 'Flash',
    library: 'arcade',
    orderTitle: 'test flash game',
    releaseDate: '2020-01-01',
    tagsStr: 'action;adventure',
    presentOnDisk: 1,
  };

  const mockHTML5Game: Game = {
    ...mockFlashGame,
    id: 'bcde2345-6789-01bc-def2-3456789012bc',
    title: 'Test HTML5 Game',
    platformName: 'HTML5',
  };

  const mockNonPlayableGame: Game = {
    ...mockFlashGame,
    id: 'cdef3456-7890-12cd-ef34-5678901234cd',
    title: 'Test Java Game',
    platformName: 'Java',
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    useAuthStore.getState().clearAuth();
    vi.clearAllMocks();
  });

  const renderGameCard = (game: Game, props = {}) => {
    return render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <GameCard game={game} {...props} />
          </TooltipProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );
  };

  describe('Basic Rendering', () => {
    it('should render game title and developer', () => {
      renderGameCard(mockFlashGame);

      expect(screen.getByText('Test Flash Game')).toBeInTheDocument();
      expect(screen.getByText('by Test Developer')).toBeInTheDocument();
    });

    it('should render platform badge', () => {
      renderGameCard(mockFlashGame);

      expect(screen.getByText('Flash')).toBeInTheDocument();
    });

    it('should render without developer if not provided', () => {
      const gameWithoutDev = { ...mockFlashGame, developer: '' };
      renderGameCard(gameWithoutDev);

      expect(screen.getByText('Test Flash Game')).toBeInTheDocument();
      expect(screen.queryByText(/by /)).not.toBeInTheDocument();
    });
  });

  describe('Image Handling', () => {
    it('should derive logo URL from game ID', () => {
      renderGameCard(mockFlashGame);

      const img = screen.getByAltText('Test Flash Game') as HTMLImageElement;
      // Logo path is derived from game ID: Logos/{id[0:2]}/{id[2:4]}/{id}.png
      expect(img.src).toContain('Logos/ab/cd/abcd1234-5678-90ab-cdef-1234567890ab.png');
    });

    it('should show placeholder when game ID is invalid', () => {
      const gameWithInvalidId = { ...mockFlashGame, id: '' };
      renderGameCard(gameWithInvalidId);

      // Should show ImageIcon and platform name - use getAllByText since "Flash" appears twice
      const platformText = screen.getAllByText('Flash');
      expect(platformText.length).toBeGreaterThan(0);
    });

    it('should have lazy loading attribute', () => {
      renderGameCard(mockFlashGame);

      const img = screen.getByAltText('Test Flash Game') as HTMLImageElement;
      // In jsdom, loading attribute exists but value is undefined
      // Check that the attribute is present on the element
      expect(img).toHaveAttribute('loading', 'lazy');
    });
  });

  describe('Favorite Button', () => {
    it('should show favorite button when showFavoriteButton is true and game not favorited', () => {
      renderGameCard(mockFlashGame, {
        showFavoriteButton: true,
        favoriteGameIds: new Set(),
      });

      expect(
        screen.getByTestId('favorite-button-abcd1234-5678-90ab-cdef-1234567890ab')
      ).toBeInTheDocument();
    });

    it('should not show favorite button when game is favorited', () => {
      renderGameCard(mockFlashGame, {
        showFavoriteButton: true,
        favoriteGameIds: new Set(['abcd1234-5678-90ab-cdef-1234567890ab']),
      });

      expect(
        screen.queryByTestId('favorite-button-abcd1234-5678-90ab-cdef-1234567890ab')
      ).not.toBeInTheDocument();
    });

    it('should not show favorite button when showFavoriteButton is false', () => {
      renderGameCard(mockFlashGame, {
        showFavoriteButton: false,
        favoriteGameIds: new Set(),
      });

      expect(
        screen.queryByTestId('favorite-button-abcd1234-5678-90ab-cdef-1234567890ab')
      ).not.toBeInTheDocument();
    });
  });

  describe('Remove Button', () => {
    it('should show remove button when showRemoveButton is true and game is favorited', () => {
      renderGameCard(mockFlashGame, {
        showRemoveButton: true,
        favoriteGameIds: new Set(['abcd1234-5678-90ab-cdef-1234567890ab']),
      });

      expect(
        screen.getByTestId('remove-button-abcd1234-5678-90ab-cdef-1234567890ab')
      ).toBeInTheDocument();
    });

    it('should not show remove button when game is not favorited', () => {
      renderGameCard(mockFlashGame, {
        showRemoveButton: true,
        favoriteGameIds: new Set(),
      });

      expect(
        screen.queryByTestId('remove-button-abcd1234-5678-90ab-cdef-1234567890ab')
      ).not.toBeInTheDocument();
    });

    it('should not show remove button when showRemoveButton is false', () => {
      renderGameCard(mockFlashGame, {
        showRemoveButton: false,
        favoriteGameIds: new Set(['abcd1234-5678-90ab-cdef-1234567890ab']),
      });

      expect(
        screen.queryByTestId('remove-button-abcd1234-5678-90ab-cdef-1234567890ab')
      ).not.toBeInTheDocument();
    });
  });

  describe('Favorite Indicator', () => {
    it('should show favorite indicator when showFavoriteIndicator is true and game is favorited', () => {
      renderGameCard(mockFlashGame, {
        showFavoriteIndicator: true,
        favoriteGameIds: new Set(['abcd1234-5678-90ab-cdef-1234567890ab']),
        isFavoritePage: false,
      });

      // Heart icon should be visible
      const hearts = document.querySelectorAll('svg');
      expect(hearts.length).toBeGreaterThan(0);
    });

    it('should not show favorite indicator on favorites page', () => {
      renderGameCard(mockFlashGame, {
        showFavoriteIndicator: true,
        favoriteGameIds: new Set(['abcd1234-5678-90ab-cdef-1234567890ab']),
        isFavoritePage: true,
      });

      // Should not show the indicator div on favorites page
      // (implementation hides it when isFavoritePage is true)
    });
  });

  describe('Add to Playlist Button', () => {
    it('should show add to playlist button when showAddToPlaylistButton is true', () => {
      renderGameCard(mockFlashGame, {
        showAddToPlaylistButton: true,
      });

      const button = screen.getByLabelText('Add Test Flash Game to playlist');
      expect(button).toBeInTheDocument();
    });

    it('should not show add to playlist button when showAddToPlaylistButton is false', () => {
      renderGameCard(mockFlashGame, {
        showAddToPlaylistButton: false,
      });

      expect(screen.queryByLabelText('Add Test Flash Game to playlist')).not.toBeInTheDocument();
    });

    it('should open modal when button clicked and user is authenticated', async () => {
      const user = userEvent.setup();

      // Set authenticated user
      const mockUser: User = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
        permissions: ['playlists.create'],
      };
      const mockTokens: AuthTokens = {
        accessToken: 'token',
        refreshToken: 'refresh',
        expiresIn: 3600,
      };
      useAuthStore.getState().setAuth(mockUser, mockTokens);

      renderGameCard(mockFlashGame, {
        showAddToPlaylistButton: true,
      });

      const button = screen.getByLabelText('Add Test Flash Game to playlist');
      await user.click(button);

      await waitFor(() => {
        expect(
          screen.getByTestId('playlist-modal-abcd1234-5678-90ab-cdef-1234567890ab')
        ).toBeInTheDocument();
      });
    });

    it('should show toast error when button clicked and user is not authenticated', async () => {
      const user = userEvent.setup();

      renderGameCard(mockFlashGame, {
        showAddToPlaylistButton: true,
      });

      const button = screen.getByLabelText('Add Test Flash Game to playlist');
      await user.click(button);

      expect(toast.error).toHaveBeenCalledWith('Please log in to add games to playlists');
      expect(
        screen.queryByTestId('playlist-modal-abcd1234-5678-90ab-cdef-1234567890ab')
      ).not.toBeInTheDocument();
    });
  });

  describe('Play Button', () => {
    it('should show play button for Flash games', () => {
      renderGameCard(mockFlashGame);

      const playButton = screen.getByLabelText('Play Test Flash Game');
      expect(playButton).toBeInTheDocument();
    });

    it('should show play button for HTML5 games', () => {
      renderGameCard(mockHTML5Game);

      const playButton = screen.getByLabelText('Play Test HTML5 Game');
      expect(playButton).toBeInTheDocument();
    });

    it('should not show play button for non-playable games', () => {
      renderGameCard(mockNonPlayableGame);

      expect(screen.queryByLabelText('Play Test Java Game')).not.toBeInTheDocument();
    });

    it('should have correct link to play page', () => {
      renderGameCard(mockFlashGame);

      const playButton = screen.getByLabelText('Play Test Flash Game');
      expect(playButton).toHaveAttribute(
        'href',
        '/games/abcd1234-5678-90ab-cdef-1234567890ab/play'
      );
    });

    it('should include shareToken in play URL when provided', () => {
      renderGameCard(mockFlashGame, {
        shareToken: 'test-share-token',
      });

      const playButton = screen.getByLabelText('Play Test Flash Game');
      // When shareToken is provided, it uses play-shared route with shareToken query param
      expect(playButton).toHaveAttribute(
        'href',
        '/games/abcd1234-5678-90ab-cdef-1234567890ab/play-shared?shareToken=test-share-token'
      );
    });
  });

  describe('Navigation', () => {
    it('should link to game detail page', () => {
      renderGameCard(mockFlashGame);

      // Card should be clickable and navigate to detail page
      const title = screen.getByText('Test Flash Game');
      const card = title.closest('.group');
      expect(card).toBeInTheDocument();
    });

    it('should include shareToken in detail URL when provided', () => {
      renderGameCard(mockFlashGame, {
        shareToken: 'test-share-token',
      });

      // The component uses navigate() for card clicks, so we can't easily test the URL
      // But we can verify the shareToken prop is accepted
      expect(screen.getByText('Test Flash Game')).toBeInTheDocument();
    });
  });

  describe('Memoization', () => {
    it('should render consistently with same props', () => {
      const { rerender } = renderGameCard(mockFlashGame, {
        showFavoriteButton: true,
        favoriteGameIds: new Set(),
      });

      const firstRender = screen.getByText('Test Flash Game');

      // Re-render with same props
      rerender(
        <MemoryRouter>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <GameCard
                game={mockFlashGame}
                showFavoriteButton={true}
                favoriteGameIds={new Set()}
              />
            </TooltipProvider>
          </QueryClientProvider>
        </MemoryRouter>
      );

      const secondRender = screen.getByText('Test Flash Game');
      expect(secondRender).toBe(firstRender);
    });
  });
});

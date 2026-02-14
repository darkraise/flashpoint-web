import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PlaylistCard } from './PlaylistCard';
import type { UserPlaylist } from '@/types/playlist';

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('./PlaylistIcon', () => ({
  PlaylistIcon: ({ iconName, size }: { iconName: string; size: number }) => (
    <div data-testid={`playlist-icon-${iconName}`} data-size={size}>
      Icon: {iconName}
    </div>
  ),
}));

vi.mock('@/hooks/usePublicSettings', () => ({
  usePublicSettings: () => ({
    data: {
      domains: {
        defaultDomain: 'share.example.com',
      },
    },
  }),
}));

vi.mock('@/hooks/useDomains', () => ({
  buildShareUrl: (hostname: string | null, shareToken: string) => {
    const base = hostname ? `https://${hostname}` : 'http://localhost:5173';
    return `${base}/playlists/shared/${shareToken}`;
  },
}));

describe('PlaylistCard', () => {
  const mockPlaylist: UserPlaylist = {
    id: 1,
    userId: 1,
    title: 'Test Playlist',
    description: 'A test playlist description',
    icon: 'star',
    gameCount: 5,
    isPublic: false,
    shareToken: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockPublicPlaylist: UserPlaylist = {
    ...mockPlaylist,
    id: 2,
    title: 'Public Playlist',
    isPublic: true,
    shareToken: 'test-share-token',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderPlaylistCard = (playlist: UserPlaylist, props = {}) => {
    return render(
      <MemoryRouter>
        <TooltipProvider>
          <PlaylistCard playlist={playlist} {...props} />
        </TooltipProvider>
      </MemoryRouter>
    );
  };

  describe('Basic Rendering', () => {
    it('should render playlist title and description', () => {
      renderPlaylistCard(mockPlaylist);

      expect(screen.getByText('Test Playlist')).toBeInTheDocument();
      expect(screen.getByText('A test playlist description')).toBeInTheDocument();
    });

    it('should render "No description" when description is empty', () => {
      const playlistWithoutDesc = { ...mockPlaylist, description: '' };
      renderPlaylistCard(playlistWithoutDesc);

      expect(screen.getByText('No description')).toBeInTheDocument();
    });

    it('should render game count badge', () => {
      renderPlaylistCard(mockPlaylist);

      expect(screen.getByText('5 games')).toBeInTheDocument();
    });

    it('should render singular "game" for count of 1', () => {
      const playlistWithOneGame = { ...mockPlaylist, gameCount: 1 };
      renderPlaylistCard(playlistWithOneGame);

      expect(screen.getByText('1 game')).toBeInTheDocument();
    });

    it('should render playlist icon', () => {
      renderPlaylistCard(mockPlaylist);

      const icon = screen.getByTestId('playlist-icon-star');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveAttribute('data-size', '32');
    });
  });

  describe('Navigation', () => {
    it('should link to playlist detail page from icon', () => {
      renderPlaylistCard(mockPlaylist);

      // The icon link's accessible name is "Icon: star 5 games" (from mock + badge content)
      const iconLink = screen.getByRole('link', { name: /icon: star 5 games/i });
      expect(iconLink).toHaveAttribute('href', '/playlists/playlist-1');
    });

    it('should link to playlist detail page from content', () => {
      renderPlaylistCard(mockPlaylist);

      const titleElement = screen.getByText('Test Playlist');
      const contentLink = titleElement.closest('a');
      expect(contentLink).toHaveAttribute('href', '/playlists/playlist-1');
    });
  });

  describe('Action Buttons', () => {
    it('should show action menu when showActions is true and callbacks provided', async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();
      const onDelete = vi.fn();
      const onShare = vi.fn();

      renderPlaylistCard(mockPlaylist, {
        showActions: true,
        onEdit,
        onDelete,
        onShare,
      });

      const menuButton = screen.getByLabelText('More options');
      expect(menuButton).toBeInTheDocument();

      await user.click(menuButton);

      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Share')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should not show action menu when showActions is false', () => {
      const onEdit = vi.fn();

      renderPlaylistCard(mockPlaylist, {
        showActions: false,
        onEdit,
      });

      expect(screen.queryByLabelText('More options')).not.toBeInTheDocument();
    });

    it('should not show action menu when no callbacks provided', () => {
      renderPlaylistCard(mockPlaylist, {
        showActions: true,
      });

      expect(screen.queryByLabelText('More options')).not.toBeInTheDocument();
    });

    it('should call onEdit when Edit is clicked', async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();

      renderPlaylistCard(mockPlaylist, {
        onEdit,
      });

      const menuButton = screen.getByLabelText('More options');
      await user.click(menuButton);

      const editButton = screen.getByText('Edit');
      await user.click(editButton);

      expect(onEdit).toHaveBeenCalledWith(mockPlaylist);
      expect(onEdit).toHaveBeenCalledTimes(1);
    });

    it('should call onDelete when Delete is clicked', async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();

      renderPlaylistCard(mockPlaylist, {
        onDelete,
      });

      const menuButton = screen.getByLabelText('More options');
      await user.click(menuButton);

      const deleteButton = screen.getByText('Delete');
      await user.click(deleteButton);

      expect(onDelete).toHaveBeenCalledWith(mockPlaylist);
      expect(onDelete).toHaveBeenCalledTimes(1);
    });

    it('should call onShare when Share is clicked', async () => {
      const user = userEvent.setup();
      const onShare = vi.fn();

      renderPlaylistCard(mockPlaylist, {
        onShare,
      });

      const menuButton = screen.getByLabelText('More options');
      await user.click(menuButton);

      const shareButton = screen.getByText('Share');
      await user.click(shareButton);

      expect(onShare).toHaveBeenCalledWith(mockPlaylist);
      expect(onShare).toHaveBeenCalledTimes(1);
    });

    it('should only show Edit action when only onEdit provided', async () => {
      const user = userEvent.setup();
      const onEdit = vi.fn();

      renderPlaylistCard(mockPlaylist, {
        onEdit,
      });

      const menuButton = screen.getByLabelText('More options');
      await user.click(menuButton);

      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.queryByText('Share')).not.toBeInTheDocument();
      expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    });
  });

  describe('Share Link Button', () => {
    it('should show share link button for public playlist with share token', () => {
      renderPlaylistCard(mockPublicPlaylist);

      const shareLinkButton = screen.getByLabelText('Copy share link');
      expect(shareLinkButton).toBeInTheDocument();
    });

    it('should not show share link button for private playlist', () => {
      renderPlaylistCard(mockPlaylist);

      expect(screen.queryByLabelText('Copy share link')).not.toBeInTheDocument();
    });

    it('should not show share link button for public playlist without share token', () => {
      const publicPlaylistWithoutToken = { ...mockPlaylist, isPublic: true, shareToken: null };
      renderPlaylistCard(publicPlaylistWithoutToken);

      expect(screen.queryByLabelText('Copy share link')).not.toBeInTheDocument();
    });

    it('should have clickable share link button', () => {
      renderPlaylistCard(mockPublicPlaylist);

      const shareLinkButton = screen.getByLabelText('Copy share link');
      expect(shareLinkButton).toBeInTheDocument();
      expect(shareLinkButton.tagName).toBe('BUTTON');
    });
  });

  describe('Memoization', () => {
    it('should render consistently with same props', () => {
      const { rerender } = renderPlaylistCard(mockPlaylist, {
        showActions: true,
      });

      const firstRender = screen.getByText('Test Playlist');

      // Re-render with same props
      rerender(
        <MemoryRouter>
          <TooltipProvider>
            <PlaylistCard playlist={mockPlaylist} showActions={true} />
          </TooltipProvider>
        </MemoryRouter>
      );

      const secondRender = screen.getByText('Test Playlist');
      expect(secondRender).toBe(firstRender);
    });
  });

  describe('Edge Cases', () => {
    it('should handle playlist with zero games', () => {
      const emptyPlaylist = { ...mockPlaylist, gameCount: 0 };
      renderPlaylistCard(emptyPlaylist);

      expect(screen.getByText('0 games')).toBeInTheDocument();
    });

    it('should handle very long title with truncation', () => {
      const longTitlePlaylist = {
        ...mockPlaylist,
        title: 'This is a very long playlist title that should be truncated in the UI',
      };
      renderPlaylistCard(longTitlePlaylist);

      const titleElement = screen.getByTitle(
        'This is a very long playlist title that should be truncated in the UI'
      );
      expect(titleElement).toHaveClass('truncate');
    });

    it('should handle very long description with line clamp', () => {
      const longDescPlaylist = {
        ...mockPlaylist,
        description:
          'This is a very long description that should be clamped to two lines in the UI. It contains multiple sentences to demonstrate the line-clamp behavior.',
      };
      renderPlaylistCard(longDescPlaylist);

      const descElement = screen.getByText(/This is a very long description/);
      expect(descElement).toHaveClass('line-clamp-2');
    });
  });
});

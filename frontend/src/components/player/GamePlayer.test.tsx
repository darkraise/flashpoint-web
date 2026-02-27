import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { GamePlayer } from './GamePlayer';

// Mock dependencies
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('./RufflePlayer', () => ({
  RufflePlayer: vi.fn(({ swfUrl, onLoadSuccess, onLoadError }) => (
    <div data-testid="ruffle-player" data-swf-url={swfUrl}>
      Ruffle Player Mock
    </div>
  )),
}));

vi.mock('./PlayerErrorBoundary', () => ({
  PlayerErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/platform-icon', () => ({
  PlatformIcon: ({ platformName }: { platformName: string }) => (
    <span data-testid="platform-icon">{platformName}</span>
  ),
}));

describe('GamePlayer', () => {
  const defaultProps = {
    title: 'Test Game',
    platform: 'Flash',
    canPlayInBrowser: true,
    contentUrl: '/games/test.swf',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render game title', () => {
      render(<GamePlayer {...defaultProps} />);

      expect(screen.getByText('Test Game')).toBeInTheDocument();
    });

    it('should render platform icon', () => {
      render(<GamePlayer {...defaultProps} />);

      expect(screen.getByTestId('platform-icon')).toHaveTextContent('Flash');
    });

    it('should render developer name when provided', () => {
      render(<GamePlayer {...defaultProps} developer="Test Developer" />);

      expect(screen.getByText('by Test Developer')).toBeInTheDocument();
    });

    it('should not render developer when not provided', () => {
      render(<GamePlayer {...defaultProps} />);

      expect(screen.queryByText(/^by /)).not.toBeInTheDocument();
    });

    it('should render game logo when provided', () => {
      render(<GamePlayer {...defaultProps} logoUrl="/logos/test.png" />);

      expect(screen.getByAltText('Test Game logo')).toBeInTheDocument();
    });
  });

  describe('cannot play in browser', () => {
    it('should show "Cannot Play in Browser" message when canPlayInBrowser is false', () => {
      render(<GamePlayer {...defaultProps} canPlayInBrowser={false} />);

      expect(screen.getByText('Cannot Play in Browser')).toBeInTheDocument();
    });

    it('should show platform-specific message for non-web platforms', () => {
      render(
        <GamePlayer
          {...defaultProps}
          platform="Unity"
          canPlayInBrowser={false}
          launchCommand="some-command"
        />
      );

      expect(screen.getByText(/The Unity platform requires the Flashpoint Launcher/)).toBeInTheDocument();
    });

    it('should show missing content message for web platform without launch command', () => {
      render(
        <GamePlayer
          {...defaultProps}
          platform="Flash"
          canPlayInBrowser={false}
          launchCommand={undefined}
        />
      );

      expect(screen.getByText(/This game is missing content data/)).toBeInTheDocument();
    });

    it('should display the platform name in the info box', () => {
      render(
        <GamePlayer {...defaultProps} platform="Shockwave" canPlayInBrowser={false} />
      );

      expect(screen.getByText(/Platform:/)).toBeInTheDocument();
      expect(screen.getByText('Shockwave')).toBeInTheDocument();
    });
  });

  describe('Flash SWF games', () => {
    it('should render RufflePlayer for Flash SWF content', () => {
      render(
        <GamePlayer
          {...defaultProps}
          platform="Flash"
          contentUrl="/games/test.swf"
        />
      );

      expect(screen.getByTestId('ruffle-player')).toBeInTheDocument();
    });

    it('should pass correct swfUrl to RufflePlayer', () => {
      render(
        <GamePlayer
          {...defaultProps}
          platform="Flash"
          contentUrl="/games/test.swf"
        />
      );

      expect(screen.getByTestId('ruffle-player')).toHaveAttribute(
        'data-swf-url',
        '/games/test.swf'
      );
    });
  });

  describe('Flash HTML wrapper games', () => {
    it('should render iframe for Flash HTML wrapper content', () => {
      render(
        <GamePlayer
          {...defaultProps}
          platform="Flash"
          contentUrl="/games/test/index.html"
        />
      );

      expect(screen.getByTitle('Test Game')).toBeInTheDocument();
      expect(screen.getByTitle('Test Game').tagName).toBe('IFRAME');
    });

    it('should render iframe for .htm files', () => {
      render(
        <GamePlayer
          {...defaultProps}
          platform="Flash"
          contentUrl="/games/test.htm"
        />
      );

      expect(screen.getByTitle('Test Game').tagName).toBe('IFRAME');
    });
  });

  describe('HTML5 games', () => {
    it('should render iframe for HTML5 content', () => {
      render(
        <GamePlayer
          {...defaultProps}
          platform="HTML5"
          contentUrl="/games/html5/index.html"
        />
      );

      expect(screen.getByTitle('Test Game')).toBeInTheDocument();
      expect(screen.getByTitle('Test Game').tagName).toBe('IFRAME');
    });

    it('should set correct iframe attributes', () => {
      render(
        <GamePlayer
          {...defaultProps}
          platform="HTML5"
          contentUrl="/games/html5/index.html"
        />
      );

      const iframe = screen.getByTitle('Test Game');
      expect(iframe).toHaveAttribute('src', '/games/html5/index.html');
      expect(iframe).toHaveAttribute('sandbox');
      expect(iframe).toHaveAttribute('allow');
    });
  });

  describe('no content URL', () => {
    it('should show "No content URL available" message', () => {
      render(
        <GamePlayer
          {...defaultProps}
          contentUrl={undefined}
        />
      );

      expect(screen.getByText('No content URL available for this game')).toBeInTheDocument();
    });

    it('should show launch command when no content URL', () => {
      render(
        <GamePlayer
          {...defaultProps}
          contentUrl={undefined}
          launchCommand="game.exe"
        />
      );

      expect(screen.getByText(/Launch command:/)).toBeInTheDocument();
      expect(screen.getByText(/game\.exe/)).toBeInTheDocument();
    });
  });

  describe('fullscreen controls', () => {
    it('should render fullscreen button when allowFullscreen is true', () => {
      render(<GamePlayer {...defaultProps} allowFullscreen={true} />);

      expect(screen.getByLabelText('Enter Fullscreen')).toBeInTheDocument();
    });

    it('should not render fullscreen button when allowFullscreen is false', () => {
      render(<GamePlayer {...defaultProps} allowFullscreen={false} />);

      expect(screen.queryByLabelText('Enter Fullscreen')).not.toBeInTheDocument();
    });

    it('should toggle fullscreen state when button is clicked', async () => {
      const user = userEvent.setup();

      render(<GamePlayer {...defaultProps} />);

      const fullscreenButton = screen.getByLabelText('Enter Fullscreen');
      await user.click(fullscreenButton);

      expect(screen.getByLabelText('Exit Fullscreen')).toBeInTheDocument();
    });

    it('should call onFullscreenChange callback when toggling', async () => {
      const onFullscreenChange = vi.fn();
      const user = userEvent.setup();

      render(<GamePlayer {...defaultProps} onFullscreenChange={onFullscreenChange} />);

      await user.click(screen.getByLabelText('Enter Fullscreen'));

      expect(onFullscreenChange).toHaveBeenCalledWith(true);
    });

    it('should show ESC hint when in fullscreen mode', async () => {
      const user = userEvent.setup();

      render(<GamePlayer {...defaultProps} />);

      await user.click(screen.getByLabelText('Enter Fullscreen'));

      expect(screen.getByText(/Press ESC to exit/)).toBeInTheDocument();
    });

    it('should respect initialFullscreen prop', () => {
      render(<GamePlayer {...defaultProps} initialFullscreen={true} />);

      expect(screen.getByLabelText('Exit Fullscreen')).toBeInTheDocument();
    });
  });

  describe('controls visibility', () => {
    it('should render controls by default', () => {
      render(<GamePlayer {...defaultProps} />);

      expect(screen.getByText('Test Game')).toBeInTheDocument();
      expect(screen.getByLabelText('Enter Fullscreen')).toBeInTheDocument();
    });

    it('should hide controls when showControls is false', () => {
      render(<GamePlayer {...defaultProps} showControls={false} />);

      expect(screen.queryByLabelText('Enter Fullscreen')).not.toBeInTheDocument();
    });
  });

  describe('back button', () => {
    it('should not show back button when not in fullscreen', () => {
      const onBack = vi.fn();

      render(<GamePlayer {...defaultProps} onBack={onBack} />);

      expect(screen.queryByLabelText('Go back')).not.toBeInTheDocument();
    });

    it('should show back button when in fullscreen and onBack is provided', async () => {
      const onBack = vi.fn();
      const user = userEvent.setup();

      render(<GamePlayer {...defaultProps} onBack={onBack} />);

      // Enter fullscreen
      await user.click(screen.getByLabelText('Enter Fullscreen'));

      expect(screen.getByLabelText('Go back')).toBeInTheDocument();
    });

    it('should call onBack when back button is clicked', async () => {
      const onBack = vi.fn();
      const user = userEvent.setup();

      render(<GamePlayer {...defaultProps} onBack={onBack} initialFullscreen={true} />);

      await user.click(screen.getByLabelText('Go back'));

      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  describe('ESC key handling', () => {
    it('should exit fullscreen when ESC key is pressed', async () => {
      const user = userEvent.setup();

      render(<GamePlayer {...defaultProps} initialFullscreen={true} />);

      expect(screen.getByLabelText('Exit Fullscreen')).toBeInTheDocument();

      await user.keyboard('{Escape}');

      expect(screen.getByLabelText('Enter Fullscreen')).toBeInTheDocument();
    });

    it('should call onFullscreenChange with false when ESC is pressed', async () => {
      const onFullscreenChange = vi.fn();
      const user = userEvent.setup();

      render(
        <GamePlayer
          {...defaultProps}
          initialFullscreen={true}
          onFullscreenChange={onFullscreenChange}
        />
      );

      await user.keyboard('{Escape}');

      expect(onFullscreenChange).toHaveBeenCalledWith(false);
    });
  });
});

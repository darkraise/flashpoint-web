import { Game, GameLaunchData } from '@/types/game';
import { PlatformIcon } from '@/components/ui/platform-icon';
import { formatDate, formatReleaseDate } from '@/lib/date-utils';
import { ExternalLink } from 'lucide-react';

interface GameInfoGridProps {
  game: Game;
  launchData?: GameLaunchData;
}

/**
 * Check if a string is a valid URL
 */
function isValidUrl(str?: string): boolean {
  if (!str) return false;
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * GameInfoGrid component that displays comprehensive game metadata
 * in a responsive grid layout
 */
export function GameInfoGrid({ game, launchData }: GameInfoGridProps) {
  const isSourceUrl = isValidUrl(game.source);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 py-4 border-y border-border">
      {/* Platform */}
      <div>
        <dt className="text-sm text-muted-foreground mb-1">Platform</dt>
        <dd>
          {game.platformName ? (
            <PlatformIcon platformName={game.platformName} size={20} />
          ) : (
            <span className="text-sm text-muted-foreground">Unknown</span>
          )}
        </dd>
      </div>

      {/* Developer */}
      <div>
        <dt className="text-sm text-muted-foreground mb-1">Developer</dt>
        <dd className="font-medium text-sm">
          {game.developer || <span className="text-muted-foreground">Unknown</span>}
        </dd>
      </div>

      {/* Publisher */}
      <div>
        <dt className="text-sm text-muted-foreground mb-1">Publisher</dt>
        <dd className="font-medium text-sm">
          {game.publisher || <span className="text-muted-foreground">Unknown</span>}
        </dd>
      </div>

      {/* Source */}
      <div>
        <dt className="text-sm text-muted-foreground mb-1">Source</dt>
        <dd className="font-medium text-sm">
          {isSourceUrl ? (
            <a
              href={game.source}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 inline-flex items-center gap-1 transition-colors"
            >
              <span className="truncate">Link</span>
              <ExternalLink size={12} className="flex-shrink-0" />
            </a>
          ) : game.source ? (
            <span className="truncate" title={game.source}>
              {game.source}
            </span>
          ) : (
            <span className="text-muted-foreground">Unknown</span>
          )}
        </dd>
      </div>

      {/* Play Mode */}
      <div>
        <dt className="text-sm text-muted-foreground mb-1">Play Mode</dt>
        <dd className="font-medium text-sm">
          {game.playMode || launchData?.playMode || (
            <span className="text-muted-foreground">Unknown</span>
          )}
        </dd>
      </div>

      {/* Status */}
      <div>
        <dt className="text-sm text-muted-foreground mb-1">Status</dt>
        <dd className="font-medium text-sm">
          {game.status || <span className="text-muted-foreground">Unknown</span>}
        </dd>
      </div>

      {/* Version */}
      <div>
        <dt className="text-sm text-muted-foreground mb-1">Version</dt>
        <dd className="font-medium text-sm">
          {game.version || <span className="text-muted-foreground">Unknown</span>}
        </dd>
      </div>

      {/* Series */}
      <div>
        <dt className="text-sm text-muted-foreground mb-1">Series</dt>
        <dd className="font-medium text-sm">
          {game.series || <span className="text-muted-foreground">Unknown</span>}
        </dd>
      </div>

      {/* Language */}
      <div>
        <dt className="text-sm text-muted-foreground mb-1">Language</dt>
        <dd className="font-medium text-sm">
          {game.language || <span className="text-muted-foreground">Unknown</span>}
        </dd>
      </div>

      {/* Date Added */}
      <div>
        <dt className="text-sm text-muted-foreground mb-1">Date Added</dt>
        <dd className="font-medium text-sm">
          {game.dateAdded ? (
            formatDate(game.dateAdded)
          ) : (
            <span className="text-muted-foreground">Unknown</span>
          )}
        </dd>
      </div>

      {/* Date Modified */}
      <div>
        <dt className="text-sm text-muted-foreground mb-1">Date Modified</dt>
        <dd className="font-medium text-sm">
          {game.dateModified ? (
            formatDate(game.dateModified)
          ) : (
            <span className="text-muted-foreground">Unknown</span>
          )}
        </dd>
      </div>

      {/* Release Date */}
      <div>
        <dt className="text-sm text-muted-foreground mb-1">Release Date</dt>
        <dd className="font-medium text-sm">
          {game.releaseDate ? (
            formatReleaseDate(game.releaseDate)
          ) : (
            <span className="text-muted-foreground">Unknown</span>
          )}
        </dd>
      </div>
    </div>
  );
}

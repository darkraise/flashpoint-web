import { getPlaylistIcon, type PlaylistIconName } from '@/lib/playlistIcons';
import { cn } from '@/lib/utils';

interface PlaylistIconProps {
  /**
   * Icon name from the playlist icons registry
   * If null/undefined, shows fallback icon (ListVideo)
   */
  iconName?: PlaylistIconName | null;

  /**
   * Icon size in pixels
   * @default 24
   */
  size?: number;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Accessible label for screen readers
   */
  'aria-label'?: string;
}

/**
 * Displays a playlist icon by name
 * Automatically handles fallback for invalid/missing icons
 *
 * @example
 * <PlaylistIcon iconName="music" size={48} />
 * <PlaylistIcon iconName={playlist.icon} size={24} className="text-primary" />
 */
export function PlaylistIcon({
  iconName,
  size = 24,
  className,
  'aria-label': ariaLabel,
}: PlaylistIconProps) {
  const Icon = getPlaylistIcon(iconName);

  return (
    <Icon
      size={size}
      className={cn('flex-shrink-0', className)}
      aria-hidden={!ariaLabel}
      aria-label={ariaLabel}
    />
  );
}

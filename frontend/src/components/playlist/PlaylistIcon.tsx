import { getPlaylistIcon, type PlaylistIconName } from '@/lib/playlistIcons';
import { cn } from '@/lib/utils';

interface PlaylistIconProps {
  iconName?: PlaylistIconName | null;
  size?: number;
  className?: string;
  'aria-label'?: string;
}

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

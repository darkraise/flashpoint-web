import { Link } from 'react-router-dom';
import { memo } from 'react';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, MoreVertical, Share2, Link2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { UserPlaylist } from '@/types/playlist';
import { PlaylistIcon } from './PlaylistIcon';
import { toast } from 'sonner';
import { buildShareUrl } from '@/hooks/useDomains';
import { usePublicSettings } from '@/hooks/usePublicSettings';

interface PlaylistCardProps {
  playlist: UserPlaylist;
  onEdit?: (playlist: UserPlaylist) => void;
  onDelete?: (playlist: UserPlaylist) => void;
  onShare?: (playlist: UserPlaylist) => void;
  showActions?: boolean;
}

const PlaylistCardComponent = function PlaylistCard({
  playlist,
  onEdit,
  onDelete,
  onShare,
  showActions = true,
}: PlaylistCardProps) {
  const { data: publicSettings } = usePublicSettings();
  const defaultDomain = publicSettings?.domains?.defaultDomain ?? null;

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onEdit?.(playlist);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete?.(playlist);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onShare?.(playlist);
  };

  const handleCopyShareLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!playlist.shareToken) return;

    const shareUrl = buildShareUrl(defaultDomain, playlist.shareToken);
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied to clipboard');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  return (
    <Card className="group overflow-hidden hover:ring-2 hover:ring-primary/80 hover:shadow-xl hover:-translate-y-1 transition-all duration-200">
      <div className="flex items-start gap-4 p-4">
        <Link to={`/playlists/${playlist.id}`} className="flex-shrink-0">
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 bg-primary/10 rounded-lg">
              <PlaylistIcon
                iconName={playlist.icon}
                size={32}
                className="text-primary"
                aria-label={`${playlist.title} icon`}
              />
            </div>
            <Badge variant="outline" className="text-xs font-normal bg-primary/5">
              {playlist.gameCount} {playlist.gameCount === 1 ? 'game' : 'games'}
            </Badge>
          </div>
        </Link>

        <Link to={`/playlists/${playlist.id}`} className="flex-1 min-w-0">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold truncate" title={playlist.title}>
              {playlist.title}
            </CardTitle>

            <CardDescription className="text-sm line-clamp-2">
              {playlist.description || 'No description'}
            </CardDescription>
          </div>
        </Link>

        <div className="flex flex-col gap-2 flex-shrink-0">
          {showActions && (onEdit || onDelete || onShare) ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent) => e.preventDefault()}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 border border-primary/20 hover:bg-accent/50 transition-all duration-200"
                  aria-label="More options"
                >
                  <MoreVertical size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit ? (
                  <DropdownMenuItem onClick={handleEdit}>
                    <Edit size={16} className="mr-2" />
                    Edit
                  </DropdownMenuItem>
                ) : null}
                {onShare ? (
                  <DropdownMenuItem onClick={handleShare}>
                    <Share2 size={16} className="mr-2" />
                    Share
                  </DropdownMenuItem>
                ) : null}
                {onDelete ? (
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 size={16} className="mr-2" />
                    Delete
                  </DropdownMenuItem>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          {playlist.isPublic && playlist.shareToken ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  className="h-8 w-8 p-0 bg-primary/90 hover:bg-primary text-primary-foreground shadow-sm transition-all hover:shadow-md"
                  onClick={handleCopyShareLink}
                  aria-label="Copy share link"
                >
                  <Link2 size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Click to copy share link</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      </div>
    </Card>
  );
};

export const PlaylistCard = memo(PlaylistCardComponent, (prevProps, nextProps) => {
  if (prevProps.playlist.id !== nextProps.playlist.id) {
    return false;
  }

  if (
    prevProps.playlist.title !== nextProps.playlist.title ||
    prevProps.playlist.description !== nextProps.playlist.description ||
    prevProps.playlist.icon !== nextProps.playlist.icon ||
    prevProps.playlist.gameCount !== nextProps.playlist.gameCount ||
    prevProps.playlist.isPublic !== nextProps.playlist.isPublic ||
    prevProps.playlist.shareToken !== nextProps.playlist.shareToken
  ) {
    return false;
  }

  if (prevProps.showActions !== nextProps.showActions) {
    return false;
  }

  return true;
});

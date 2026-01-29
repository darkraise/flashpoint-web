import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Edit, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserPlaylist } from '@/types/playlist';
import { PlaylistIcon } from './PlaylistIcon';

interface PlaylistCardProps {
  playlist: UserPlaylist;
  onEdit?: (playlist: UserPlaylist) => void;
  onDelete?: (playlist: UserPlaylist) => void;
  showActions?: boolean;
}

export function PlaylistCard({
  playlist,
  onEdit,
  onDelete,
  showActions = true,
}: PlaylistCardProps) {
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

  return (
    <Card className="group overflow-hidden hover:ring-2 hover:ring-primary/80 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 relative flex flex-col h-full">
      <Link to={`/playlists/${playlist.id}`} className="flex flex-col flex-1">
        <CardContent className="p-6 flex flex-col items-center justify-center flex-1 bg-gradient-to-br from-primary/10 to-accent/10 relative">
          <div className="p-4 bg-primary/20 rounded-full mb-4">
            <PlaylistIcon
              iconName={playlist.icon}
              size={48}
              className="text-primary"
              aria-label={`${playlist.title} icon`}
            />
          </div>

          <div className="text-center">
            <h3 className="font-semibold text-lg mb-1" title={playlist.title}>
              {playlist.title}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-2 max-w-[200px] min-h-[2rem]">
              {playlist.description || '\u00A0'}
            </p>
          </div>

          {/* {playlist.isPublic && (
            <Badge variant="secondary" className="absolute top-2 left-2 text-xs">
              Public
            </Badge>
          )} */}
        </CardContent>

        <CardFooter className="p-3 flex items-center justify-between border-t bg-muted/30">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {playlist.gameCount} {playlist.gameCount === 1 ? 'game' : 'games'}
            </Badge>
          </div>

          {showActions && (onEdit || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent) => e.preventDefault()}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={handleEdit}>
                    <Edit size={16} className="mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 size={16} className="mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </CardFooter>
      </Link>
    </Card>
  );
}

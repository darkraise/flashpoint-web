import { Link } from 'react-router-dom';
import { Game } from '@/types/game';
import { GameCard } from '@/components/library/GameCard';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HomeSectionProps {
  title: string;
  description: string;
  games: Game[];
  isLoading: boolean;
  viewAllHref: string;
  favoriteGameIds?: Set<string>;
}

export function HomeSection({
  title,
  description,
  games,
  isLoading,
  viewAllHref,
  favoriteGameIds,
}: HomeSectionProps) {
  if (isLoading) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{title}</h2>
            <p className="text-muted-foreground text-sm mt-1">{description}</p>
          </div>
        </div>
        <div className="flex gap-4 overflow-x-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent py-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-48 h-72 bg-muted/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  if (games.length === 0) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">{title}</h2>
            <p className="text-muted-foreground text-sm mt-1">{description}</p>
          </div>
        </div>
        <div className="text-center py-16 border-2 border-dashed border-primary/50 rounded-xl">
          <p className="text-muted-foreground">No games found in this time period</p>
          <Link to="/browse">
            <Button variant="link" className="mt-2">
              Browse All Games
            </Button>
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-muted-foreground text-sm mt-1">{description}</p>
        </div>
        <Link to={viewAllHref}>
          <Button variant="outline" size="sm" className="gap-2">
            View All
            <ChevronRight size={16} />
          </Button>
        </Link>
      </div>

      <div className="relative">
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent py-2">
          {games.map((game) => (
            <div key={game.id} className="flex-shrink-0 w-48">
              <GameCard
                game={game}
                showFavoriteButton={true}
                showFavoriteIndicator={true}
                showAddToPlaylistButton={true}
                favoriteGameIds={favoriteGameIds}
                breadcrumbContext={{ label: 'Home', href: '/' }}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

import { useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Game } from "@/types/game";
import { GameCard } from "./GameCard";
import { useUIStore } from "@/store/ui";

interface GameGridProps {
  games: Game[];
  onAddToPlaylist?: (gameId: string) => void;
  onToggleFavorite?: (gameId: string) => void;
  favoritedGameIds?: Set<string>;
  showFavoriteOnHoverOnly?: boolean;
  enableVirtualization?: boolean;
}

export function GameGrid({
  games,
  onAddToPlaylist,
  onToggleFavorite,
  favoritedGameIds,
  showFavoriteOnHoverOnly = false,
  enableVirtualization = true,
}: GameGridProps) {
  const cardSize = useUIStore((state) => state.cardSize);
  const parentRef = useRef<HTMLDivElement>(null);

  // Dynamic grid configuration based on card size
  const gridConfig = useMemo(() => {
    const configs = {
      small: {
        cols: { base: 2, sm: 3, md: 4, lg: 6, xl: 8 },
        gap: 12,
        estimateSize: 280,
      },
      medium: {
        cols: { base: 1, sm: 2, md: 3, lg: 4, xl: 5 },
        gap: 16,
        estimateSize: 320,
      },
      large: {
        cols: { base: 1, sm: 2, md: 2, lg: 3, xl: 4 },
        gap: 20,
        estimateSize: 380,
      },
    };
    return configs[cardSize];
  }, [cardSize]);

  // Calculate columns based on viewport width
  const getColumnCount = () => {
    if (typeof window === "undefined") return gridConfig.cols.base;
    const width = window.innerWidth;
    if (width >= 1280) return gridConfig.cols.xl;
    if (width >= 1024) return gridConfig.cols.lg;
    if (width >= 768) return gridConfig.cols.md;
    if (width >= 640) return gridConfig.cols.sm;
    return gridConfig.cols.base;
  };

  const columnCount = getColumnCount();

  // Group games into rows for virtualization
  const rows = useMemo(() => {
    const result: Game[][] = [];
    for (let i = 0; i < games.length; i += columnCount) {
      result.push(games.slice(i, i + columnCount));
    }
    return result;
  }, [games, columnCount]);

  // Setup virtualizer for rows
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => gridConfig.estimateSize,
    overscan: 2,
    enabled: enableVirtualization && games.length > 20,
  });

  if (games.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">No games found</div>
    );
  }

  // Dynamic grid classes
  const gridClasses = {
    small:
      "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 p-2",
    medium:
      "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-2",
    large:
      "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 p-2",
  };

  // If virtualization is disabled or small dataset, use simple grid
  if (!enableVirtualization || games.length <= 20) {
    return (
      <div className={gridClasses[cardSize]}>
        {games.map((game) => (
          <GameCard
            key={game.id}
            game={game}
            onAddToPlaylist={onAddToPlaylist}
            onToggleFavorite={onToggleFavorite}
            isFavorited={favoritedGameIds?.has(game.id) || false}
            showFavoriteOnHoverOnly={showFavoriteOnHoverOnly}
          />
        ))}
      </div>
    );
  }

  // Virtualized grid for large datasets
  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          return (
            <div
              key={virtualRow.index}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className={gridClasses[cardSize]}>
                {row.map((game) => (
                  <GameCard
                    key={game.id}
                    game={game}
                    onAddToPlaylist={onAddToPlaylist}
                    onToggleFavorite={onToggleFavorite}
                    isFavorited={favoritedGameIds?.has(game.id) || false}
                    showFavoriteOnHoverOnly={showFavoriteOnHoverOnly}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

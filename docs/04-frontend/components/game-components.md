# Game Components

Documentation for game browsing and display components.

## GameCard

Card view component for displaying individual games.

**Location:** `frontend/src/components/library/GameCard.tsx`

### Props

```typescript
interface GameCardProps {
  game: Game;
  onAddToPlaylist?: (gameId: string) => void;
  onToggleFavorite?: (gameId: string) => void;
  isFavorited?: boolean;
  showFavoriteOnHoverOnly?: boolean;
}
```

### Features

- **Image Display** - Shows game logo or screenshot with lazy loading
- **Availability Indicator** - Green checkmark (available) or yellow download icon (needs download)
- **Platform Badge** - Platform logo and name
- **Hover Actions** - Add to playlist, toggle favorite (shown on hover)
- **Loading States** - Blur placeholder while image loads
- **Error Handling** - Fallback UI when image fails to load

### Usage

```typescript
<GameCard
  game={game}
  onAddToPlaylist={(id) => openPlaylistModal(id)}
  onToggleFavorite={(id) => toggleFavorite(id)}
  isFavorited={favorites.includes(game.id)}
/>
```

## GameGrid

Responsive grid layout for game cards.

**Location:** `frontend/src/components/library/GameGrid.tsx`

### Props

```typescript
interface GameGridProps {
  games: Game[];
  cardSize?: CardSize;  // 'small' | 'medium' | 'large'
  onAddToPlaylist?: (gameId: string) => void;
  onToggleFavorite?: (gameId: string) => void;
  favoritedGames?: string[];
}
```

### Grid Breakpoints

- Small cards: `grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8`
- Medium cards: `grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6`
- Large cards: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`

## GameList

List view component for games.

**Location:** `frontend/src/components/library/GameList.tsx`

### Features

- Compact row layout
- Platform icon and name
- Developer/publisher info
- Release date
- Action buttons (play, favorite, add to playlist)

## GameBrowseLayout

Complete browse layout with filters and pagination.

**Location:** `frontend/src/components/library/GameBrowseLayout.tsx`

### Features

- Filter panel integration
- View mode toggle (grid/list)
- Card size control
- Pagination
- Loading states
- Empty states

## GameInfoGrid

Detailed game information display grid.

**Location:** `frontend/src/components/game/GameInfoGrid.tsx`

### Displays

- Title, Developer, Publisher
- Platform, Series
- Release Date, Play Mode
- Status, Language
- Source, Original Description
- Notes, Tags

## Further Reading

- [Component Overview](./component-overview.md)
- [Player Components](./player-components.md)

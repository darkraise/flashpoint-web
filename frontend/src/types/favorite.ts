/**
 * Favorites Types
 */

import { Game } from './game';

export interface Favorite {
  id: number;
  userId: number;
  gameId: string;
  addedAt: string;
}

export interface FavoriteGame extends Game {
  addedAt: string;
}

export interface FavoriteGameIdsResponse {
  gameIds: string[];
}

export interface FavoritesStats {
  totalFavorites: number;
  oldestFavoriteDate: string | null;
  newestFavoriteDate: string | null;
}

export interface ToggleFavoriteData {
  gameId: string;
}

export interface ToggleFavoriteResponse {
  isFavorited: boolean;
}

export interface AddFavoriteData {
  gameId: string;
}

export interface AddFavoriteResponse {
  success: boolean;
}

export interface BatchAddFavoritesData {
  gameIds: string[];
}

export interface BatchAddFavoritesResponse {
  added: number;
}

export interface BatchRemoveFavoritesData {
  gameIds: string[];
}

export interface BatchRemoveFavoritesResponse {
  removed: number;
}

export interface ClearAllFavoritesResponse {
  removed: number;
}

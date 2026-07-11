export interface GameRating {
  id: number;
  userId: number;
  gameId: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

export interface RatingAggregate {
  gameId: string;
  averageRating: number;
  totalRatings: number;
  distribution: Record<string, number>;
}

export interface BatchRatingAggregate {
  averageRating: number;
  totalRatings: number;
}

export interface UpsertRatingData {
  gameId: string;
  rating: number;
}

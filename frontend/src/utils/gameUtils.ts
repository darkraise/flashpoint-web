/**
 * Game utility functions
 */

/**
 * Derive the logo path from a game ID.
 * Images are stored in a directory structure based on the first 4 characters of the game ID.
 * Example: For game ID "abcdef12-3456-7890-abcd-ef1234567890"
 * Logo path: "Logos/ab/cd/abcdef12-3456-7890-abcd-ef1234567890.png"
 *
 * @param gameId - The game's unique identifier (UUID)
 * @returns The relative path to the logo image
 */
export function getGameLogoPath(gameId: string): string {
  if (!gameId || gameId.length < 4) {
    return '';
  }
  return `Logos/${gameId.substring(0, 2)}/${gameId.substring(2, 4)}/${gameId}.png`;
}

/**
 * Derive the screenshot path from a game ID.
 * Images are stored in a directory structure based on the first 4 characters of the game ID.
 * Example: For game ID "abcdef12-3456-7890-abcd-ef1234567890"
 * Screenshot path: "Screenshots/ab/cd/abcdef12-3456-7890-abcd-ef1234567890.png"
 *
 * @param gameId - The game's unique identifier (UUID)
 * @returns The relative path to the screenshot image
 */
export function getGameScreenshotPath(gameId: string): string {
  if (!gameId || gameId.length < 4) {
    return '';
  }
  return `Screenshots/${gameId.substring(0, 2)}/${gameId.substring(2, 4)}/${gameId}.png`;
}

/**
 * Get the full URL for a game's logo image via the proxy.
 *
 * @param gameId - The game's unique identifier (UUID)
 * @returns The full URL to fetch the logo image
 */
export function getGameLogoUrl(gameId: string): string {
  const path = getGameLogoPath(gameId);
  return path ? `/proxy/images/${path}` : '';
}

/**
 * Get the full URL for a game's screenshot image via the proxy.
 *
 * @param gameId - The game's unique identifier (UUID)
 * @returns The full URL to fetch the screenshot image
 */
export function getGameScreenshotUrl(gameId: string): string {
  const path = getGameScreenshotPath(gameId);
  return path ? `/proxy/images/${path}` : '';
}

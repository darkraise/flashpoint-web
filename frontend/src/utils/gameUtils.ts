/** Images use a directory structure based on the first 4 chars of the UUID: Logos/ab/cd/{id}.png */
export function getGameLogoPath(gameId: string): string {
  if (!gameId || gameId.length < 4) {
    return '';
  }
  return `Logos/${gameId.substring(0, 2)}/${gameId.substring(2, 4)}/${gameId}.png`;
}

export function getGameScreenshotPath(gameId: string): string {
  if (!gameId || gameId.length < 4) {
    return '';
  }
  return `Screenshots/${gameId.substring(0, 2)}/${gameId.substring(2, 4)}/${gameId}.png`;
}

export function getGameLogoUrl(gameId: string): string {
  const path = getGameLogoPath(gameId);
  return path ? `/proxy/images/${path}` : '';
}

export function getGameScreenshotUrl(gameId: string): string {
  const path = getGameScreenshotPath(gameId);
  return path ? `/proxy/images/${path}` : '';
}

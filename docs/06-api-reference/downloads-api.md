# Downloads API

Manage game downloads with progress tracking and cancellation support.

**Base Path:** `/api/downloads`

## Overview

The Downloads API enables downloading game content from configured data sources
with real-time progress tracking via Server-Sent Events (SSE). Downloads run in
the background and can be cancelled.

## Start Download

`POST /api/downloads/:id/download` - Requires auth + `games.download` permission

Initiates a background download for a game's data file.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string (uuid) | Game ID |

**Request Body:**

```json
{
  "gameDataId": 12345
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| gameDataId | number | Yes | ID of the game data entry to download |

**Response:** `202 Accepted`

```json
{
  "success": true,
  "message": "Download started",
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "gameDataId": 12345
}
```

**Errors:**

| Status | Description |
|--------|-------------|
| `400 Bad Request` | Missing or invalid gameDataId |
| `404 Not Found` | Game or game data not found |
| `409 Conflict` | Download already in progress for this game |
| `503 Service Unavailable` | Download capacity reached (max concurrent downloads) |

## Get Download Progress

`GET /api/downloads/:id/download/progress` - Requires auth

Returns real-time download progress via Server-Sent Events (SSE).

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string (uuid) | Game ID |

**Response:** `text/event-stream`

The endpoint sends JSON events with the following structure:

```
data: {"status":"downloading","progress":45,"bytesDownloaded":47185920,"totalBytes":104857600,"speed":5242880}

data: {"status":"completed","progress":100}

data: {"status":"error","error":"Network timeout"}
```

**Event Fields:**

| Field | Type | Description |
|-------|------|-------------|
| status | string | `pending`, `downloading`, `verifying`, `completed`, `error`, `cancelled` |
| progress | number | Percentage complete (0-100) |
| bytesDownloaded | number | Bytes downloaded so far |
| totalBytes | number | Total file size in bytes |
| speed | number | Current download speed in bytes/second |
| error | string | Error message (only when status is `error`) |

**Status Flow:**

```
pending → downloading → verifying → completed
                    ↘ error
                    ↘ cancelled
```

**Connection Notes:**

- Events are sent every 1 second while download is active
- Connection closes automatically when download completes, fails, or is cancelled
- Client should handle reconnection if connection drops
- Use `EventSource` API on frontend for automatic reconnection

**Example (Frontend):**

```typescript
const eventSource = new EventSource(`/api/downloads/${gameId}/download/progress`, {
  withCredentials: true
});

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.status === 'downloading') {
    updateProgressBar(data.progress);
    updateSpeedDisplay(data.speed);
  } else if (data.status === 'completed') {
    eventSource.close();
    onDownloadComplete();
  } else if (data.status === 'error') {
    eventSource.close();
    showError(data.error);
  }
};

eventSource.onerror = () => {
  // Handle connection error or server closed connection
  eventSource.close();
};
```

## Cancel Download

`DELETE /api/downloads/:id/download` - Requires auth

Cancels an active download for a game.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string (uuid) | Game ID |

**Response:** `200 OK`

```json
{
  "success": true,
  "message": "Download cancelled"
}
```

**Errors:**

| Status | Description |
|--------|-------------|
| `404 Not Found` | No active download for this game |

## Activity Logging

All download operations are logged to the activity log:

| Event | Description |
|-------|-------------|
| `download.started` | User initiated a download |
| `download.completed` | Download finished successfully |
| `download.failed` | Download failed with error |
| `download.cancelled` | User cancelled the download |

## Implementation Notes

### Concurrent Download Limits

The system limits concurrent downloads to prevent resource exhaustion:

- Maximum 3 concurrent downloads system-wide
- Returns `503 Service Unavailable` when limit reached
- Client should retry after a delay or wait for capacity

### Download Sources

Game data is downloaded from configured `gameDataSources` in the backend
configuration. The system tries sources in order until one succeeds.

### Verification

After download completes, the file's SHA256 checksum is verified against the
expected hash stored in the game data entry. If verification fails, the download
is marked as failed and the file is deleted.

### File Storage

Downloaded files are stored in the Flashpoint Data directory as ZIP files,
organized by game data ID. Once verified, the game becomes playable via the
`/game-zip/*` routes.

## Related Documentation

- [Games API](./games-api.md) - Get launch data for games
- [Game Service Architecture](../05-game-service/architecture.md) - How game content is served

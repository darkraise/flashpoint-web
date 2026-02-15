# Jobs API

Manage background jobs and scheduled tasks.

**Base Path:** `/api/jobs`

**Authentication:** Required (JWT Bearer token)
**Permissions:** `settings.update` for all endpoints

## Overview

The Jobs API provides management of background scheduled tasks such as metadata
sync, cleanup operations, and other automated processes. Jobs can be enabled/disabled,
manually triggered, and their execution logs can be viewed.

## List All Jobs

`GET /api/jobs` - Requires auth + `settings.update` permission

Returns all registered jobs with their current status and configuration.

**Response:**

```json
[
  {
    "id": "metadata-sync",
    "name": "Metadata Sync",
    "description": "Synchronizes game metadata from external sources",
    "enabled": true,
    "running": false,
    "schedule": "0 */6 * * *",
    "lastRun": "2024-01-15T06:00:00.000Z",
    "nextRun": "2024-01-15T12:00:00.000Z",
    "lastResult": "success",
    "lastDuration": 45230
  },
  {
    "id": "cleanup-expired-tokens",
    "name": "Cleanup Expired Tokens",
    "description": "Removes expired refresh tokens from database",
    "enabled": true,
    "running": false,
    "schedule": "0 0 * * *",
    "lastRun": "2024-01-15T00:00:00.000Z",
    "nextRun": "2024-01-16T00:00:00.000Z",
    "lastResult": "success",
    "lastDuration": 1250
  }
]
```

**Job Fields:**

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique job identifier (lowercase, hyphenated) |
| name | string | Human-readable job name |
| description | string | What the job does |
| enabled | boolean | Whether job is enabled |
| running | boolean | Whether job is currently executing |
| schedule | string | Cron expression for schedule |
| lastRun | string (ISO) | When job last executed |
| nextRun | string (ISO) | When job will next execute |
| lastResult | string | `success`, `error`, or `null` |
| lastDuration | number | Last execution duration in milliseconds |

## Get Job Details

`GET /api/jobs/:jobId` - Requires auth + `settings.update` permission

Returns detailed status for a specific job.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| jobId | string | Job identifier (lowercase alphanumeric with hyphens) |

**Response:** Same format as list item above.

**Errors:**

| Status | Description |
|--------|-------------|
| `400 Bad Request` | Invalid job ID format |
| `404 Not Found` | Job not found |

## Update Job

`PATCH /api/jobs/:jobId` - Requires auth + `settings.update` permission

Enable or disable a job. When disabled, the job's scheduler is stopped and it
won't run on its schedule. When enabled, the scheduler is started.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| jobId | string | Job identifier |

**Request Body:**

```json
{
  "enabled": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| enabled | boolean | Yes | Whether to enable or disable the job |

**Response:** Updated job object.

**Errors:**

| Status | Description |
|--------|-------------|
| `400 Bad Request` | Invalid job ID or missing enabled field |
| `404 Not Found` | Job not found |

## Start Job Scheduler

`POST /api/jobs/:jobId/start` - Requires auth + `settings.update` permission

Starts the scheduler for a job. The job will run according to its cron schedule.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| jobId | string | Job identifier |

**Response:**

```json
{
  "success": true,
  "message": "Job started successfully"
}
```

## Stop Job Scheduler

`POST /api/jobs/:jobId/stop` - Requires auth + `settings.update` permission

Stops the scheduler for a job. The job will not run on schedule until started again.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| jobId | string | Job identifier |

**Response:**

```json
{
  "success": true,
  "message": "Job stopped successfully"
}
```

## Trigger Job Manually

`POST /api/jobs/:jobId/trigger` - Requires auth + `settings.update` permission

Manually triggers immediate execution of a job, regardless of its schedule.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| jobId | string | Job identifier |

**Response:**

```json
{
  "success": true,
  "message": "Job triggered successfully"
}
```

**Errors:**

| Status | Description |
|--------|-------------|
| `400 Bad Request` | Invalid job ID format |
| `409 Conflict` | Job is already running |

## Get Job Execution Logs

`GET /api/jobs/:jobId/logs` - Requires auth + `settings.update` permission

Returns execution history for a specific job.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| jobId | string | Job identifier |

**Query Parameters:**

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| limit | number | 50 | 100 | Results per page |
| offset | number | 0 | - | Offset for pagination |

**Response:**

```json
{
  "logs": [
    {
      "id": 123,
      "jobId": "metadata-sync",
      "startedAt": "2024-01-15T06:00:00.000Z",
      "completedAt": "2024-01-15T06:00:45.230Z",
      "duration": 45230,
      "result": "success",
      "triggeredBy": "scheduler",
      "details": "Synced 150 games"
    },
    {
      "id": 122,
      "jobId": "metadata-sync",
      "startedAt": "2024-01-15T00:00:00.000Z",
      "completedAt": "2024-01-15T00:00:32.100Z",
      "duration": 32100,
      "result": "success",
      "triggeredBy": "user:5",
      "details": "Synced 150 games"
    }
  ],
  "total": 45,
  "limit": 50,
  "offset": 0
}
```

**Log Fields:**

| Field | Type | Description |
|-------|------|-------------|
| id | number | Log entry ID |
| jobId | string | Job identifier |
| startedAt | string (ISO) | When execution started |
| completedAt | string (ISO) | When execution completed |
| duration | number | Duration in milliseconds |
| result | string | `success` or `error` |
| triggeredBy | string | `scheduler` or `user:<id>` |
| details | string | Execution details or error message |

## Get All Job Logs

`GET /api/jobs/logs/all` - Requires auth + `settings.update` permission

Returns execution history across all jobs.

**Query Parameters:**

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| limit | number | 100 | 200 | Results per page |
| offset | number | 0 | - | Offset for pagination |

**Response:** Same format as job-specific logs, but includes logs from all jobs.

## Activity Logging

Job management operations are logged to the activity log:

| Event | Description |
|-------|-------------|
| `jobs.update` | Job enabled/disabled |
| `jobs.start` | Job scheduler started |
| `jobs.stop` | Job scheduler stopped |
| `jobs.trigger` | Job manually triggered |

## Common Jobs

| Job ID | Description | Default Schedule |
|--------|-------------|------------------|
| `metadata-sync` | Sync game metadata from sources | Every 6 hours |
| `cleanup-expired-tokens` | Remove expired refresh tokens | Daily at midnight |
| `cleanup-orphaned-files` | Remove orphaned game files | Weekly |

## Example Workflow

```javascript
// 1. List all jobs
const jobs = await api.get('/jobs');

// 2. Disable a job
await api.patch('/jobs/metadata-sync', { enabled: false });

// 3. Manually trigger a job
try {
  await api.post('/jobs/cleanup-expired-tokens/trigger');
  console.log('Job triggered');
} catch (error) {
  if (error.response?.status === 409) {
    console.log('Job already running');
  }
}

// 4. View execution logs
const { logs, total } = await api.get('/jobs/metadata-sync/logs', {
  params: { limit: 20 }
});
```

## Related Documentation

- [Settings API](./settings-api.md) - System settings that may affect jobs
- [Activity Log API](./activity-api.md) - View job management activity

# Date & Time Formatting

## Overview

Date & Time Formatting provides customizable date and time display formats
throughout Flashpoint Web. Users can choose from multiple format options that
apply globally to all date and time displays, ensuring consistent and localized
presentation.

## User-Facing Functionality

**Access:** Settings > General Tab > Date & Time Format

## Date Format Options

| Format        | Example          | Description                      |
| ------------- | ---------------- | -------------------------------- |
| MM/dd/yyyy    | 01/24/2026       | US format (Month/Day/Year)       |
| dd/MM/yyyy    | 24/01/2026       | European format (Day/Month/Year) |
| yyyy-MM-dd    | 2026-01-24       | ISO 8601 format                  |
| MMM dd, yyyy  | Jan 24, 2026     | Short month name                 |
| MMMM dd, yyyy | January 24, 2026 | Full month name                  |
| dd MMM yyyy   | 24 Jan 2026      | Day-first with short month       |
| dd MMMM yyyy  | 24 January 2026  | Day-first with full month        |

## Time Format Options

| Format     | Example     | Description             |
| ---------- | ----------- | ----------------------- |
| hh:mm a    | 02:30 PM    | 12-hour with AM/PM      |
| HH:mm      | 14:30       | 24-hour (military time) |
| hh:mm:ss a | 02:30:45 PM | 12-hour with seconds    |
| HH:mm:ss   | 14:30:45    | 24-hour with seconds    |

## Where Formats Apply

**Activity Logs:**

- Timestamp column (datetime)
- Last activity in user leaderboard (datetime)
- Activity trend chart axis labels

**User Management:**

- Last login column (datetime)

**Play Statistics:**

- First played date (date)
- Last played date (date)
- Play activity chart axis labels (date)

**Settings:**

- Ruffle update published date (date)
- Last metadata sync time (datetime)

**General:**

- All timestamps in tables
- All dates in charts and graphs
- All activity history displays

## Database Schema

Settings stored in `system_settings` table:

```sql
-- Date format setting
INSERT INTO system_settings (key, value, data_type, category, is_public)
VALUES (
  'app.date_format',
  'MM/dd/yyyy',
  'string',
  'app',
  1
);

-- Time format setting
INSERT INTO system_settings (key, value, data_type, category, is_public)
VALUES (
  'app.time_format',
  'hh:mm a',
  'string',
  'app',
  1
);
```

**Properties:**

- `is_public = 1` - Accessible without authentication
- Validation schemas enforce allowed format values
- Default values set to US formats

## useDateTimeFormat Hook

Central hook for date/time formatting:

```typescript
import { useDateTimeFormat } from '@/hooks/useDateTimeFormat';

export function MyComponent() {
  const { formatDate, formatTime, formatDateTime } = useDateTimeFormat();

  return (
    <>
      <span>{formatDate(gameStats.firstPlayAt)}</span>
      <span>{formatDateTime(user.lastLoginAt)}</span>
    </>
  );
}
```

**Features:**

- Automatic caching with React Query
- Falls back to defaults if settings not loaded
- Handles Date objects, ISO strings, and timestamps
- Error handling with try/catch
- Uses date-fns for reliable formatting

## FormattedDate Component

Reusable component for consistent date/time display:

```typescript
import { FormattedDate } from '@/components/common/FormattedDate';

interface FormattedDateProps {
  date: Date | string | number;
  type?: 'date' | 'time' | 'datetime';
  className?: string;
}
```

**Usage:**

```tsx
<FormattedDate date={user.lastLoginAt} type="datetime" />
<FormattedDate date={stats.firstPlayAt} type="date" />
<FormattedDate date={session.startTime} type="time" />
```

## Common Use Cases

### 1. Format Dates in Table Columns

```typescript
const columns: ColumnDef<ActivityLog>[] = [
  {
    accessorKey: 'createdAt',
    header: 'Timestamp',
    cell: ({ row }) => {
      const timestamp = row.getValue('createdAt') as string;
      return (
        <div className="whitespace-nowrap">
          <FormattedDate date={timestamp} type="datetime" />
        </div>
      );
    },
  },
];
```

### 2. Format Dates in Charts

```typescript
export function PlaytimeChart() {
  const { formatDate } = useDateTimeFormat();
  const { data } = usePlayActivityOverTime(30);

  const chartData = data.map(item => ({
    date: formatDate(item.date),
    playtime: item.playtime,
  }));

  return <AreaChart data={chartData} />;
}
```

### 3. Format Relative Time with Fallback

```typescript
export function GameDetailView() {
  const { formatDate } = useDateTimeFormat();

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

    if (diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    }

    return formatDate(dateString);
  };

  return <span>Last played {formatRelativeTime(stats.lastPlayedAt)}</span>;
}
```

## Best Practices

### When to Use Each Type

**Use `type="datetime"` for:**

- Activity timestamps
- Last login times
- Session start/end times
- Any event with specific time

**Use `type="date"` for:**

- First/last played dates
- Release dates
- Published dates
- Any date without time

**Use `type="time"` for:**

- Time-only displays
- Chart axes for hourly data
- Duration displays

### Performance Optimization

**Do:**

- Use `<FormattedDate>` component for table cells
- Cache formats in components rendering many dates
- Call `useDateTimeFormat()` at component level, not in loops

**Don't:**

- Call `useDateTimeFormat()` inside map functions
- Create new Date objects unnecessarily
- Format dates multiple times for same value

**Example:**

```typescript
// Good - hook called once per component
export function ActivityTable() {
  const { formatDateTime } = useDateTimeFormat();

  return data.map(item => (
    <td>{formatDateTime(item.createdAt)}</td>
  ));
}

// Bad - hook called in map
return data.map(item => {
  const { formatDateTime } = useDateTimeFormat(); // ❌
  return <td>{formatDateTime(item.createdAt)}</td>;
});
```

### Error Handling

Always handle null/undefined dates:

```typescript
// Good
{lastLogin ? <FormattedDate date={lastLogin} type="datetime" /> : 'Never'}

// Also good - component handles it
<FormattedDate date={lastLogin || 'Unknown'} type="datetime" />
```

## Validation

Format validation enforced at multiple levels:

**Backend Validation:** JSON Schema ensures only valid formats accepted:

```json
{
  "type": "string",
  "enum": [
    "MM/dd/yyyy",
    "dd/MM/yyyy",
    "yyyy-MM-dd",
    "MMM dd, yyyy",
    "MMMM dd, yyyy",
    "dd MMM yyyy",
    "dd MMMM yyyy"
  ]
}
```

**Frontend Validation:** Select component restricts choices to valid options.

## Troubleshooting

**Dates Not Updating:**

- React Query cache not invalidating
- Component not using formatting hook
- Hard-coded date formats still in use

**Invalid Date Display:**

- Invalid date string
- Incorrect date parsing
- Timezone issues

**Format Not Applied:**

- Component not updated to use hook
- Manual date formatting still present
- Library using hard-coded format

## Migration Guide

**Before:**

```typescript
{
  new Date(timestamp).toLocaleString();
}
{
  date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
```

**After:**

```typescript
<FormattedDate date={timestamp} type="datetime" />
<FormattedDate date={date} type="date" />
```

**Or using hook:**

```typescript
const { formatDate, formatDateTime } = useDateTimeFormat();

{
  formatDateTime(timestamp);
}
{
  formatDate(date);
}
```

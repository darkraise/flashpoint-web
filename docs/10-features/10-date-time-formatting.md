# Date & Time Formatting

## Overview

The Date & Time Formatting feature provides customizable date and time display formats throughout Flashpoint Web. Users can choose from multiple format options that apply globally to all date and time displays in the application, ensuring consistent and localized presentation.

## User-Facing Functionality

### Settings Location

**Access:** Settings > General Tab > Date & Time Format

All users can view and modify their preferred date/time formats. Changes take effect immediately without requiring a page refresh.

### Date Format Options

Choose from 7 different date formats:

| Format | Example | Description |
|--------|---------|-------------|
| MM/dd/yyyy | 01/24/2026 | US format (Month/Day/Year) |
| dd/MM/yyyy | 24/01/2026 | European format (Day/Month/Year) |
| yyyy-MM-dd | 2026-01-24 | ISO 8601 format (Year-Month-Day) |
| MMM dd, yyyy | Jan 24, 2026 | Short month name |
| MMMM dd, yyyy | January 24, 2026 | Full month name |
| dd MMM yyyy | 24 Jan 2026 | Day-first with short month |
| dd MMMM yyyy | 24 January 2026 | Day-first with full month |

### Time Format Options

Choose from 4 different time formats:

| Format | Example | Description |
|--------|---------|-------------|
| hh:mm a | 02:30 PM | 12-hour with AM/PM |
| HH:mm | 14:30 | 24-hour (military time) |
| hh:mm:ss a | 02:30:45 PM | 12-hour with seconds |
| HH:mm:ss | 14:30:45 | 24-hour with seconds |

### Where Formats Apply

The selected formats are used throughout the application:

**Activity Logs:**
- Timestamp column (datetime)
- Last activity in user leaderboard (datetime)
- Activity trend chart axis labels (date or time based on range)

**User Management:**
- Last login column (datetime)

**Play Statistics:**
- First played date (date)
- Last played date (date)
- Play activity chart axis labels (date)
- Last played relative time (date after 7 days)

**Settings:**
- Ruffle update published date (date)
- Last metadata sync time (datetime)

**General:**
- All timestamps in tables
- All dates in charts and graphs
- All activity history displays

## Technical Implementation

### Architecture

**Backend Components:**
- `system_settings` table with `app.date_format` and `app.time_format` keys
- Migration 013 to create the settings
- Public settings (no authentication required to read)
- JSON Schema validation for allowed values

**Frontend Components:**
- `useDateTimeFormat` hook - Central formatting logic
- `FormattedDate` component - Reusable date display component
- `systemSettingsApi.getCategory('app')` - Fetch settings
- React Query caching (5 minute staleTime)

### Database Schema

Date/time format settings are stored in the `system_settings` table:

```sql
-- Date format setting
INSERT INTO system_settings (key, value, data_type, category, description, is_public, default_value, validation_schema)
VALUES (
  'app.date_format',
  'MM/dd/yyyy',
  'string',
  'app',
  'Date format for displaying dates throughout the application',
  1, -- public
  'MM/dd/yyyy',
  '{"type":"string","enum":["MM/dd/yyyy","dd/MM/yyyy","yyyy-MM-dd","MMM dd, yyyy","MMMM dd, yyyy","dd MMM yyyy","dd MMMM yyyy"]}'
);

-- Time format setting
INSERT INTO system_settings (key, value, data_type, category, description, is_public, default_value, validation_schema)
VALUES (
  'app.time_format',
  'hh:mm a',
  'string',
  'app',
  'Time format for displaying times throughout the application',
  1, -- public
  'hh:mm a',
  '{"type":"string","enum":["hh:mm a","HH:mm","hh:mm:ss a","HH:mm:ss"]}'
);
```

**Key Properties:**
- `is_public = 1` - Accessible without authentication
- Validation schemas enforce allowed format values
- Default values set to US formats

### useDateTimeFormat Hook

Central hook for date/time formatting:

```typescript
import { useQuery } from '@tanstack/react-query';
import { systemSettingsApi } from '@/lib/api';
import { format as dateFnsFormat } from 'date-fns';

export function useDateTimeFormat() {
  // Fetch app settings with 5-minute cache
  const { data: appSettings } = useQuery({
    queryKey: ['appSettings'],
    queryFn: () => systemSettingsApi.getCategory('app'),
    staleTime: 5 * 60 * 1000,
  });

  const dateFormat = appSettings?.dateFormat || 'MM/dd/yyyy';
  const timeFormat = appSettings?.timeFormat || 'hh:mm a';

  // Format functions using date-fns
  const formatDate = (date: Date | string | number): string => {
    const dateObj = typeof date === 'string' || typeof date === 'number'
      ? new Date(date)
      : date;
    return dateFnsFormat(dateObj, dateFormat);
  };

  const formatTime = (date: Date | string | number): string => {
    const dateObj = typeof date === 'string' || typeof date === 'number'
      ? new Date(date)
      : date;
    return dateFnsFormat(dateObj, timeFormat);
  };

  const formatDateTime = (date: Date | string | number): string => {
    const dateObj = typeof date === 'string' || typeof date === 'number'
      ? new Date(date)
      : date;
    return dateFnsFormat(dateObj, `${dateFormat} ${timeFormat}`);
  };

  return {
    dateFormat,
    timeFormat,
    formatDate,
    formatTime,
    formatDateTime,
  };
}
```

**Features:**
- Automatic caching with React Query
- Falls back to defaults if settings not loaded
- Handles Date objects, ISO strings, and timestamps
- Error handling with try/catch
- Uses date-fns for reliable formatting

### FormattedDate Component

Reusable component for consistent date/time display:

```typescript
import { useDateTimeFormat } from '@/hooks/useDateTimeFormat';

interface FormattedDateProps {
  date: Date | string | number;
  type?: 'date' | 'time' | 'datetime';
  className?: string;
}

export function FormattedDate({ date, type = 'datetime', className }: FormattedDateProps) {
  const { formatDate, formatTime, formatDateTime } = useDateTimeFormat();

  const getFormattedValue = () => {
    if (!date) return 'Unknown';

    try {
      switch (type) {
        case 'date':
          return formatDate(date);
        case 'time':
          return formatTime(date);
        case 'datetime':
        default:
          return formatDateTime(date);
      }
    } catch (error) {
      console.error('Error formatting date:', error);
      return String(date);
    }
  };

  return <span className={className}>{getFormattedValue()}</span>;
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
        <div className="text-muted-foreground whitespace-nowrap">
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

    // Use user's preferred format for older dates
    return formatDate(dateString);
  };

  return <span>Last played {formatRelativeTime(stats.lastPlayedAt)}</span>;
}
```

### 4. Conditional Formatting

```typescript
export function UserStatsPanel() {
  const { formatDate } = useDateTimeFormat();

  return (
    <>
      <p>First Played: {stats.firstPlayAt ? formatDate(stats.firstPlayAt) : 'Never'}</p>
      <p>Last Played: {stats.lastPlayAt ? formatDate(stats.lastPlayAt) : 'Never'}</p>
    </>
  );
}
```

## Best Practices

### When to Use Each Format Type

**Use `type="datetime"` for:**
- Activity timestamps
- Last login times
- Session start/end times
- Any event with specific time

**Use `type="date"` for:**
- First/last played dates
- Release dates
- Published dates
- Any date without time component

**Use `type="time"` for:**
- Time-only displays
- Chart axes for hourly data
- Duration displays (rare)

### Performance Optimization

**Do:**
- ✅ Use `<FormattedDate>` component for table cells
- ✅ Cache formats in components that render many dates
- ✅ Use `useDateTimeFormat` hook at component level, not in loops

**Don't:**
- ❌ Call `useDateTimeFormat()` inside map functions
- ❌ Create new Date objects unnecessarily
- ❌ Format dates multiple times for same value

**Example:**
```typescript
// Good - hook called once per component
export function ActivityTable() {
  const { formatDateTime } = useDateTimeFormat();

  return data.map(item => (
    <td>{formatDateTime(item.createdAt)}</td>
  ));
}

// Bad - hook called in map function
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

Format validation is enforced at multiple levels:

### Backend Validation

JSON Schema ensures only valid formats are accepted:

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

**Validation Process:**
1. User selects format in UI
2. Frontend sends update request
3. Backend validates against schema
4. Returns error if invalid format
5. Updates database if valid

### Frontend Validation

Select component restricts choices to valid options:

```tsx
<Select value={dateFormat} onValueChange={updateFormat}>
  <SelectItem value="MM/dd/yyyy">MM/DD/YYYY (01/24/2026)</SelectItem>
  <SelectItem value="dd/MM/yyyy">DD/MM/YYYY (24/01/2026)</SelectItem>
  {/* etc */}
</Select>
```

## Troubleshooting

### Dates Not Updating

**Symptom:** Date formats don't change after updating settings

**Causes:**
1. React Query cache not invalidating
2. Component not using formatting hook
3. Hard-coded date formats still in use

**Solutions:**
```typescript
// Ensure mutation invalidates cache
const updateAppSettings = useMutation({
  mutationFn: (settings) => systemSettingsApi.updateCategory('app', settings),
  onSuccess: () => {
    refetchAppSettings(); // Invalidate app settings cache
  },
});

// Use FormattedDate component or hook
<FormattedDate date={timestamp} type="datetime" />
```

### Invalid Date Display

**Symptom:** Dates show as "Invalid Date" or "NaN"

**Causes:**
1. Invalid date string
2. Incorrect date parsing
3. Timezone issues

**Solutions:**
```typescript
// Validate before formatting
const formatSafeDate = (dateString: string) => {
  if (!dateString) return 'Unknown';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid Date';

  return formatDate(date);
};
```

### Format Not Applied

**Symptom:** Some dates still use old format

**Causes:**
1. Component not updated to use hook
2. Manual date formatting still present
3. Library using hard-coded format

**Solutions:**
- Search codebase for `toLocaleDateString`, `toLocaleString`, `toLocaleTimeString`
- Replace with `<FormattedDate>` or `useDateTimeFormat` hook
- Check third-party libraries for format customization options

## Migration Guide

### Updating Existing Components

**Before:**
```typescript
{new Date(timestamp).toLocaleString()}
{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
```

**After:**
```typescript
import { FormattedDate } from '@/components/common/FormattedDate';

<FormattedDate date={timestamp} type="datetime" />
<FormattedDate date={date} type="date" />
```

**Or using the hook:**
```typescript
import { useDateTimeFormat } from '@/hooks/useDateTimeFormat';

const { formatDate, formatDateTime } = useDateTimeFormat();

{formatDateTime(timestamp)}
{formatDate(date)}
```

## Future Enhancements

Potential improvements to consider:

1. **Locale Support** - Add locale-specific formatting beyond just format patterns
2. **Relative Time Options** - User-configurable relative time display ("2 days ago" vs absolute date)
3. **Timezone Support** - Display dates in user's timezone
4. **Custom Formats** - Allow users to create custom date/time formats
5. **Format Presets** - Quick presets for common locales (US, UK, ISO, etc.)
6. **Per-User Settings** - Allow different formats per user rather than global
7. **Date Range Formatting** - Special formatting for date ranges
8. **Calendar Integration** - Format for calendar displays

## Related Documentation

- [System Settings](./09-system-settings.md) - Overall settings management
- [Frontend Components](../04-frontend/components/component-overview.md) - UI component documentation
- [Database Schema](../12-reference/database-schema-reference.md) - Database structure

---

**Last Updated:** 2026-01-24
**Feature Version:** 1.0
**Migration:** 013_add-datetime-format-settings.sql

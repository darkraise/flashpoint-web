import { memo } from 'react';
import { ActivityTable } from '../components/activities/ActivityTable';
import { ActivityDashboard } from '../components/activities/dashboard/ActivityDashboard';
import { ActivityErrorBoundary } from '../components/error/ActivityErrorBoundary';
import { useFeatureFlags } from '../hooks/useFeatureFlags';
import { Activity } from 'lucide-react';

// Memoize header to prevent re-renders
const ActivityHeader = memo(() => (
  <div className="mb-6">
    <div className="flex items-center gap-3 mb-2">
      <Activity size={32} className="text-primary" />
      <h1 className="text-3xl font-bold">Activity Logs</h1>
    </div>
    <p className="text-muted-foreground">
      View all user activity and system events
    </p>
  </div>
));

ActivityHeader.displayName = 'ActivityHeader';

export function ActivitiesView() {
  const { enableStatistics } = useFeatureFlags();

  return (
    <ActivityErrorBoundary>
      <div className="container mx-auto px-4 py-8">
        <ActivityHeader />

        {/* Dashboard - only render if statistics feature is enabled */}
        {enableStatistics && (
          <div className="mb-6">
            <ActivityDashboard />
          </div>
        )}

        {/* Activity Table */}
        <ActivityTable />
      </div>
    </ActivityErrorBoundary>
  );
}

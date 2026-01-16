import { ActivityTable } from '../components/activities/ActivityTable';
import { Activity } from 'lucide-react';

export function ActivitiesView() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Activity size={32} className="text-primary" />
          <h1 className="text-3xl font-bold">Activity Logs</h1>
        </div>
        <p className="text-muted-foreground">
          View all user activity and system events
        </p>
      </div>

      <ActivityTable />
    </div>
  );
}

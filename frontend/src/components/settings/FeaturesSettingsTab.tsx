import { ToggleLeft, Info } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion, Variants } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { systemSettingsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useDialog } from '@/contexts/DialogContext';

interface FeaturesSettingsTabProps {
  tabContentVariants: Variants;
}

export function FeaturesSettingsTab({ tabContentVariants }: FeaturesSettingsTabProps) {
  const { user } = useAuthStore();
  const { showToast } = useDialog();
  const queryClient = useQueryClient();
  const isAdmin = user?.permissions.includes('settings.update');

  // Fetch feature settings
  const { data: featureSettings } = useQuery({
    queryKey: ['systemSettings', 'features'],
    queryFn: () => systemSettingsApi.getCategory('features'),
    enabled: isAdmin,
  });

  // Update system settings mutation
  const updateSystemSettings = useMutation({
    mutationFn: ({ category, settings }: { category: string; settings: Record<string, unknown> }) =>
      systemSettingsApi.updateCategory(category, settings),
    onSuccess: (updatedSettings, variables) => {
      // Use response data instead of refetching
      queryClient.setQueryData(['systemSettings', variables.category], updatedSettings);

      showToast('Settings updated successfully', 'success');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error?.message || 'Failed to update settings';
      showToast(message, 'error');
    },
  });

  return (
    <motion.div
      key="features"
      variants={tabContentVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-6"
    >
      {isAdmin && featureSettings ? (
        <div className="bg-card rounded-lg p-6 border border-border shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <ToggleLeft size={24} className="text-primary" />
            <h2 className="text-xl font-semibold">Feature Flags</h2>
          </div>

          <Alert className="mb-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              <strong>Admin Access:</strong> Feature flags only affect normal users. As an admin,
              you have full access to all features regardless of these settings, allowing you to
              manage and monitor the system effectively.
            </AlertDescription>
          </Alert>

          <div className="space-y-6">
            {/* Playlists */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enable-playlists" className="text-base">
                  Enable Playlists
                </Label>
                <p className="text-sm text-muted-foreground">
                  Allow users to create and manage game playlists.
                </p>
              </div>
              <Switch
                id="enable-playlists"
                checked={featureSettings.enablePlaylists !== false}
                onCheckedChange={(checked: boolean) => {
                  updateSystemSettings.mutate({
                    category: 'features',
                    settings: { enablePlaylists: checked },
                  });
                }}
                disabled={updateSystemSettings.isPending}
              />
            </div>

            {/* Favorites */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enable-favorites" className="text-base">
                  Enable Favorites
                </Label>
                <p className="text-sm text-muted-foreground">
                  Allow users to mark games as favorites.
                </p>
              </div>
              <Switch
                id="enable-favorites"
                checked={featureSettings.enableFavorites !== false}
                onCheckedChange={(checked: boolean) => {
                  updateSystemSettings.mutate({
                    category: 'features',
                    settings: { enableFavorites: checked },
                  });
                }}
                disabled={updateSystemSettings.isPending}
              />
            </div>

            {/* Statistics */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enable-statistics" className="text-base">
                  Enable Statistics
                </Label>
                <p className="text-sm text-muted-foreground">
                  Track and display play statistics and analytics.
                </p>
              </div>
              <Switch
                id="enable-statistics"
                checked={featureSettings.enableStatistics !== false}
                onCheckedChange={(checked: boolean) => {
                  updateSystemSettings.mutate({
                    category: 'features',
                    settings: { enableStatistics: checked },
                  });
                }}
                disabled={updateSystemSettings.isPending}
              />
            </div>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}

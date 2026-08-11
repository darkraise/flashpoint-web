import { ToggleLeft, Info } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { motion, Variants } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { systemSettingsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useDialog } from '@/contexts/DialogContext';
import { getErrorMessage } from '@/types/api-error';

interface FeaturesSettingsTabProps {
  tabContentVariants: Variants;
}

export function FeaturesSettingsTab({ tabContentVariants }: FeaturesSettingsTabProps) {
  const { user } = useAuthStore();
  const { showToast } = useDialog();
  const queryClient = useQueryClient();
  const isAdmin = user?.permissions.includes('settings.update');

  const { data: featureSettings } = useQuery({
    queryKey: ['systemSettings', 'features'],
    queryFn: () => systemSettingsApi.getCategory('features'),
    enabled: isAdmin,
  });

  const updateSystemSettings = useMutation({
    mutationFn: ({ category, settings }: { category: string; settings: Record<string, unknown> }) =>
      systemSettingsApi.updateCategory(category, settings),
    onSuccess: (updatedSettings, variables) => {
      queryClient.setQueryData(['systemSettings', variables.category], updatedSettings);
      queryClient.invalidateQueries({ queryKey: ['system-settings', 'public'] });

      showToast('Settings updated successfully', 'success');
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error) || 'Failed to update settings';
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

            {/* Ratings */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enable-ratings" className="text-base">
                  Enable Ratings
                </Label>
                <p className="text-sm text-muted-foreground">
                  Allow users to rate games with a 5-star rating system.
                </p>
              </div>
              <Switch
                id="enable-ratings"
                checked={featureSettings.enableRatings !== false}
                onCheckedChange={(checked: boolean) => {
                  updateSystemSettings.mutate({
                    category: 'features',
                    settings: { enableRatings: checked },
                  });
                }}
                disabled={updateSystemSettings.isPending}
              />
            </div>

            {/* I'm Feeling Lucky button */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enable-lucky-button" className="text-base">
                  Show &quot;I&apos;m Feeling Lucky&quot; Button
                </Label>
                <p className="text-sm text-muted-foreground">
                  Display the floating shuffle button that opens a random game. This one also
                  applies to admins.
                </p>
              </div>
              <Switch
                id="enable-lucky-button"
                checked={featureSettings.enableLuckyButton !== false}
                onCheckedChange={(checked: boolean) => {
                  updateSystemSettings.mutate({
                    category: 'features',
                    settings: { enableLuckyButton: checked },
                  });
                }}
                disabled={updateSystemSettings.isPending}
              />
            </div>

            {/* Downloaded page */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enable-downloaded-page" className="text-base">
                  Enable Downloaded Page
                </Label>
                <p className="text-sm text-muted-foreground">
                  Show a page listing only games whose files are downloaded.
                </p>
              </div>
              <Switch
                id="enable-downloaded-page"
                checked={featureSettings.enableDownloadedPage !== false}
                onCheckedChange={(checked: boolean) => {
                  updateSystemSettings.mutate({
                    category: 'features',
                    settings: { enableDownloadedPage: checked },
                  });
                }}
                disabled={updateSystemSettings.isPending}
              />
            </div>

            {featureSettings.enableDownloadedPage !== false ? (
              <div className="flex items-center justify-between pl-6 border-l-2 border-border">
                <div className="space-y-0.5">
                  <Label htmlFor="enable-downloaded-page-guests" className="text-base">
                    Show Downloaded Page To Guests
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Let signed-out guests open the Downloaded page.
                  </p>
                </div>
                <Switch
                  id="enable-downloaded-page-guests"
                  checked={featureSettings.enableDownloadedPageForGuests === true}
                  onCheckedChange={(checked: boolean) => {
                    updateSystemSettings.mutate({
                      category: 'features',
                      settings: { enableDownloadedPageForGuests: checked },
                    });
                  }}
                  disabled={updateSystemSettings.isPending}
                />
              </div>
            ) : null}

            {/* Downloaded filter default */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enable-downloaded-filter-default" className="text-base">
                  Filter To Downloaded By Default
                </Label>
                <p className="text-sm text-muted-foreground">
                  Browse pages start with the downloaded filter on. This one also applies to admins;
                  anyone can still switch it off per page.
                </p>
              </div>
              <Switch
                id="enable-downloaded-filter-default"
                checked={featureSettings.enableDownloadedFilterDefault === true}
                onCheckedChange={(checked: boolean) => {
                  updateSystemSettings.mutate({
                    category: 'features',
                    settings: { enableDownloadedFilterDefault: checked },
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

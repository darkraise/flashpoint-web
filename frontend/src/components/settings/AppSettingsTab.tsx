import { useState, useEffect } from 'react';
import { Palette, Check, Globe, Plus, Trash2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { motion, Variants } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { systemSettingsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useDialog } from '@/contexts/DialogContext';
import { AppSettings } from '@/types/settings';
import { useDomains, useAddDomain, useDeleteDomain, useSetDefaultDomain } from '@/hooks/useDomains';

interface AppSettingsTabProps {
  tabContentVariants: Variants;
}

export function AppSettingsTab({ tabContentVariants }: AppSettingsTabProps) {
  const { user } = useAuthStore();
  const { showToast } = useDialog();
  const queryClient = useQueryClient();
  const isAdmin = user?.permissions.includes('settings.update');

  // Local state for site name input
  const [siteNameInput, setSiteNameInput] = useState('');

  // Domain settings state
  const [domainInput, setDomainInput] = useState('');
  const [domainError, setDomainError] = useState<string | null>(null);
  const [deletingDomainIds, setDeletingDomainIds] = useState<Set<number>>(new Set());
  const { data: domains } = useDomains(!!isAdmin);
  const addDomainMutation = useAddDomain();
  const deleteDomainMutation = useDeleteDomain();
  const setDefaultDomainMutation = useSetDefaultDomain();

  // Fetch app settings
  const { data: appSettings } = useQuery({
    queryKey: ['systemSettings', 'app'],
    queryFn: async () => systemSettingsApi.getCategory('app') as unknown as AppSettings,
    enabled: isAdmin,
  });

  // Sync local state with fetched settings
  useEffect(() => {
    if (appSettings?.siteName) {
      setSiteNameInput(appSettings.siteName);
    }
  }, [appSettings?.siteName]);

  // Update system settings mutation
  const updateSystemSettings = useMutation({
    mutationFn: ({ category, settings }: { category: string; settings: Record<string, unknown> }) =>
      systemSettingsApi.updateCategory(category, settings),
    onSuccess: (updatedSettings, variables) => {
      // Use response data instead of refetching
      queryClient.setQueryData(['systemSettings', variables.category], updatedSettings);

      // Invalidate public settings cache so header updates
      queryClient.invalidateQueries({
        queryKey: ['system-settings', 'public'],
      });

      showToast('Settings updated successfully', 'success');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error?.message || 'Failed to update settings';
      showToast(message, 'error');
    },
  });

  // Handler to save site name
  const handleSaveSiteName = () => {
    if (siteNameInput.trim() === '') {
      showToast('Site name cannot be empty', 'error');
      return;
    }
    updateSystemSettings.mutate({
      category: 'app',
      settings: { siteName: siteNameInput.trim() },
    });
  };

  return (
    <motion.div
      key="app"
      variants={tabContentVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="space-y-6"
    >
      {isAdmin && appSettings ? (
        <div className="bg-card rounded-lg p-6 border border-border shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <Palette size={24} className="text-primary" />
            <h2 className="text-xl font-semibold">Application Settings</h2>
          </div>

          <div className="space-y-6">
            {/* Site Name */}
            <div className="space-y-2">
              <Label htmlFor="site-name" className="text-base">
                Site Name
              </Label>
              <p className="text-sm text-muted-foreground">
                The name displayed in the application header and browser title.
              </p>
              <div className="flex items-center gap-2">
                <input
                  id="site-name"
                  type="text"
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                  value={siteNameInput}
                  onChange={(e) => setSiteNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveSiteName();
                    }
                  }}
                  disabled={updateSystemSettings.isPending}
                  placeholder="Enter site name"
                />
                <Button
                  onClick={handleSaveSiteName}
                  disabled={
                    updateSystemSettings.isPending ||
                    siteNameInput.trim() === '' ||
                    siteNameInput === appSettings?.siteName
                  }
                  size="icon"
                  title="Save site name"
                >
                  <Check size={18} />
                </Button>
              </div>
            </div>

            {/* Maintenance Mode */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="maintenance-mode" className="text-base">
                  Maintenance Mode
                </Label>
                <p className="text-sm text-muted-foreground">
                  Enable maintenance mode to prevent non-admin users from accessing the application.
                </p>
              </div>
              <Switch
                id="maintenance-mode"
                checked={appSettings.maintenanceMode || false}
                onCheckedChange={(checked: boolean) => {
                  updateSystemSettings.mutate({
                    category: 'app',
                    settings: { maintenanceMode: checked },
                  });
                }}
                disabled={updateSystemSettings.isPending}
              />
            </div>

            {/* Default Theme */}
            <div className="space-y-2">
              <Label htmlFor="default-theme" className="text-base">
                Default Theme
              </Label>
              <p className="text-sm text-muted-foreground">
                Default theme mode for new users (light, dark, or system).
              </p>
              <Select
                value={appSettings.defaultTheme || 'dark'}
                onValueChange={(value: string) => {
                  updateSystemSettings.mutate({
                    category: 'app',
                    settings: { defaultTheme: value },
                  });
                }}
                disabled={updateSystemSettings.isPending}
              >
                <SelectTrigger id="default-theme" className="w-full">
                  <SelectValue placeholder="Select default theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Default Primary Color */}
            <div className="space-y-2">
              <Label htmlFor="default-primary-color" className="text-base">
                Default Primary Color
              </Label>
              <p className="text-sm text-muted-foreground">Default primary color for new users.</p>
              <Select
                value={appSettings.defaultPrimaryColor || 'blue'}
                onValueChange={(value: string) => {
                  updateSystemSettings.mutate({
                    category: 'app',
                    settings: {
                      defaultPrimaryColor: value,
                    },
                  });
                }}
                disabled={updateSystemSettings.isPending}
              >
                <SelectTrigger id="default-primary-color" className="w-full">
                  <SelectValue placeholder="Select default primary color" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="slate">Slate</SelectItem>
                  <SelectItem value="gray">Gray</SelectItem>
                  <SelectItem value="zinc">Zinc</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="stone">Stone</SelectItem>
                  <SelectItem value="red">Red</SelectItem>
                  <SelectItem value="orange">Orange</SelectItem>
                  <SelectItem value="amber">Amber</SelectItem>
                  <SelectItem value="yellow">Yellow</SelectItem>
                  <SelectItem value="lime">Lime</SelectItem>
                  <SelectItem value="green">Green</SelectItem>
                  <SelectItem value="emerald">Emerald</SelectItem>
                  <SelectItem value="teal">Teal</SelectItem>
                  <SelectItem value="cyan">Cyan</SelectItem>
                  <SelectItem value="sky">Sky</SelectItem>
                  <SelectItem value="blue">Blue</SelectItem>
                  <SelectItem value="indigo">Indigo</SelectItem>
                  <SelectItem value="violet">Violet</SelectItem>
                  <SelectItem value="purple">Purple</SelectItem>
                  <SelectItem value="fuchsia">Fuchsia</SelectItem>
                  <SelectItem value="pink">Pink</SelectItem>
                  <SelectItem value="rose">Rose</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      ) : null}

      {isAdmin ? (
        <div className="bg-card rounded-lg p-6 border border-border shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <Globe size={24} className="text-primary" />
            <h2 className="text-xl font-semibold">Domain Settings</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Configure custom domains for sharing playlists. The default domain is used in share
            links for non-admin users.
          </p>

          {/* Add Domain */}
          <div className="flex items-start gap-2 mb-4">
            <div className="flex-1">
              <input
                type="text"
                className={`w-full px-3 py-2 bg-background border rounded-md focus:outline-none focus:ring-1 focus:ring-primary ${
                  domainError ? 'border-destructive' : 'border-border'
                }`}
                value={domainInput}
                onChange={(e) => {
                  setDomainInput(e.target.value);
                  setDomainError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddDomain();
                }}
                placeholder="e.g., play.example.com"
                disabled={addDomainMutation.isPending}
              />
              {domainError ? <p className="text-xs text-destructive mt-1">{domainError}</p> : null}
            </div>
            <Button
              onClick={handleAddDomain}
              disabled={addDomainMutation.isPending || !domainInput.trim()}
              size="icon"
              title="Add domain"
            >
              <Plus size={18} />
            </Button>
          </div>

          {/* Domain List */}
          {domains && domains.length > 0 ? (
            <div className="space-y-2">
              {domains.map((domain) => (
                <div
                  key={domain.id}
                  className="flex items-center justify-between px-3 py-2 bg-background border border-border rounded-md"
                >
                  <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                    <input
                      type="radio"
                      name="default-domain"
                      checked={domain.isDefault}
                      onChange={() => setDefaultDomainMutation.mutate(domain.id)}
                      disabled={setDefaultDomainMutation.isPending}
                      className="accent-primary"
                    />
                    <span className="text-sm font-mono truncate">{domain.hostname}</span>
                    {domain.isDefault ? (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full whitespace-nowrap">
                        default
                      </span>
                    ) : null}
                  </label>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setDeletingDomainIds((prev) => new Set(prev).add(domain.id));
                      deleteDomainMutation.mutate(domain.id, {
                        onSettled: () =>
                          setDeletingDomainIds((prev) => {
                            const next = new Set(prev);
                            next.delete(domain.id);
                            return next;
                          }),
                      });
                    }}
                    disabled={deletingDomainIds.has(domain.id)}
                    title="Delete domain"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No domains configured. Share links will use the current browser URL.
            </p>
          )}
        </div>
      ) : null}
    </motion.div>
  );

  function handleAddDomain() {
    const value = domainInput.trim();
    if (!value) return;

    // Client-side validation
    if (/^https?:\/\//i.test(value)) {
      setDomainError("Don't include the protocol (http:// or https://)");
      return;
    }
    if (/[/?#]/.test(value)) {
      setDomainError("Don't include a path, query string, or fragment");
      return;
    }
    if (domains?.some((d) => d.hostname.toLowerCase() === value.toLowerCase())) {
      setDomainError('This domain already exists');
      return;
    }

    addDomainMutation.mutate(value, {
      onSuccess: () => {
        setDomainInput('');
        setDomainError(null);
      },
    });
  }
}

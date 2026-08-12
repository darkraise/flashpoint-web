import { useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RefreshCw,
  Rocket,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FormattedDate } from '@/components/common/FormattedDate';
import { useDialog } from '@/contexts/DialogContext';
import { updatesApi, type AppUpdateInfo } from '@/lib/api';

const UPGRADE_COMMAND = 'docker compose pull && docker compose up -d';

export function AppUpdateCard() {
  const { showToast } = useDialog();
  const queryClient = useQueryClient();
  const [showChangelog, setShowChangelog] = useState(false);
  const [expandedFor, setExpandedFor] = useState<string | null>(null);

  const {
    data: info,
    isLoading,
    isLoadingError,
  } = useQuery({
    queryKey: ['appUpdate'],
    queryFn: () => updatesApi.getAppUpdate(),
    staleTime: 5 * 60 * 1000,
  });

  // A refetch would reuse the original query function, so it cannot ask for a
  // forced check; the mutation writes its result into the same cache entry.
  const checkNow = useMutation({
    mutationFn: () => updatesApi.getAppUpdate(true),
    onSuccess: (result: AppUpdateInfo) => {
      queryClient.setQueryData(['appUpdate'], result);

      if (result.lastCheckFailed) {
        showToast('Could not reach GitHub to check for updates', 'error');
      } else if (result.updateAvailable) {
        showToast(`Flashpoint Web ${result.latestVersion} is available`, 'success');
      } else if (!result.isUnreleasedBuild) {
        showToast('Flashpoint Web is up to date', 'success');
      }
    },
    onError: () => showToast('Could not check for updates', 'error'),
  });

  // This is the render-phase state-adjustment pattern React documents for
  // deriving state from props; it avoids the effect-plus-dependency loop.
  if (info?.updateAvailable && info.changelog && expandedFor !== info.latestVersion) {
    setExpandedFor(info.latestVersion);
    setShowChangelog(true);
  }

  const checkFailedEntirely =
    isLoadingError || (info?.lastCheckFailed === true && info.latestVersion === null);

  return (
    <div className="bg-card rounded-lg p-6 border border-border shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Rocket size={24} className="text-primary" aria-hidden="true" />
          <h2 className="text-xl font-semibold">Flashpoint Web</h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => checkNow.mutate()}
          disabled={checkNow.isPending || isLoading}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${checkNow.isPending ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          {checkNow.isPending ? 'Checking...' : 'Check for Updates'}
        </Button>
      </div>

      <div className="space-y-4">
        <div className="space-y-1">
          <Label className="text-sm text-muted-foreground">Current Version</Label>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold">{info?.currentVersion ?? 'Unknown'}</span>
            {info && !info.isUnreleasedBuild && !info.updateAvailable && !info.lastCheckFailed ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" aria-hidden="true" />
            ) : null}
          </div>
        </div>

        {isLoading ? <div className="h-20 bg-muted rounded-lg animate-pulse" /> : null}

        {checkFailedEntirely ? (
          <div className="p-4 border border-border rounded-lg bg-muted/50 flex items-start gap-3">
            <AlertCircle
              className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div>
              <p className="font-medium">Could not check for updates</p>
              <p className="text-sm text-muted-foreground mt-1">
                GitHub could not be reached. This does not affect anything else.
              </p>
            </div>
          </div>
        ) : null}

        {info && !checkFailedEntirely && info.isUnreleasedBuild ? (
          <div className="p-4 border border-border rounded-lg bg-muted/50 space-y-1">
            <p className="font-medium">Update checks are off</p>
            <p className="text-sm text-muted-foreground">
              The server did not report a released version, so there is nothing to compare against.
              Latest release: {info.latestVersion ?? 'unknown'}
              {info.publishedAt ? (
                <>
                  {' '}
                  (<FormattedDate date={info.publishedAt} type="date" />)
                </>
              ) : null}
              .
            </p>
          </div>
        ) : null}

        {info && !checkFailedEntirely && !info.isUnreleasedBuild ? (
          <div className="p-4 border border-border rounded-lg bg-muted/50 space-y-3">
            <div>
              <p className="font-medium">
                {info.updateAvailable
                  ? `Update available: ${info.latestVersion}`
                  : "You're up to date!"}
              </p>
              {info.publishedAt ? (
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" aria-hidden="true" />
                  <span>
                    Released <FormattedDate date={info.publishedAt} type="date" />
                  </span>
                </div>
              ) : null}
              {info.lastCheckFailed && info.checkedAt ? (
                <p className="text-xs text-muted-foreground mt-2">
                  The last check failed. Showing the result from{' '}
                  <FormattedDate date={info.checkedAt} type="datetime" />.
                </p>
              ) : null}
            </div>

            {info.updateAvailable ? (
              <div className="space-y-2 border-t border-border pt-3">
                <p className="text-sm text-muted-foreground">To upgrade, on the server:</p>
                <pre className="bg-background border border-border rounded-lg p-3 text-xs overflow-x-auto">
                  <code>{UPGRADE_COMMAND}</code>
                </pre>
                <p className="text-xs text-muted-foreground">
                  If you pinned <span className="font-mono">IMAGE_TAG</span> in your{' '}
                  <span className="font-mono">.env</span>, raise it first — otherwise the pull
                  fetches the version you pinned.
                </p>
                {info.releaseUrl ? (
                  <a
                    href={info.releaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    View release on GitHub
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                ) : null}
              </div>
            ) : null}

            {info.updateAvailable && info.changelog ? (
              <div className="border-t border-border pt-3">
                <button
                  onClick={() => setShowChangelog(!showChangelog)}
                  className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors w-full"
                >
                  {showChangelog ? (
                    <ChevronUp className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span>{showChangelog ? 'Hide' : 'View'} Changelog</span>
                </button>
                {showChangelog ? (
                  <div className="mt-3 p-3 bg-background border border-border rounded-lg">
                    <div className="text-sm text-foreground/90 max-h-96 overflow-y-auto prose prose-sm dark:prose-invert max-w-none prose-headings:mt-3 prose-headings:mb-2 prose-p:my-2 prose-ul:my-2 prose-li:my-0.5 prose-code:text-xs prose-pre:text-xs">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{info.changelog}</ReactMarkdown>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { ParticleNetworkBackground } from '@/components/auth/ParticleNetworkBackground';
import { useServerStatusStore } from '@/store/serverStatus';

const POLL_INTERVAL_MS = 2000;
/** A server that accepts the connection but never answers is not a live one. */
const POLL_TIMEOUT_MS = 5000;
/** Consecutive unreachable polls before we stop calling this a slow start. */
const UNREACHABLE_POLLS_BEFORE_WARNING = 8;

interface HealthBody {
  status?: string;
  phase?: string;
}

/**
 * Read the backend's own startup marker. A reachable proxy in front of a dead
 * backend still answers (Vite's dev proxy with 500, nginx with 502), so the
 * status code alone cannot tell "starting" from "gone" — only this body can.
 */
async function readStartingMarker(response: Response): Promise<HealthBody | null> {
  try {
    const body: unknown = await response.json();
    if (typeof body === 'object' && body !== null && 'status' in body) {
      const parsed = body as HealthBody;
      return parsed.status === 'starting' ? parsed : null;
    }
  } catch {
    // A proxy error page, not our JSON.
  }
  return null;
}

/**
 * Shown while the backend is up but not yet serving requests — on a network
 * mount the database copy and cache pre-warm can run for minutes after the port
 * opens. Reloads once the server reports ready so the app starts from a clean
 * state rather than resuming half-failed queries.
 */
export function ServerStartingScreen() {
  const phase = useServerStatusStore((state) => state.phase);
  const setStarting = useServerStatusStore((state) => state.setStarting);
  const [isUnreachable, setIsUnreachable] = useState(false);
  const unreachablePollsRef = useRef(0);
  const pollerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const setStartingRef = useRef(setStarting);

  useEffect(() => {
    setStartingRef.current = setStarting;
  }, [setStarting]);

  useEffect(() => {
    let cancelled = false;

    const markUnreachable = () => {
      unreachablePollsRef.current += 1;
      if (unreachablePollsRef.current >= UNREACHABLE_POLLS_BEFORE_WARNING) {
        setIsUnreachable(true);
      }
    };

    const poll = async () => {
      const timeoutController = new AbortController();
      const timeout = setTimeout(() => timeoutController.abort(), POLL_TIMEOUT_MS);

      try {
        // Plain fetch: the API client's interceptors would re-flag this request
        // as a startup failure and fight the polling loop.
        const response = await fetch('/health', {
          cache: 'no-store',
          signal: timeoutController.signal,
        });
        if (cancelled) return;

        if (response.ok) {
          window.location.reload();
          return;
        }

        const marker = await readStartingMarker(response);
        if (cancelled) return;

        if (marker === null) {
          // Someone answered, but not the backend we are waiting for.
          markUnreachable();
          return;
        }

        unreachablePollsRef.current = 0;
        setIsUnreachable(false);
        // Report progress: the phase the interceptor captured is the one from
        // the first failed request and would otherwise never advance.
        if (marker.phase) {
          setStartingRef.current(marker.phase);
        }
      } catch {
        // A thrown fetch is a dead or hung server, not a slow one — startup
        // failures exit the process, and promising a reload would be a lie.
        if (cancelled) return;
        markUnreachable();
      } finally {
        clearTimeout(timeout);
      }
    };

    pollerRef.current = setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);
    void poll();

    return () => {
      cancelled = true;
      if (pollerRef.current !== null) {
        clearInterval(pollerRef.current);
        pollerRef.current = null;
      }
    };
  }, []);

  return (
    <PublicLayout background={<ParticleNetworkBackground />}>
      <div
        className="w-full max-w-md text-center animate-fade-in-up"
        role="status"
        aria-live="polite"
      >
        {isUnreachable ? (
          <>
            <AlertTriangle className="mx-auto h-10 w-10 text-destructive" aria-hidden="true" />
            <h1 className="mt-6 text-2xl font-semibold text-foreground">
              Server is not responding
            </h1>
            <p className="mt-3 text-muted-foreground">
              It stopped answering while starting up. Check the server logs — this page will recover
              on its own if the server comes back.
            </p>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" aria-hidden="true" />
            <h1 className="mt-6 text-2xl font-semibold text-foreground">Server is starting</h1>
            <p className="mt-3 text-muted-foreground">
              {phase ?? 'Getting things ready'}. This can take a few minutes on a network share.
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              The page reloads automatically when the server is ready.
            </p>
          </>
        )}
      </div>
    </PublicLayout>
  );
}

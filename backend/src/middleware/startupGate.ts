import { Request, Response, NextFunction } from 'express';
import { StartupState } from '../services/StartupState';

/**
 * Answers requests that arrive before startup finishes.
 *
 * The HTTP listener opens before the database copy and cache pre-warm complete —
 * on a network share those take minutes, and a closed port shows the user a
 * connection error instead of a page. Static assets and the SPA shell are served
 * without this gate, so the frontend can load and render its "server is
 * starting" screen; everything behind it needs the database and would otherwise
 * reach middleware that throws.
 */
export function startupGate(req: Request, res: Response, next: NextFunction): void {
  if (StartupState.isReady()) {
    next();
    return;
  }

  if (req.path === '/health') {
    res.status(503).json({
      status: 'starting',
      phase: StartupState.getPhase(),
      timestamp: new Date().toISOString(),
    });
    return;
  }

  res.status(503).json({
    success: false,
    error: 'Server is starting',
    starting: true,
    phase: StartupState.getPhase(),
  });
}

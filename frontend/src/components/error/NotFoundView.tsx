import { useLocation } from 'react-router-dom';
import { ErrorPage } from './ErrorPage';
import { reportError } from './ErrorReporter';

export function NotFoundView() {
  const location = useLocation();
  const isDev = import.meta.env.DEV;

  const handleReport = async () => {
    await reportError({
      type: 'route_error',
      message: `404 - Page not found: ${location.pathname}`,
      url: location.pathname,
      context: {
        search: location.search,
        hash: location.hash,
      },
    });
  };

  return (
    <ErrorPage
      type="404"
      errorCode="404"
      details={isDev ? `Path: ${location.pathname}${location.search}${location.hash}` : undefined}
      onReport={handleReport}
    />
  );
}

import { useLocation, useNavigate } from 'react-router-dom';
import { ErrorPage } from './ErrorPage';
import { reportError } from './ErrorReporter';

interface ServerErrorState {
  message?: string;
  stack?: string;
  statusCode?: number;
  url?: string;
}

export function ServerErrorView() {
  const location = useLocation();
  const navigate = useNavigate();
  const isDev = import.meta.env.DEV;

  const state = (location.state as ServerErrorState) || {};
  const { message, stack, statusCode = 500, url } = state;

  const handleReport = async () => {
    await reportError({
      type: 'api_error',
      message: message || 'Internal server error',
      stack: isDev ? stack : undefined,
      url: url || window.location.pathname,
      context: {
        statusCode,
      },
    });
  };

  const handleRetry = () => {
    navigate(-1);
  };

  return (
    <ErrorPage
      type="500"
      errorCode={statusCode}
      message={message}
      details={isDev && stack ? stack : undefined}
      onReport={handleReport}
      onRetry={handleRetry}
    />
  );
}

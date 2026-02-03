import React from 'react';
import { logger } from '@/lib/logger';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { DialogProvider } from './contexts/DialogContext';
import { AuthProvider } from './contexts/AuthContext';
import { initErrorReporter } from './components/error/ErrorReporter';
import { systemSettingsApi } from './lib/api';
import App from './App';
import './index.css';

// Theme is now managed by store/theme.ts with class-based dark mode

// Set browser title immediately from localStorage to prevent flash
const cachedSiteName = localStorage.getItem('flashpoint-siteName');
if (cachedSiteName) {
  document.title = cachedSiteName;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

// Initialize error reporter
initErrorReporter();

// Fetch public settings and set in cache before app renders
// This prevents multiple API calls by ensuring data is in cache before any component mounts
async function initApp() {
  try {
    // Fetch the data once
    const publicSettings = await systemSettingsApi.getPublic();

    // Manually set in React Query cache with infinite stale time
    queryClient.setQueryData(['system-settings', 'public'], publicSettings);
  } catch (error) {
    logger.error('[main.tsx] Failed to fetch public settings:', error);
  }

  // Now render the app with data already in cache
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <DialogProvider>
              <App />
            </DialogProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </React.StrictMode>
  );
}

initApp();

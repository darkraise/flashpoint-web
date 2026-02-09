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

// Set browser title immediately from localStorage to prevent flash
const cachedSiteName = localStorage.getItem('flashpoint-siteName');
if (cachedSiteName) {
  document.title = cachedSiteName;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

initErrorReporter();

// Fetch public settings and set in cache before app renders
// This prevents multiple API calls by ensuring data is in cache before any component mounts
async function initApp() {
  try {
    const publicSettings = await systemSettingsApi.getPublic();
    queryClient.setQueryData(['system-settings', 'public'], publicSettings);
  } catch (error) {
    logger.error('[main.tsx] Failed to fetch public settings:', error);
  }

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

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { visualizer } from 'rollup-plugin-visualizer';

/**
 * Releases are cut as git tags, and package.json is never bumped along with
 * them, so the tag is the only honest source. The Docker image has no .git,
 * which is why CI passes the tag in as VITE_APP_VERSION instead.
 */
function resolveAppVersion(): string {
  const fromEnv = process.env.VITE_APP_VERSION?.trim();
  if (fromEnv) return fromEnv;

  try {
    const described = execFileSync('git', ['describe', '--tags', '--always', '--dirty'], {
      cwd: __dirname,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (described) return described.replace(/^v/, '');
  } catch {
    // Not a git checkout — fall through to package.json.
  }

  try {
    const pkg: unknown = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8')
    );
    if (pkg && typeof pkg === 'object' && 'version' in pkg && typeof pkg.version === 'string') {
      return pkg.version;
    }
  } catch {
    // Fall through to the unknown marker.
  }

  return 'unknown';
}

export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(resolveAppVersion()),
  },
  plugins: [
    react(),
    // Bundle analyzer - run with: npm run build:analyze && open stats.html
    visualizer({
      open: !!process.env.VITE_ANALYZE,
      filename: 'stats.html',
      gzipSize: true,
      brotliSize: true,
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  assetsInclude: ['**/*.wasm'],
  esbuild: {
    drop: ['debugger'],
    pure: ['console.log', 'console.debug'],
  },
  build: {
    // Target modern browsers for smaller bundles
    target: 'es2020',

    // Increase chunk size warning limit (default is 500kb)
    chunkSizeWarningLimit: 600,

    // Enable minification (esbuild is Vite's default — fast, no extra dependency)
    minify: 'esbuild',

    rollupOptions: {
      output: {
        // Chunk naming strategy
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',

        manualChunks: (id) => {
          // Core React libraries
          if (
            id.includes('node_modules/react') ||
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/react-router-dom')
          ) {
            return 'react-vendor';
          }

          // Data fetching and state management
          if (id.includes('@tanstack/react-query')) {
            return 'react-query';
          }

          // State management (Zustand)
          if (id.includes('zustand')) {
            return 'state';
          }

          // Chart library (recharts is large - lazy loaded)
          if (id.includes('recharts')) {
            return 'charts';
          }

          // Icon library
          if (id.includes('lucide-react')) {
            return 'icons';
          }

          // Form libraries
          if (
            id.includes('react-hook-form') ||
            id.includes('@hookform/resolvers') ||
            id.includes('zod')
          ) {
            return 'forms';
          }

          // UI component library (Radix UI)
          if (id.includes('@radix-ui')) {
            return 'ui-primitives';
          }

          // Utilities (date-fns, clsx, etc.)
          if (
            id.includes('date-fns') ||
            id.includes('clsx') ||
            id.includes('class-variance-authority')
          ) {
            return 'utils';
          }

          // Remaining node_modules: let Rollup decide optimal chunking
          // A catch-all 'vendor' bucket causes circular deps with react-vendor
          // because packages like framer-motion/axios import React
        },
      },
    },

    // Source maps for production debugging (can be disabled for smaller builds)
    sourcemap: false,
  },
  server: {
    port: 5173,
    headers: {
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3100',
        changeOrigin: true,
      },
      '/proxy': {
        target: 'http://localhost:3100',
        changeOrigin: true,
      },
      // Without this the startup poll hits Vite's SPA fallback, which answers
      // 200 with index.html and makes the "server is starting" screen reload
      // itself every two seconds.
      '/health': {
        target: 'http://localhost:3100',
        changeOrigin: true,
      },
      '/game-proxy': {
        target: 'http://localhost:3100',
        changeOrigin: true,
      },
      '/game-zip': {
        target: 'http://localhost:3100',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    exclude: ['*.wasm'],
  },
});

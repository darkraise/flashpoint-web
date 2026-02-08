import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    // Bundle analyzer - run with: npm run build && open stats.html
    visualizer({
      open: false,
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

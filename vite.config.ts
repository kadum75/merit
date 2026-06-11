import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const sentryAuthToken = env.SENTRY_AUTH_TOKEN;
  return {
    plugins: [
      react(),
      tailwindcss(),
      sentryAuthToken && sentryVitePlugin({
        org: env.SENTRY_ORG || "merit",
        project: env.SENTRY_PROJECT || "merit-cv",
        authToken: sentryAuthToken,
        telemetry: false,
      }),
    ].filter(Boolean),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
      sourcemap: true,
      build: {
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'motion'],
          },
        },
      },
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  };
});

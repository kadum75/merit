import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN || '';

export function initSentry() {
  if (!SENTRY_DSN) return;
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE || 'production',
    tracesSampleRate: 0.1,
    integrations: [],
    beforeSend(event) {
      if (
        event.exception?.values?.[0]?.value?.includes('WebSocket') ||
        event.exception?.values?.[0]?.value?.includes('HMR') ||
        event.exception?.values?.[0]?.value?.includes('ResizeObserver')
      ) {
        return null;
      }
      return event;
    },
  });
}

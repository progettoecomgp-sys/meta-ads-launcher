// Auto-reload on stale chunk after deploy
window.addEventListener('vite:preloadError', () => {
  window.location.reload();
});

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import { AuthProvider } from './context/AuthContext'
import { FeatureFlagProvider } from './context/FeatureFlagContext'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'
import App from './App.jsx'

// Initialize Sentry (skips gracefully if no DSN)
const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
    tracesSampleRate: 0.2,
    replaysOnErrorSampleRate: 0,
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <FeatureFlagProvider>
          <App />
        </FeatureFlagProvider>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)

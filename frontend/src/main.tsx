import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import * as Sentry from '@sentry/react'
import { AuthProvider } from './context/AuthContext.tsx'
import { CompanySettingsProvider } from './context/CompanySettingsContext.tsx'
import './index.css'
import App from './App.tsx'

const sentryDsn = import.meta.env.VITE_SENTRY_DSN

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.0,
    replaysOnErrorSampleRate: 1.0,
    sendDefaultPii: false,
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CompanySettingsProvider>
          <Sentry.ErrorBoundary fallback={<div className="p-6 text-sm text-red-600">Something went wrong.</div>}>
            <App />
          </Sentry.ErrorBoundary>
        </CompanySettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)

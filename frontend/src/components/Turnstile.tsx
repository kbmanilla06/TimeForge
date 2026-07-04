import { useEffect, useId, useRef } from 'react'

interface TurnstileRenderOptions {
  sitekey: string
  callback: (token: string) => void
  'expired-callback'?: () => void
  'error-callback'?: () => void
}

interface TurnstileApi {
  render: (container: HTMLElement, options: TurnstileRenderOptions) => string
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js'

let scriptPromise: Promise<void> | null = null

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load the CAPTCHA widget.'))
    document.head.appendChild(script)
  })

  return scriptPromise
}

/**
 * Cloudflare Turnstile widget (Sprint 37). Renders the challenge and
 * reports a verification token via onVerify; an expired or errored
 * challenge reports an empty token so the caller can disable submission
 * again. Verification of the token itself always happens server-side —
 * this component only ever produces a token, never a pass/fail result.
 */
export function Turnstile({ onVerify }: { onVerify: (token: string) => void }) {
  const containerId = useId()
  const widgetIdRef = useRef<string | null>(null)
  // Keeps the effect's own deps stable (mount once) even if the caller
  // passes a new inline callback identity on every render.
  const onVerifyRef = useRef(onVerify)
  onVerifyRef.current = onVerify

  useEffect(() => {
    let cancelled = false

    void loadTurnstileScript()
      .then(() => {
        if (cancelled) return
        const container = document.getElementById(containerId)
        if (!container || !window.turnstile) return

        widgetIdRef.current = window.turnstile.render(container, {
          sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY ?? '',
          callback: (token: string) => onVerifyRef.current(token),
          'expired-callback': () => onVerifyRef.current(''),
          'error-callback': () => onVerifyRef.current(''),
        })
      })
      .catch(() => onVerifyRef.current(''))

    return () => {
      cancelled = true
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
      }
    }
  }, [containerId])

  return <div id={containerId} data-testid="turnstile-widget" />
}

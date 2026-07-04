import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Turnstile } from './Turnstile'

describe('Turnstile', () => {
  afterEach(() => {
    document.querySelectorAll('script').forEach((script) => script.remove())
    delete window.turnstile
    vi.restoreAllMocks()
  })

  it('renders a container for the widget script to mount into', () => {
    render(<Turnstile onVerify={vi.fn()} />)

    expect(screen.getByTestId('turnstile-widget')).toBeInTheDocument()
  })

  it('renders the widget via window.turnstile once the script "loads" and forwards a token', async () => {
    const onVerify = vi.fn()
    const render_ = vi.fn((_container: HTMLElement, options: { callback: (token: string) => void }) => {
      options.callback('widget-token')
      return 'widget-id'
    })
    window.turnstile = { render: render_, remove: vi.fn() }

    render(<Turnstile onVerify={onVerify} />)

    // Even with window.turnstile already present, loading resolves via a
    // microtask (.then()), so this settles asynchronously, not synchronously.
    await waitFor(() => expect(render_).toHaveBeenCalled())
    expect(onVerify).toHaveBeenCalledWith('widget-token')
  })
})

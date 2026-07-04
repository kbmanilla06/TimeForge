import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastStack, type ToastItem } from './Toast'

describe('ToastStack', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders nothing when there are no toasts', () => {
    const { container } = render(<ToastStack toasts={[]} onDismiss={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('auto-dismisses a toast after 6 seconds', () => {
    const onDismiss = vi.fn()
    const toasts: ToastItem[] = [{ id: 't1', message: 'Something happened' }]
    render(<ToastStack toasts={toasts} onDismiss={onDismiss} />)

    expect(screen.getByText('Something happened')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(6000)
    })

    expect(onDismiss).toHaveBeenCalledWith('t1')
  })

  it('lets a user dismiss a toast manually via its close button', () => {
    const onDismiss = vi.fn()
    const toasts: ToastItem[] = [{ id: 't1', message: 'Something happened' }]
    render(<ToastStack toasts={toasts} onDismiss={onDismiss} />)

    screen.getByLabelText('Dismiss notification').click()

    expect(onDismiss).toHaveBeenCalledWith('t1')
  })

  /**
   * Sprint 38: AppLayout used to pass a brand-new inline onDismiss on
   * every render, which reset ToastCard's auto-dismiss timer on every
   * unrelated parent re-render (e.g. the 20s badge poll) — a toast could
   * outlive its intended 6s lifetime indefinitely. AppLayout now
   * memoizes onDismiss with useCallback, so its identity stays stable
   * across re-renders; this proves the timer survives repeated
   * re-renders when that precondition holds.
   */
  it('dismisses on schedule despite repeated parent re-renders, as long as onDismiss stays referentially stable', () => {
    const onDismiss = vi.fn()
    const toasts: ToastItem[] = [{ id: 't1', message: 'Something happened' }]
    const { rerender } = render(<ToastStack toasts={toasts} onDismiss={onDismiss} />)

    for (let i = 0; i < 5; i++) {
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      rerender(<ToastStack toasts={[...toasts]} onDismiss={onDismiss} />)
    }

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(onDismiss).toHaveBeenCalledWith('t1')
  })

  it('documents the pre-Sprint-38 bug: a new onDismiss identity every render keeps resetting the timer', () => {
    const dismissed: string[] = []
    const toasts: ToastItem[] = [{ id: 't1', message: 'Something happened' }]
    const { rerender } = render(<ToastStack toasts={toasts} onDismiss={(id) => dismissed.push(id)} />)

    for (let i = 0; i < 6; i++) {
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      // A brand new inline function every render, unlike AppLayout's
      // current useCallback-memoized dismissToast.
      rerender(<ToastStack toasts={[...toasts]} onDismiss={(id) => dismissed.push(id)} />)
    }

    expect(dismissed).toEqual([])
  })
})

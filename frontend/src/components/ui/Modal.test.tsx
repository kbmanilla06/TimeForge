import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

describe('Modal', () => {
  it('renders nothing when closed', () => {
    render(
      <Modal open={false} title="Terms" onClose={vi.fn()}>
        Content
      </Modal>,
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders the title and children when open', () => {
    render(
      <Modal open title="Terms and Conditions" onClose={vi.fn()}>
        <p>Some terms content.</p>
      </Modal>,
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Terms and Conditions')).toBeInTheDocument()
    expect(screen.getByText('Some terms content.')).toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Modal open title="Terms" onClose={onClose}>
        Content
      </Modal>,
    )

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when the backdrop is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Modal open title="Terms" onClose={onClose}>
        Content
      </Modal>,
    )

    await user.click(screen.getByRole('dialog').parentElement!)
    expect(onClose).toHaveBeenCalled()
  })

  it('does not call onClose when clicking inside the dialog panel', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Modal open title="Terms" onClose={onClose}>
        <p>Some terms content.</p>
      </Modal>,
    )

    await user.click(screen.getByText('Some terms content.'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls onClose when Escape is pressed', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Modal open title="Terms" onClose={onClose}>
        Content
      </Modal>,
    )

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })
})

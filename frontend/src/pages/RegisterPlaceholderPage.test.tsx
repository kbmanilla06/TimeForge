import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { RegisterPlaceholderPage } from './RegisterPlaceholderPage'

describe('RegisterPlaceholderPage', () => {
  it('renders a coming-soon message and a link back to sign in', () => {
    render(
      <MemoryRouter>
        <RegisterPlaceholderPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument()
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '/login')
  })
})

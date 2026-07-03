import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { LandingPage } from './LandingPage'

vi.mock('../context/useAuth', () => ({
  useAuth: () => ({ login: vi.fn(), logout: vi.fn(), user: null, isLoading: false }),
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  )
}

describe('LandingPage', () => {
  it('renders the hero, an embedded sign-in form, and the features section', () => {
    renderPage()

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Workforce performance/)
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByText('Time Tracking')).toBeInTheDocument()
    expect(screen.getByText('AI Insights')).toBeInTheDocument()
  })

  it('links Create Account to the /register placeholder route, not a dead link', () => {
    renderPage()

    const createAccountLinks = screen.getAllByRole('link', { name: 'Create Account' })
    expect(createAccountLinks.length).toBeGreaterThan(0)
    for (const link of createAccountLinks) {
      expect(link).toHaveAttribute('href', '/register')
    }
  })

  it('links every Forgot Password reference to the existing route', () => {
    renderPage()

    const links = screen.getAllByRole('link', { name: 'Forgot Password?' })
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      expect(link).toHaveAttribute('href', '/forgot-password')
    }
  })

  it('does not render an actual registration form on the landing page itself', () => {
    renderPage()

    expect(screen.queryByLabelText(/confirm password/i)).not.toBeInTheDocument()
  })
})

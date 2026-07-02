import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AiInsightsRoute } from './AiInsightsRoute'

const mockUseAuth = vi.fn()
vi.mock('../context/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

function renderAiInsightsRoute() {
  return render(
    <MemoryRouter initialEntries={['/ai-insights']}>
      <Routes>
        <Route element={<AiInsightsRoute />}>
          <Route path="/ai-insights" element={<div>AI Insights Page</div>} />
        </Route>
        <Route path="/" element={<div>Home Page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AiInsightsRoute', () => {
  it('renders the nested route for an employee', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'employee' } })

    renderAiInsightsRoute()

    expect(screen.getByText('AI Insights Page')).toBeInTheDocument()
  })

  it('renders the nested route for a supervisor', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'supervisor' } })

    renderAiInsightsRoute()

    expect(screen.getByText('AI Insights Page')).toBeInTheDocument()
  })

  it('renders the nested route for an admin', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'admin' } })

    renderAiInsightsRoute()

    expect(screen.getByText('AI Insights Page')).toBeInTheDocument()
  })

  it('renders the nested route for hr_finance', () => {
    mockUseAuth.mockReturnValue({ user: { role: 'hr_finance' } })

    renderAiInsightsRoute()

    expect(screen.getByText('AI Insights Page')).toBeInTheDocument()
  })

  it('redirects a user without a recognized role to home', () => {
    mockUseAuth.mockReturnValue({ user: null })

    renderAiInsightsRoute()

    expect(screen.getByText('Home Page')).toBeInTheDocument()
    expect(screen.queryByText('AI Insights Page')).not.toBeInTheDocument()
  })
})

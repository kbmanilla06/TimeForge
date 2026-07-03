import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { User } from '../types/auth'
import { HomePage } from './HomePage'

const mockUseAuth = vi.fn()
vi.mock('../context/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

// AttendanceWidget fetches on mount — mocked here so HomePage's own tests
// (profile summary / department description) aren't coupled to it.
vi.mock('../lib/attendanceApi', () => ({
  getTodaysAttendance: () => Promise.resolve({ session: null }),
}))

function withUser(user: User) {
  mockUseAuth.mockReturnValue({ user, isLoading: false, login: vi.fn(), logout: vi.fn() })
}

describe('HomePage', () => {
  it('renders the profile summary: name, department, and position', () => {
    withUser({
      id: 1,
      name: 'Jane Employee',
      email: 'jane@timeforge.test',
      role: 'employee',
      status: 'active',
      department_id: 1,
      department: { id: 1, name: 'Engineering', description: null },
      position: 'Backend Engineer',
    })

    render(<HomePage />)

    expect(screen.getByRole('heading', { name: 'Jane Employee' })).toBeInTheDocument()
    expect(screen.getByText('Engineering · Backend Engineer')).toBeInTheDocument()
    expect(screen.getByText('JE')).toBeInTheDocument() // initials fallback avatar
  })

  it('renders a multi-paragraph department description as separate paragraphs', () => {
    withUser({
      id: 1,
      name: 'Jane Employee',
      email: 'jane@timeforge.test',
      role: 'employee',
      status: 'active',
      department_id: 1,
      department: {
        id: 1,
        name: 'Engineering',
        description: 'First paragraph about the team.\n\nSecond paragraph with more detail.',
      },
    })

    render(<HomePage />)

    expect(screen.getByText('First paragraph about the team.')).toBeInTheDocument()
    expect(screen.getByText('Second paragraph with more detail.')).toBeInTheDocument()
  })

  it('shows a fallback message when the department has no description yet', () => {
    withUser({
      id: 1,
      name: 'Jane Employee',
      email: 'jane@timeforge.test',
      role: 'employee',
      status: 'active',
      department_id: 1,
      department: { id: 1, name: 'Engineering', description: null },
    })

    render(<HomePage />)

    expect(screen.getByText('No description has been added for this department yet.')).toBeInTheDocument()
  })

  it('shows "No department assigned" and skips the description section entirely when the user has no department', () => {
    withUser({
      id: 1,
      name: 'Solo Employee',
      email: 'solo@timeforge.test',
      role: 'employee',
      status: 'active',
      department_id: null,
      department: null,
    })

    render(<HomePage />)

    expect(screen.getByText('No department assigned')).toBeInTheDocument()
    expect(screen.queryByText(/^About /)).not.toBeInTheDocument()
  })
})

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../lib/apiClient'
import { LoginForm } from './LoginForm'

const mockLogin = vi.fn()
vi.mock('../context/useAuth', () => ({
  useAuth: () => ({ login: mockLogin, logout: vi.fn(), user: null, isLoading: false }),
}))

function renderForm() {
  return render(
    <MemoryRouter>
      <LoginForm />
    </MemoryRouter>,
  )
}

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders email and password fields plus a Forgot Password link', () => {
    renderForm()

    expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Forgot Password?' })).toHaveAttribute(
      'href',
      '/forgot-password',
    )
  })

  it('toggles the password field between hidden and visible text', async () => {
    const user = userEvent.setup()
    renderForm()

    const password = screen.getByLabelText('Password')
    expect(password).toHaveAttribute('type', 'password')

    await user.click(screen.getByRole('button', { name: 'Show password' }))
    expect(password).toHaveAttribute('type', 'text')

    await user.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(password).toHaveAttribute('type', 'password')
  })

  it('logs in successfully and shows a brief success state', async () => {
    const user = userEvent.setup()
    mockLogin.mockResolvedValue(undefined)
    renderForm()

    await user.type(screen.getByLabelText('Email Address'), 'admin@timeforge.test')
    await user.type(screen.getByLabelText('Password'), 'password')
    await user.click(screen.getByRole('button', { name: 'Log In' }))

    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('admin@timeforge.test', 'password'))
    expect(await screen.findByText('Signed in — redirecting…')).toBeInTheDocument()
  })

  it('shows an error message and re-enables the form when login fails', async () => {
    const user = userEvent.setup()
    mockLogin.mockRejectedValue(new ApiError(422, 'The provided credentials are incorrect.'))
    renderForm()

    await user.type(screen.getByLabelText('Email Address'), 'admin@timeforge.test')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Log In' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('The provided credentials are incorrect.')
    expect(screen.getByRole('button', { name: 'Log In' })).not.toBeDisabled()
  })
})

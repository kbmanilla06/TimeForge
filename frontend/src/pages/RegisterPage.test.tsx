import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../lib/apiClient'
import * as registrationApi from '../lib/registrationApi'
import { RegisterPage } from './RegisterPage'

vi.mock('../lib/registrationApi')

function renderPage() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  )
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(registrationApi.listPublicDepartments).mockResolvedValue([
      { id: 1, name: 'Engineering', description: null },
      { id: 2, name: 'Marketing', description: null },
    ])
  })

  it('loads real departments into the picker', async () => {
    renderPage()

    expect(await screen.findByRole('option', { name: 'Engineering' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Marketing' })).toBeInTheDocument()
  })

  it('toggles both password fields between hidden and visible independently', async () => {
    const user = userEvent.setup()
    renderPage()

    const password = screen.getByLabelText('Password')
    const confirm = screen.getByLabelText('Confirm Password')
    expect(password).toHaveAttribute('type', 'password')
    expect(confirm).toHaveAttribute('type', 'password')

    await user.click(screen.getAllByRole('button', { name: 'Show password' })[0])
    expect(password).toHaveAttribute('type', 'text')
    expect(confirm).toHaveAttribute('type', 'password')
  })

  it('shows a password strength label once the user starts typing a password', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Password'), 'Str0ng!Passw0rd')
    expect(await screen.findByText(/Password strength:/)).toBeInTheDocument()
  })

  it('submits the full payload and shows a pending-approval confirmation', async () => {
    const user = userEvent.setup()
    vi.mocked(registrationApi.registerAccount).mockResolvedValue({
      message: 'Your registration has been received and is pending administrator approval.',
    })
    renderPage()

    await screen.findByRole('option', { name: 'Engineering' })

    await user.type(screen.getByLabelText('First Name'), 'Jane')
    await user.type(screen.getByLabelText('Last Name'), 'Applicant')
    await user.selectOptions(screen.getByLabelText('Department'), '1')
    await user.type(screen.getByLabelText('Company Email'), 'jane@company.com')
    await user.type(screen.getByLabelText('Password'), 'Str0ng!Passw0rd')
    await user.type(screen.getByLabelText('Confirm Password'), 'Str0ng!Passw0rd')
    await user.click(screen.getByRole('button', { name: 'Read Terms and Conditions' }))
    await user.click(screen.getByRole('button', { name: 'Close' }))
    await user.click(screen.getByLabelText(/I agree to the Terms and Conditions/))
    await user.click(screen.getByRole('button', { name: 'Create Account' }))

    await waitFor(() =>
      expect(registrationApi.registerAccount).toHaveBeenCalledWith(
        expect.objectContaining({
          first_name: 'Jane',
          last_name: 'Applicant',
          department_id: 1,
          email: 'jane@company.com',
          terms_accepted: true,
        }),
      ),
    )

    expect(await screen.findByText('Registration Received')).toBeInTheDocument()
    expect(
      screen.getByText('Your registration has been received and is pending administrator approval.'),
    ).toBeInTheDocument()
  })

  it('surfaces a duplicate-email error inline without submitting successfully', async () => {
    const user = userEvent.setup()
    vi.mocked(registrationApi.registerAccount).mockRejectedValue(
      new ApiError(422, 'The given data was invalid.', {
        email: ['The email has already been taken.'],
      }),
    )
    renderPage()

    await screen.findByRole('option', { name: 'Engineering' })

    await user.type(screen.getByLabelText('First Name'), 'Jane')
    await user.type(screen.getByLabelText('Last Name'), 'Applicant')
    await user.selectOptions(screen.getByLabelText('Department'), '1')
    await user.type(screen.getByLabelText('Company Email'), 'taken@company.com')
    await user.type(screen.getByLabelText('Password'), 'Str0ng!Passw0rd')
    await user.type(screen.getByLabelText('Confirm Password'), 'Str0ng!Passw0rd')
    await user.click(screen.getByRole('button', { name: 'Read Terms and Conditions' }))
    await user.click(screen.getByRole('button', { name: 'Close' }))
    await user.click(screen.getByLabelText(/I agree to the Terms and Conditions/))
    await user.click(screen.getByRole('button', { name: 'Create Account' }))

    expect(await screen.findByText('The email has already been taken.')).toBeInTheDocument()
    expect(screen.queryByText('Registration Received')).not.toBeInTheDocument()
  })

  it('keeps the terms checkbox disabled until the terms have been opened', async () => {
    const user = userEvent.setup()
    renderPage()

    const checkbox = screen.getByLabelText(/I agree to the Terms and Conditions/)
    expect(checkbox).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Read Terms and Conditions' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('1. Acceptance of Terms')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(checkbox).toBeEnabled()
  })

  it('disables Create Account until the terms are accepted', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(screen.getByRole('button', { name: 'Create Account' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Read Terms and Conditions' }))
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeDisabled()

    await user.click(screen.getByLabelText(/I agree to the Terms and Conditions/))
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeEnabled()
  })
})

import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

  afterEach(() => {
    vi.useRealTimers()
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

  async function fillAndSubmitForm(user: ReturnType<typeof userEvent.setup>, email = 'jane@company.com') {
    await screen.findByRole('option', { name: 'Engineering' })

    await user.type(screen.getByLabelText('First Name'), 'Jane')
    await user.type(screen.getByLabelText('Last Name'), 'Applicant')
    await user.selectOptions(screen.getByLabelText('Department'), '1')
    await user.type(screen.getByLabelText('Company Email'), email)
    await user.type(screen.getByLabelText('Password'), 'Str0ng!Passw0rd')
    await user.type(screen.getByLabelText('Confirm Password'), 'Str0ng!Passw0rd')
    await user.click(screen.getByRole('button', { name: 'Read Terms and Conditions' }))
    await user.click(screen.getByRole('button', { name: 'Close' }))
    await user.click(screen.getByLabelText(/I agree to the Terms and Conditions/))
    await user.click(screen.getByRole('button', { name: 'Create Account' }))
  }

  it('submits the full payload and moves to the email-verification step', async () => {
    const user = userEvent.setup()
    vi.mocked(registrationApi.registerAccount).mockResolvedValue({
      message: 'Check your email for a verification code to continue your registration.',
      email: 'jane@company.com',
    })
    renderPage()

    await fillAndSubmitForm(user)

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

    expect(await screen.findByText('Verify Your Email')).toBeInTheDocument()
    expect(screen.getByText('jane@company.com')).toBeInTheDocument()
  })

  it('verifying the correct code shows the pending-approval confirmation', async () => {
    const user = userEvent.setup()
    vi.mocked(registrationApi.registerAccount).mockResolvedValue({
      message: 'Check your email for a verification code to continue your registration.',
      email: 'jane@company.com',
    })
    vi.mocked(registrationApi.verifyRegistrationOtp).mockResolvedValue({
      message: 'Your email has been verified. Your registration is now pending administrator approval.',
    })
    renderPage()

    await fillAndSubmitForm(user)
    await screen.findByText('Verify Your Email')

    await user.type(screen.getByLabelText('Verification Code'), '123456')
    await user.click(screen.getByRole('button', { name: 'Verify Email' }))

    expect(registrationApi.verifyRegistrationOtp).toHaveBeenCalledWith({
      email: 'jane@company.com',
      code: '123456',
    })
    expect(await screen.findByText('Registration Received')).toBeInTheDocument()
    expect(
      screen.getByText('Your email has been verified. Your registration is now pending administrator approval.'),
    ).toBeInTheDocument()
  })

  it('shows an error and stays on the OTP screen when the code is wrong', async () => {
    const user = userEvent.setup()
    vi.mocked(registrationApi.registerAccount).mockResolvedValue({
      message: 'Check your email for a verification code to continue your registration.',
      email: 'jane@company.com',
    })
    vi.mocked(registrationApi.verifyRegistrationOtp).mockRejectedValue(
      new ApiError(422, 'Invalid or expired code.'),
    )
    renderPage()

    await fillAndSubmitForm(user)
    await screen.findByText('Verify Your Email')

    await user.type(screen.getByLabelText('Verification Code'), '000000')
    await user.click(screen.getByRole('button', { name: 'Verify Email' }))

    expect(await screen.findByText('Invalid or expired code.')).toBeInTheDocument()
    expect(screen.getByText('Verify Your Email')).toBeInTheDocument()
  })

  it('shows the resend cooldown immediately after moving to the OTP step', async () => {
    const user = userEvent.setup()
    vi.mocked(registrationApi.registerAccount).mockResolvedValue({
      message: 'Check your email for a verification code to continue your registration.',
      email: 'jane@company.com',
    })
    renderPage()

    await fillAndSubmitForm(user)
    await screen.findByText('Verify Your Email')

    expect(screen.getByRole('button', { name: /Resend code in 60s/ })).toBeDisabled()
  })

  it('enables Resend code after the cooldown elapses and calls the API', async () => {
    // shouldAdvanceTime keeps the fake clock ticking in step with real time,
    // so testing-library's own async polling still resolves normally; the
    // explicit advanceTimersByTime call below fast-forwards past the 60s
    // cooldown on top of that.
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ delay: null })
    vi.mocked(registrationApi.registerAccount).mockResolvedValue({
      message: 'Check your email for a verification code to continue your registration.',
      email: 'jane@company.com',
    })
    vi.mocked(registrationApi.resendRegistrationOtp).mockResolvedValue({
      message: 'If a pending registration exists for that email, a new verification code has been sent.',
    })
    renderPage()

    await fillAndSubmitForm(user)
    await screen.findByText('Verify Your Email')

    act(() => {
      vi.advanceTimersByTime(60_000)
    })

    const resendButton = screen.getByRole('button', { name: 'Resend code' })
    expect(resendButton).toBeEnabled()

    await user.click(resendButton)
    await waitFor(() =>
      expect(registrationApi.resendRegistrationOtp).toHaveBeenCalledWith({ email: 'jane@company.com' }),
    )
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

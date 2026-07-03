import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as profileApi from '../lib/profileApi'
import type { User } from '../types/auth'
import { ProfilePage } from './ProfilePage'

vi.mock('../lib/profileApi')

const mockUseAuth = vi.fn()
vi.mock('../context/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

const BASE_USER: User = {
  id: 1,
  name: 'Jane Employee',
  email: 'jane@timeforge.test',
  role: 'employee',
  status: 'active',
  department_id: 1,
  position: 'Backend Engineer',
  contact_number: '555-0100',
}

function setup(user: User = BASE_USER) {
  const refreshUser = vi.fn().mockResolvedValue(undefined)
  mockUseAuth.mockReturnValue({ user, isLoading: false, login: vi.fn(), logout: vi.fn(), refreshUser })
  return { refreshUser }
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(profileApi.getProfilePictureBlob).mockResolvedValue(null)
  })

  it('shows the name as read-only, and the current position/contact number as editable', async () => {
    setup()
    render(<ProfilePage />)

    const nameInput = screen.getByLabelText('Full Name') as HTMLInputElement
    expect(nameInput).toBeDisabled()
    expect(nameInput.value).toBe('Jane Employee')
    expect((screen.getByLabelText('Position') as HTMLInputElement).value).toBe('Backend Engineer')
    expect((screen.getByLabelText('Contact Number') as HTMLInputElement).value).toBe('555-0100')
  })

  it('saves position and contact number, then refreshes the user', async () => {
    const user = userEvent.setup()
    const { refreshUser } = setup()
    vi.mocked(profileApi.updateProfile).mockResolvedValue(BASE_USER)
    render(<ProfilePage />)

    await user.clear(screen.getByLabelText('Position'))
    await user.type(screen.getByLabelText('Position'), 'Staff Engineer')
    await user.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => {
      expect(profileApi.updateProfile).toHaveBeenCalledWith({
        contact_number: '555-0100',
        position: 'Staff Engineer',
      })
    })
    expect(refreshUser).toHaveBeenCalled()
    expect(await screen.findByText('Profile updated.')).toBeInTheDocument()
  })

  it('uploads a new profile picture when a file is selected', async () => {
    const user = userEvent.setup()
    setup()
    vi.mocked(profileApi.uploadProfilePicture).mockResolvedValue({ message: 'Profile picture updated.' })
    render(<ProfilePage />)

    const file = new File(['fake image bytes'], 'avatar.png', { type: 'image/png' })
    const input = document.getElementById('profile-picture-input') as HTMLInputElement
    await user.upload(input, file)

    await waitFor(() => {
      expect(profileApi.uploadProfilePicture).toHaveBeenCalledWith(file)
    })
  })

  it('changes the password and clears the form on success', async () => {
    const user = userEvent.setup()
    setup()
    vi.mocked(profileApi.changePassword).mockResolvedValue({ message: 'Password updated.' })
    render(<ProfilePage />)

    await user.type(screen.getByLabelText('Current Password'), 'old-password')
    await user.type(screen.getByLabelText('New Password'), 'new-password')
    await user.type(screen.getByLabelText('Confirm New Password'), 'new-password')
    await user.click(screen.getByRole('button', { name: 'Update Password' }))

    await waitFor(() => {
      expect(profileApi.changePassword).toHaveBeenCalledWith({
        current_password: 'old-password',
        password: 'new-password',
        password_confirmation: 'new-password',
      })
    })
    expect(await screen.findByText('Password updated.')).toBeInTheDocument()
    expect((screen.getByLabelText('Current Password') as HTMLInputElement).value).toBe('')
  })

  it('shows a server error when the current password is wrong, without clearing the form', async () => {
    const user = userEvent.setup()
    setup()
    const { ApiError } = await import('../lib/apiClient')
    vi.mocked(profileApi.changePassword).mockRejectedValue(new ApiError(422, 'The provided password is incorrect.'))
    render(<ProfilePage />)

    await user.type(screen.getByLabelText('Current Password'), 'wrong-password')
    await user.type(screen.getByLabelText('New Password'), 'new-password')
    await user.type(screen.getByLabelText('Confirm New Password'), 'new-password')
    await user.click(screen.getByRole('button', { name: 'Update Password' }))

    expect(await screen.findByText('The provided password is incorrect.')).toBeInTheDocument()
  })
})

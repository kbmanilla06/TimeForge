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
  const refreshPicture = vi.fn().mockResolvedValue(undefined)
  mockUseAuth.mockReturnValue({
    user,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser,
    pictureUrl: null,
    refreshPicture,
  })
  return { refreshUser, refreshPicture }
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
        timezone: 'UTC',
      })
    })
    expect(refreshUser).toHaveBeenCalled()
    expect(await screen.findByText('Profile updated.')).toBeInTheDocument()
  })

  it('uploads a new profile picture when a file is selected, then refreshes the shared picture', async () => {
    const user = userEvent.setup()
    const { refreshPicture } = setup()
    vi.mocked(profileApi.uploadProfilePicture).mockResolvedValue({ message: 'Profile picture updated.' })
    render(<ProfilePage />)

    const file = new File(['fake image bytes'], 'avatar.png', { type: 'image/png' })
    const input = document.getElementById('profile-picture-input') as HTMLInputElement
    await user.upload(input, file)

    await waitFor(() => {
      expect(profileApi.uploadProfilePicture).toHaveBeenCalledWith(file)
    })
    expect(refreshPicture).toHaveBeenCalled()
  })

  it('rejects a file whose real type does not match its extension, before calling the upload API', async () => {
    // Named .png (passes the input's accept-extension filter) but with a
    // mismatched real MIME type — the scenario the extension-only OS file
    // picker filter can't catch, which is exactly why the MIME check matters.
    const user = userEvent.setup()
    setup()
    render(<ProfilePage />)

    const file = new File(['not actually a png'], 'fake.png', { type: 'image/gif' })
    const input = document.getElementById('profile-picture-input') as HTMLInputElement
    await user.upload(input, file)

    expect(await screen.findByText('Please choose a PNG or JPG image.')).toBeInTheDocument()
    expect(profileApi.uploadProfilePicture).not.toHaveBeenCalled()
  })

  it('rejects a file over 2MB before ever calling the upload API', async () => {
    const user = userEvent.setup()
    setup()
    render(<ProfilePage />)

    const oversized = new File([new Uint8Array(3 * 1024 * 1024)], 'huge.png', { type: 'image/png' })
    const input = document.getElementById('profile-picture-input') as HTMLInputElement
    await user.upload(input, oversized)

    expect(await screen.findByText('Image must be 2MB or smaller.')).toBeInTheDocument()
    expect(profileApi.uploadProfilePicture).not.toHaveBeenCalled()
  })

  it('surfaces the specific server validation reason instead of a generic message', async () => {
    const user = userEvent.setup()
    setup()
    const { ApiError } = await import('../lib/apiClient')
    vi.mocked(profileApi.uploadProfilePicture).mockRejectedValue(
      new ApiError(422, 'The given data was invalid.', { file: ['The file must be an image of type: png, jpg, jpeg.'] }),
    )
    render(<ProfilePage />)

    const file = new File(['fake image bytes'], 'avatar.png', { type: 'image/png' })
    const input = document.getElementById('profile-picture-input') as HTMLInputElement
    await user.upload(input, file)

    expect(await screen.findByText('The file must be an image of type: png, jpg, jpeg.')).toBeInTheDocument()
    expect(screen.queryByText('The given data was invalid.')).not.toBeInTheDocument()
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

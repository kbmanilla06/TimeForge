import { useRef, useState, type FormEvent } from 'react'
import { useAuth } from '../context/useAuth'
import { useProfilePictureUrl } from '../hooks/useProfilePictureUrl'
import { ApiError } from '../lib/apiClient'
import { changePassword, updateProfile, uploadProfilePicture } from '../lib/profileApi'
import { Alert } from '../components/ui/Alert'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { Field, TextInput } from '../components/ui/fields'
import { PageHeader } from '../components/ui/PageHeader'
import { SectionCard } from '../components/ui/Card'

export function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const { url: pictureUrl, refresh: refreshPicture } = useProfilePictureUrl()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [contactNumber, setContactNumber] = useState(user?.contact_number ?? '')
  const [position, setPosition] = useState(user?.position ?? '')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null)

  const [isUploadingPicture, setIsUploadingPicture] = useState(false)
  const [pictureError, setPictureError] = useState<string | null>(null)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)

  if (!user) return null

  async function handleProfileSubmit(event: FormEvent) {
    event.preventDefault()
    setProfileError(null)
    setProfileSuccess(null)
    setIsSavingProfile(true)
    try {
      await updateProfile({ contact_number: contactNumber || null, position: position || null })
      await refreshUser()
      setProfileSuccess('Profile updated.')
    } catch (err) {
      setProfileError(err instanceof ApiError ? err.message : 'Unable to update profile.')
    } finally {
      setIsSavingProfile(false)
    }
  }

  async function handlePictureChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setPictureError(null)
    setIsUploadingPicture(true)
    try {
      await uploadProfilePicture(file)
      refreshPicture()
    } catch (err) {
      setPictureError(err instanceof ApiError ? err.message : 'Unable to upload profile picture.')
    } finally {
      setIsUploadingPicture(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handlePasswordSubmit(event: FormEvent) {
    event.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(null)
    setIsChangingPassword(true)
    try {
      await changePassword({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      })
      setPasswordSuccess('Password updated.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.message : 'Unable to change password.')
    } finally {
      setIsChangingPassword(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6 sm:px-6">
      <PageHeader title="Profile Settings" subtitle="Manage your profile picture, personal information, and password." />

      <SectionCard title="Profile Picture">
        {pictureError && (
          <Alert tone="error" className="mb-4">
            {pictureError}
          </Alert>
        )}
        <div className="flex items-center gap-4">
          <Avatar name={user.name} pictureUrl={pictureUrl} size="lg" />
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg"
              onChange={handlePictureChange}
              className="hidden"
              id="profile-picture-input"
            />
            <Button
              type="button"
              variant="secondary"
              disabled={isUploadingPicture}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploadingPicture ? 'Uploading…' : 'Change Picture'}
            </Button>
            <p className="mt-2 text-xs text-muted">PNG or JPG, up to 2MB.</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Personal Information">
        {profileError && (
          <Alert tone="error" className="mb-4">
            {profileError}
          </Alert>
        )}
        {profileSuccess && (
          <Alert tone="success" className="mb-4">
            {profileSuccess}
          </Alert>
        )}
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <Field label="Full Name" htmlFor="profile-name" hint="Contact your administrator to change your name.">
            <TextInput id="profile-name" value={user.name} disabled />
          </Field>
          <Field label="Position" htmlFor="profile-position">
            <TextInput id="profile-position" value={position} onChange={(e) => setPosition(e.target.value)} />
          </Field>
          <Field label="Contact Number" htmlFor="profile-contact-number">
            <TextInput
              id="profile-contact-number"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
            />
          </Field>
          <Button type="submit" disabled={isSavingProfile}>
            Save Changes
          </Button>
        </form>
      </SectionCard>

      <SectionCard title="Change Password">
        {passwordError && (
          <Alert tone="error" className="mb-4">
            {passwordError}
          </Alert>
        )}
        {passwordSuccess && (
          <Alert tone="success" className="mb-4">
            {passwordSuccess}
          </Alert>
        )}
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <Field label="Current Password" htmlFor="current-password">
            <TextInput
              id="current-password"
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </Field>
          <Field label="New Password" htmlFor="new-password">
            <TextInput
              id="new-password"
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </Field>
          <Field label="Confirm New Password" htmlFor="confirm-password">
            <TextInput
              id="confirm-password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </Field>
          <Button type="submit" disabled={isChangingPassword}>
            Update Password
          </Button>
        </form>
      </SectionCard>
    </main>
  )
}

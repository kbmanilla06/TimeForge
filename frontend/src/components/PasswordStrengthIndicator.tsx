const LABELS = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong']
const BAR_COLORS = ['bg-red-500', 'bg-red-500', 'bg-amber-500', 'bg-emerald-500', 'bg-emerald-600']

function scorePassword(password: string): number {
  let score = 0
  if (password.length >= 8) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  return score
}

export function PasswordStrengthIndicator({ password }: { password: string }) {
  if (!password) return null

  const score = scorePassword(password)

  return (
    <div aria-live="polite" className="mt-2">
      <div className="flex gap-1" aria-hidden="true">
        {[0, 1, 2, 3].map((segment) => (
          <div
            key={segment}
            className={`h-1.5 flex-1 rounded-full ${segment < score ? BAR_COLORS[score] : 'bg-line'}`}
          />
        ))}
      </div>
      <p className="mt-1 text-xs text-muted">Password strength: {LABELS[score]}</p>
    </div>
  )
}

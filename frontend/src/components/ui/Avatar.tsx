function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase()
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase()
}

const SIZE_CLASSES = {
  sm: 'size-8 text-xs',
  md: 'size-12 text-base',
  lg: 'size-20 text-2xl',
} as const

export function Avatar({
  name,
  pictureUrl,
  size = 'md',
}: {
  name: string
  pictureUrl?: string | null
  size?: keyof typeof SIZE_CLASSES
}) {
  if (pictureUrl) {
    return (
      <img
        src={pictureUrl}
        alt={`${name}'s profile picture`}
        className={`${SIZE_CLASSES[size]} shrink-0 rounded-full object-cover`}
      />
    )
  }

  return (
    <div
      aria-hidden="true"
      className={`${SIZE_CLASSES[size]} flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary`}
    >
      {initials(name)}
    </div>
  )
}

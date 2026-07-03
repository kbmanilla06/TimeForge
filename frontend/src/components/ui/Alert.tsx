import type { ReactNode } from 'react'

type Tone = 'error' | 'success' | 'info'

const tones: Record<Tone, string> = {
  error: 'border-red-200 bg-red-50 text-red-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  info: 'border-blue-200 bg-blue-50 text-blue-700',
}

export function Alert({
  tone,
  children,
  className = '',
}: {
  tone: Tone
  children: ReactNode
  className?: string
}) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-4 py-3 text-sm ${tones[tone]} ${className}`}>
      {children}
    </div>
  )
}

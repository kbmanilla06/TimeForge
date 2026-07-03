import type { ReactNode } from 'react'

type Tone = 'green' | 'amber' | 'red' | 'violet' | 'blue' | 'gray'

const tones: Record<Tone, string> = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  violet: 'bg-violet-50 text-violet-700 border-violet-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  gray: 'bg-slate-50 text-slate-600 border-slate-200',
}

export function Badge({ tone = 'gray', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

/** Colors for every status string the app renders; text stays exactly as stored. */
const statusTones: Record<string, Tone> = {
  active: 'green',
  approved: 'green',
  read: 'green',
  pending: 'amber',
  submitted: 'amber',
  unread: 'amber',
  deactivated: 'gray',
  'not submitted': 'gray',
  rejected: 'red',
  revision_requested: 'violet',
  running: 'blue',
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTones[status] ?? 'gray'}>{status}</Badge>
}

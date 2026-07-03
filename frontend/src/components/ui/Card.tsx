import type { ReactNode } from 'react'

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <div className={`rounded-2xl border border-line bg-white shadow-card ${className}`}>
      {children}
    </div>
  )
}

export function SectionCard({
  title,
  actions,
  children,
  className = '',
}: {
  title: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-2xl border border-line bg-white shadow-card ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-4">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

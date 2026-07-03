import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react'

/**
 * Responsive table shell: bordered rounded card whose inner table scrolls
 * horizontally on narrow screens instead of breaking the page layout.
 */
export function TableCard({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-white shadow-card">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  )
}

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-line bg-field text-xs uppercase tracking-wide text-muted">
        {children}
      </tr>
    </thead>
  )
}

export function Th({ className = '', ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={`px-4 py-3 font-medium ${className}`} {...props} />
}

export function Td({ className = '', ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={`px-4 py-3 align-middle ${className}`} {...props} />
}

export function Tr({ children }: { children: ReactNode }) {
  return <tr className="border-b border-line/60 last:border-b-0 hover:bg-field/60">{children}</tr>
}

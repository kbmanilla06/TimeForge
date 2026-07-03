import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { buttonClass, type ButtonSize, type ButtonVariant } from './buttonStyles'

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type={type} className={`${buttonClass(variant, size)} ${className}`} {...props} />
}

export function ButtonLink({
  to,
  variant = 'primary',
  size = 'md',
  children,
}: {
  to: string
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
}) {
  return (
    <Link to={to} className={buttonClass(variant, size)}>
      {children}
    </Link>
  )
}

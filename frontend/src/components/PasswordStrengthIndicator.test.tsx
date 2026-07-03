import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator'

describe('PasswordStrengthIndicator', () => {
  it('renders nothing for an empty password', () => {
    const { container } = render(<PasswordStrengthIndicator password="" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('rates a short, simple password as weak', () => {
    render(<PasswordStrengthIndicator password="abc" />)
    expect(screen.getByText(/Password strength: (Very weak|Weak)/)).toBeInTheDocument()
  })

  it('rates a long password with mixed case, digits, and symbols as strong', () => {
    render(<PasswordStrengthIndicator password="Str0ng!Passw0rd" />)
    expect(screen.getByText('Password strength: Strong')).toBeInTheDocument()
  })
})

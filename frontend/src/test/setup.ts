import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// RTL's cleanup normally auto-registers via a global afterEach, but this
// project uses explicit vitest imports (no `globals: true`), so it must be
// wired up here or DOM from one test leaks into the next within a file.
afterEach(() => {
  cleanup()
})

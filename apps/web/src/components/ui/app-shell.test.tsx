import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AppShell } from './app-shell'

describe('AppShell', () => {
  it('offers deliberate navigation to Web Call and public evidence', () => {
    render(<AppShell><main>Nội dung</main></AppShell>)

    expect(screen.getByRole('link', { name: 'Web Call' })).toHaveAttribute('href', '/console')
    expect(screen.getByRole('link', { name: 'Bằng chứng' })).toHaveAttribute('href', '/evidence')
  })
})

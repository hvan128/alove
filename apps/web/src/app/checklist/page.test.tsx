import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import ChecklistPage from './page'

describe('/checklist', () => {
  it('embeds the deployed checklist and keeps a path back to the landing page', () => {
    render(<ChecklistPage />)

    expect(screen.getByRole('heading', { name: 'Bản đồ tiêu chí & bằng chứng' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Về trang chủ Alove' })).toHaveAttribute('href', '/')
    expect(screen.getByTitle('Bản đồ tiêu chí và bằng chứng VALSEA')).toHaveAttribute(
      'src',
      '/rubric-checklist.html',
    )
  })

  it('ships the complete checklist artifact', () => {
    const checklistPath = resolve(process.cwd(), 'public/rubric-checklist.html')
    const document = new DOMParser().parseFromString(readFileSync(checklistPath, 'utf8'), 'text/html')

    expect(document.title).toBe('Bản đồ tiêu chí VALSEA — Alove')
    expect(document.querySelectorAll('table')).toHaveLength(7)
    expect(document.querySelectorAll('tbody tr')).toHaveLength(36)
    expect(document.querySelector('h1')?.textContent).toBe(
      'Alove đã chứng minh gì trước rubric VALSEA?',
    )
    expect(document.querySelector('.summary')?.textContent).toContain('3/3')
    const evidenceEntry = document.querySelector<HTMLAnchorElement>('.evidence-entry')
    expect(evidenceEntry?.getAttribute('href')).toBe('/evidence')
    expect(evidenceEntry?.getAttribute('target')).toBe('_top')
    expect(evidenceEntry?.textContent).toContain('Nghe 3 ca khó')
  })
})

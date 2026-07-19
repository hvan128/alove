import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import WhatWeBuiltPage from './page'

describe('/what-we-built', () => {
  it('embeds the presentation document and keeps a path home', () => {
    render(<WhatWeBuiltPage />)

    expect(screen.getByRole('heading', { name: 'What we built' })).toBeVisible()
    expect(screen.getByRole('link', { name: 'Về trang chủ Alove' })).toHaveAttribute('href', '/')
    expect(screen.getByTitle('What we built — hồ sơ sản phẩm Alove')).toHaveAttribute(
      'src',
      '/what-we-built.html',
    )
  })

  it('ships a judge-facing document without rubric comparison language', () => {
    const artifactPath = resolve(process.cwd(), 'public/what-we-built.html')
    const document = new DOMParser().parseFromString(readFileSync(artifactPath, 'utf8'), 'text/html')
    const content = document.body.textContent ?? ''

    expect(document.title).toBe('Alove — What we built')
    expect(document.querySelector('body > .theme-toggle:first-child')).not.toBeNull()
    expect(document.querySelectorAll('main section.doc-section')).toHaveLength(7)
    expect(document.querySelector('a[href="/console"]')).not.toBeNull()
    expect(document.querySelector('a[href="/evidence"]')).not.toBeNull()
    expect(content).toContain('Một cuộc gọi. Một hành trình đặt vé hoàn chỉnh.')
    expect(content).toContain('VALSEA là đôi tai của Alove')
    expect(content).toContain('Mở rộng theo ngành nghề')
    expect(content).toContain('Mở rộng theo ngôn ngữ')
    expect(content).toContain('Southeast Asia language packs')
    expect(content).not.toContain('Trọng số')
    expect(content).not.toContain('T1')
    expect(content).not.toContain('T2')
    expect(content).not.toContain('T3')
    expect(content).not.toContain('Phạm vi hiện tại')
  })
})

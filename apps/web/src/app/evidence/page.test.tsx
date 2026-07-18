import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import EvidencePage from './page'

describe('/evidence', () => {
  it('parses and renders the committed web-safe artifact', () => {
    render(<EvidencePage />)

    expect(screen.getByRole('heading', { name: 'Bằng chứng nhận dạng giọng nói', level: 1 })).toBeVisible()
    expect(screen.getAllByTestId('evidence-fixture')).toHaveLength(3)
    expect(screen.getAllByText('synthetic-no-pii')).toHaveLength(3)
    expect(screen.getByText('Đánh giá hoàn tất', { exact: true })).toBeVisible()
    expect(screen.getByText('không chứng minh giọng vùng miền', { exact: true })).toBeVisible()
  })
})

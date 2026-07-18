import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

type VercelConfig = {
  crons?: Array<{ path?: string; schedule?: string }>
}

describe('Vercel deployment contract', () => {
  it('uses the Hobby-compatible daily webhook recovery schedule', () => {
    const config = JSON.parse(
      readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8'),
    ) as VercelConfig

    expect(config.crons).toEqual([
      {
        path: '/api/booking/webhook/drain',
        schedule: '17 18 * * *',
      },
    ])
  })
})

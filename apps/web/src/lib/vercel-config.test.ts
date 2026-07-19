import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { DRAIN_CRON_SCHEDULE } from '@/app/api/booking/webhook/drain/route'

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

  it('tells the Sentry monitor the same schedule Vercel actually runs', () => {
    // Drift here is silent and expensive: the monitor would expect a run at a
    // time no cron fires and page every day that nothing is wrong.
    const config = JSON.parse(
      readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8'),
    ) as VercelConfig

    expect(DRAIN_CRON_SCHEDULE).toBe(config.crons?.[0]?.schedule)
  })
})

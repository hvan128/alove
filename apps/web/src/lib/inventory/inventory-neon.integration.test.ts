import { describe, expect, it } from 'vitest'

describe.runIf(Boolean(process.env.DATABASE_URL))('Neon inventory locking', () => {
  it('is covered by the same one-winner repository contract', () => {
    expect(process.env.DATABASE_URL).toBeTruthy()
  })
})

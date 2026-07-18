import { neon } from '@neondatabase/serverless'
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http'

import * as schema from './schema'

export type Db = NeonHttpDatabase<typeof schema>

let cached: Db | null | undefined

// Persistence is optional: without DATABASE_URL every flow (web demo, booking
// advance, dashboard) must keep working — callers treat null as "skip writes".
export function getDb(): Db | null {
  if (cached !== undefined) return cached
  const url = process.env.DATABASE_URL
  if (!url) {
    cached = null
    return cached
  }
  cached = drizzle(neon(url), { schema })
  return cached
}

export function resetDbForTests(): void {
  cached = undefined
}

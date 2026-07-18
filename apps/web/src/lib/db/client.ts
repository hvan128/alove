import { neon } from '@neondatabase/serverless'
import { drizzle, type NeonHttpDatabase } from 'drizzle-orm/neon-http'

import * as schema from './schema'

export type Db = NeonHttpDatabase<typeof schema>

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super('DATABASE_URL is not configured')
    this.name = 'DatabaseNotConfiguredError'
  }
}

let cached: Db | null | undefined

// Dashboard readers use a nullable client to render an explicit setup state.
// Active booking/event stores call requireDb() and never treat missing storage
// as a valid empty result.
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

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL)
}

/**
 * Active booking and call-event paths must never turn a missing database into a
 * believable empty result. Dashboard readers may still use getDb() to render a
 * dedicated "not configured" state.
 */
export function requireDb(): Db {
  const db = getDb()
  if (!db) throw new DatabaseNotConfiguredError()
  return db
}

export function resetDbForTests(): void {
  cached = undefined
}

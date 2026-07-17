import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema.js'

function createDb() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for Neon persistence')
  }

  return drizzle(neon(connectionString), { schema })
}

let database: ReturnType<typeof createDb> | undefined

export function getDb(): ReturnType<typeof createDb> {
  database ??= createDb()
  return database
}

export function resetDbForTests(): void {
  database = undefined
}

export * from './schema.js'

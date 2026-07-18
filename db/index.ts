import { Pool, neonConfig } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import ws from 'ws'
import * as schema from './schema'

neonConfig.webSocketConstructor = ws

let pool: Pool | undefined

function createDb() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for Neon persistence')
  }

  pool = new Pool({ connectionString })
  return drizzle(pool, { schema })
}

let database: ReturnType<typeof createDb> | undefined

export function getDb(): ReturnType<typeof createDb> {
  database ??= createDb()
  return database
}

export async function resetDbForTests(): Promise<void> {
  await pool?.end()
  pool = undefined
  database = undefined
}

export * from './schema'

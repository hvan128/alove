import { afterEach, describe, expect, it } from 'vitest'
import { getDb, resetDbForTests } from '../index.js'

const originalDatabaseUrl = process.env.DATABASE_URL

afterEach(() => {
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl
  }
  resetDbForTests()
})

describe('Neon database initialization', () => {
  it('defers database configuration until the database is requested', () => {
    delete process.env.DATABASE_URL

    expect(() => getDb()).toThrow('DATABASE_URL is required')
  })
})

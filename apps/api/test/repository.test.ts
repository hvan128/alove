import { afterEach, describe, expect, it } from 'vitest'
import { createRepositoryFromEnvironment } from '../src/repository.js'

const originalDatabaseUrl = process.env.DATABASE_URL

afterEach(() => {
  if (originalDatabaseUrl === undefined) {
    delete process.env.DATABASE_URL
  } else {
    process.env.DATABASE_URL = originalDatabaseUrl
  }
})

describe('repository selection', () => {
  it('uses the visibly labelled memory demo only when Neon is not configured', () => {
    delete process.env.DATABASE_URL

    expect(createRepositoryFromEnvironment().mode).toBe('demo-memory')
  })

  it('selects the lazy Neon boundary when a connection string is configured', () => {
    process.env.DATABASE_URL = 'postgresql://placeholder:placeholder@example.invalid/ordervoice'

    expect(createRepositoryFromEnvironment().mode).toBe('neon')
  })
})

import { sql } from 'drizzle-orm'

import { requireDb } from './client'
import { publicRateLimits } from './schema'

export async function consumePublicRateLimit(
  key: string,
  options: { limit: number; windowMs: number },
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const db = requireDb()
  const windowSeconds = Math.max(1, Math.ceil(options.windowMs / 1_000))
  const result = await db.execute(sql`
    WITH purged AS (
      DELETE FROM ${publicRateLimits}
      WHERE ${publicRateLimits.resetsAt} < now() - interval '1 day'
      RETURNING ${publicRateLimits.key}
    ), limited AS (
      INSERT INTO ${publicRateLimits} (key, count, resets_at, updated_at)
      VALUES (${key}, 1, now() + make_interval(secs => ${windowSeconds}), now())
      ON CONFLICT (key) DO UPDATE
      SET count = CASE
            WHEN ${publicRateLimits.resetsAt} <= now() THEN 1
            ELSE ${publicRateLimits.count} + 1
          END,
          resets_at = CASE
            WHEN ${publicRateLimits.resetsAt} <= now()
              THEN now() + make_interval(secs => ${windowSeconds})
            ELSE ${publicRateLimits.resetsAt}
          END,
          updated_at = now()
      RETURNING count, resets_at AS "resetsAt"
    )
    SELECT count, "resetsAt" FROM limited
  `)
  const [row] = result.rows as unknown as Array<{ count: number | string; resetsAt: Date | string }>
  if (!row) throw new Error('Distributed rate limit did not return a bucket.')
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((new Date(row.resetsAt).getTime() - Date.now()) / 1_000),
  )
  return { allowed: Number(row.count) <= options.limit, retryAfterSeconds }
}

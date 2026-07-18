/**
 * F-13 gate for live operator API sync.
 *
 * The feature spec allows live sync only when a contract *and* its reconciliation
 * evidence both exist. This module fails closed: without both signals no adapter
 * runs, so a configured-but-unverified integration can never be presented as a
 * live operator claim. Flipping the env vars alone does not implement sync — it
 * only unblocks an adapter that must still pass reconciliation tests.
 */

export type LiveSyncContract = {
  contractId: string
  reconciliationPassed: true
  reconciledAt: string | null
}

export type LiveSyncStatus =
  | { enabled: true; contract: LiveSyncContract }
  | { enabled: false; reason: 'NO_CONTRACT' | 'RECONCILIATION_NOT_PASSED' }

export function readLiveSyncStatus(env: Record<string, string | undefined>): LiveSyncStatus {
  const contractId = env.CATALOG_LIVE_SYNC_CONTRACT_ID?.trim()
  if (!contractId) return { enabled: false, reason: 'NO_CONTRACT' }
  if (env.CATALOG_LIVE_SYNC_RECONCILIATION_PASSED !== 'true') {
    return { enabled: false, reason: 'RECONCILIATION_NOT_PASSED' }
  }

  return {
    enabled: true,
    contract: {
      contractId,
      reconciliationPassed: true,
      reconciledAt: env.CATALOG_LIVE_SYNC_RECONCILED_AT?.trim() || null,
    },
  }
}

/** Throws `LIVE_SYNC_NOT_CONTRACTED` unless both contract and reconciliation are present. */
export function assertLiveSyncContracted(env: Record<string, string | undefined>): LiveSyncContract {
  const status = readLiveSyncStatus(env)
  if (!status.enabled) throw new Error('LIVE_SYNC_NOT_CONTRACTED')
  return status.contract
}

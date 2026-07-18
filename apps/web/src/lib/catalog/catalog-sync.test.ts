import { describe, expect, it } from 'vitest'
import { assertLiveSyncContracted, readLiveSyncStatus } from './catalog-sync'

describe('live catalog sync gate', () => {
  it('stays closed with no configuration at all', () => {
    expect(readLiveSyncStatus({})).toEqual({ enabled: false, reason: 'NO_CONTRACT' })
    expect(() => assertLiveSyncContracted({})).toThrow('LIVE_SYNC_NOT_CONTRACTED')
  })

  it('stays closed when a contract exists but reconciliation has not passed', () => {
    const env = { CATALOG_LIVE_SYNC_CONTRACT_ID: 'operator-x-v1' }

    expect(readLiveSyncStatus(env)).toEqual({ enabled: false, reason: 'RECONCILIATION_NOT_PASSED' })
    expect(() => assertLiveSyncContracted(env)).toThrow('LIVE_SYNC_NOT_CONTRACTED')
  })

  it('stays closed when reconciliation is claimed without a contract', () => {
    expect(() => assertLiveSyncContracted({
      CATALOG_LIVE_SYNC_RECONCILIATION_PASSED: 'true',
    })).toThrow('LIVE_SYNC_NOT_CONTRACTED')
  })

  it('rejects a non-literal reconciliation flag', () => {
    for (const flag of ['1', 'yes', 'TRUE', '']) {
      expect(() => assertLiveSyncContracted({
        CATALOG_LIVE_SYNC_CONTRACT_ID: 'operator-x-v1',
        CATALOG_LIVE_SYNC_RECONCILIATION_PASSED: flag,
      })).toThrow('LIVE_SYNC_NOT_CONTRACTED')
    }
  })

  it('treats a whitespace-only contract id as absent', () => {
    expect(readLiveSyncStatus({
      CATALOG_LIVE_SYNC_CONTRACT_ID: '   ',
      CATALOG_LIVE_SYNC_RECONCILIATION_PASSED: 'true',
    })).toEqual({ enabled: false, reason: 'NO_CONTRACT' })
  })

  it('opens only when contract and reconciliation are both present', () => {
    const contract = assertLiveSyncContracted({
      CATALOG_LIVE_SYNC_CONTRACT_ID: 'operator-x-v1',
      CATALOG_LIVE_SYNC_RECONCILIATION_PASSED: 'true',
      CATALOG_LIVE_SYNC_RECONCILED_AT: '2026-07-18T10:00:00.000Z',
    })

    expect(contract).toEqual({
      contractId: 'operator-x-v1',
      reconciliationPassed: true,
      reconciledAt: '2026-07-18T10:00:00.000Z',
    })
  })
})

import { describe, expect, it } from 'vitest'
import {
  MAX_EVIDENCE_TEXT_CODE_POINTS,
  MAX_EVIDENCE_TOKENS,
  calculateEvidenceMetrics,
  parseEvidenceResults,
  parseFixtureManifest,
  type FixtureManifest,
} from './schema'

const HASH = 'a'.repeat(64)
const OTHER_HASH = 'b'.repeat(64)

type MutableSucceededResult = {
  status: string
  inputSha256: string
  transcript: string
  metrics: ReturnType<typeof calculateEvidenceMetrics>
  error: null
}

type MutableEvidenceFixture = {
  groundTruth: string
  expectedEnglishTokens: string[]
  audio: { sha256: string }
  engines: {
    valsea: { result: MutableSucceededResult | Record<string, unknown> }
    whisper: { result: MutableSucceededResult | Record<string, unknown> }
  }
}

function manifestFixture(
  id: string,
  category: FixtureManifest['fixtures'][number]['category'],
  sampleRateHz: 8_000 | 16_000,
) {
  return {
    id,
    label: `Fixture ${id}`,
    description: `Synthetic fixture for ${category}`,
    category,
    audioPath: `/evidence/fixtures/${id}.wav`,
    groundTruth: 'Tôi muốn book một vé đi Đà Lạt.',
    expectedEnglishTokens: ['book'],
    synthetic: true,
    noPii: true,
    sampleRateHz,
    channels: 1,
    bitsPerSample: 16,
    sha256: HASH,
    provenance: {
      generator: 'Synthetic test generator',
      voice: 'Synthetic test voice',
      processing: ['PCM conversion'],
    },
  }
}

function validManifest(): unknown {
  return {
    schemaVersion: '1.0.0',
    provenance: 'synthetic-no-pii',
    fixtures: [
      manifestFixture('tonal-vietnamese', 'tonal-vietnamese', 16_000),
      manifestFixture('dense-code-switch', 'dense-vn-en-code-switch', 16_000),
      manifestFixture('noisy-telephone-8khz', 'noisy-telephone-8khz', 8_000),
    ],
  }
}

function validBlockedResults(): Record<string, unknown> {
  const manifest = parseFixtureManifest(validManifest())
  const unrunResult = () => ({
    status: 'unrun',
    inputSha256: null,
    transcript: null,
    metrics: null,
    error: null,
  })
  return {
    schemaVersion: '1.0.0',
    status: 'blocked',
    statusReason: 'Live provider evaluation has not run.',
    generatedAt: '2026-07-18T12:00:00.000Z',
    fixtureManifestSha256: OTHER_HASH,
    fixtures: manifest.fixtures.map((fixture) => ({
      id: fixture.id,
      label: fixture.label,
      description: fixture.description,
      category: fixture.category,
      provenance: 'synthetic-no-pii',
      groundTruth: fixture.groundTruth,
      expectedEnglishTokens: fixture.expectedEnglishTokens,
      audio: {
        path: fixture.audioPath,
        sha256: fixture.sha256,
        format: {
          container: 'wav',
          codec: 'pcm_s16le',
          sampleRateHz: fixture.sampleRateHz,
          channels: fixture.channels,
          bitsPerSample: fixture.bitsPerSample,
        },
      },
      engines: {
        valsea: {
          provider: 'valsea',
          model: 'valsea-transcribe',
          language: 'vietnamese',
          result: unrunResult(),
        },
        whisper: {
          provider: 'openai-whisper',
          model: 'whisper-1',
          language: 'vi',
          result: unrunResult(),
        },
      },
    })),
  }
}

function validCompleteResults(): Record<string, unknown> {
  const results = validBlockedResults()
  results.status = 'complete'
  results.statusReason = null
  for (const fixture of results.fixtures as MutableEvidenceFixture[]) {
    const succeeded = (): MutableSucceededResult => ({
      status: 'succeeded',
      inputSha256: fixture.audio.sha256,
      transcript: fixture.groundTruth,
      metrics: calculateEvidenceMetrics(
        fixture.groundTruth,
        fixture.groundTruth,
        fixture.expectedEnglishTokens,
      ),
      error: null,
    })
    fixture.engines.valsea.result = succeeded()
    fixture.engines.whisper.result = succeeded()
  }
  return results
}

describe('fixture provenance manifest schema', () => {
  it('accepts exactly three distinct synthetic/no-PII hard-case fixtures', () => {
    const manifest = parseFixtureManifest(validManifest())

    expect(manifest.fixtures).toHaveLength(3)
    expect(manifest.fixtures[2]?.sampleRateHz).toBe(8_000)
  })

  it('rejects unverified provenance, unsafe paths, and duplicate categories', () => {
    const wrongProvenance = structuredClone(validManifest()) as Record<string, unknown>
    wrongProvenance.provenance = 'customer-call'
    expect(() => parseFixtureManifest(wrongProvenance)).toThrow()

    const unsafePath = structuredClone(validManifest()) as {
      fixtures: Array<Record<string, unknown>>
    }
    unsafePath.fixtures[0]!.audioPath = '/evidence/fixtures/../private.wav'
    expect(() => parseFixtureManifest(unsafePath)).toThrow()

    const duplicateCategory = structuredClone(validManifest()) as {
      fixtures: Array<Record<string, unknown>>
    }
    duplicateCategory.fixtures[1]!.category = 'tonal-vietnamese'
    expect(() => parseFixtureManifest(duplicateCategory)).toThrow(/Duplicate fixture category/)
  })

  it('requires a real lowercase SHA-256 shape and literal safety flags', () => {
    const manifest = structuredClone(validManifest()) as {
      fixtures: Array<Record<string, unknown>>
    }
    manifest.fixtures[0]!.sha256 = 'pending'
    manifest.fixtures[1]!.noPii = false

    expect(() => parseFixtureManifest(manifest)).toThrow()
  })

  it('requires a normalized unique English-token subset of ground truth', () => {
    for (const tokens of [['Book'], ['book', 'book'], ['book ticket'], ['ticket']]) {
      const value = structuredClone(validManifest()) as {
        fixtures: Array<{ expectedEnglishTokens: string[] }>
      }
      value.fixtures[0]!.expectedEnglishTokens = tokens
      expect(() => parseFixtureManifest(value)).toThrow()
    }
  })

  it('bounds manifest ground truth by Unicode code points and token count', () => {
    const tooLong = structuredClone(validManifest()) as {
      fixtures: Array<{ groundTruth: string }>
    }
    tooLong.fixtures[0]!.groundTruth = 'x'.repeat(MAX_EVIDENCE_TEXT_CODE_POINTS + 1)
    expect(() => parseFixtureManifest(tooLong)).toThrow()

    const tooManyTokens = structuredClone(validManifest()) as {
      fixtures: Array<{ groundTruth: string }>
    }
    tooManyTokens.fixtures[0]!.groundTruth = Array.from(
      { length: MAX_EVIDENCE_TOKENS + 1 },
      () => 'vé',
    ).join(' ')
    expect(() => parseFixtureManifest(tooManyTokens)).toThrow()
  })
})

describe('hard-case evidence result schema', () => {
  it('accepts a truthful blocked artifact only when all engines are unrun', () => {
    const results = parseEvidenceResults(validBlockedResults())

    expect(results.status).toBe('blocked')
    expect(results.fixtures[0]?.engines.valsea.result.status).toBe('unrun')
  })

  it('rejects a blocked artifact containing a claimed provider result', () => {
    const results = validBlockedResults() as {
      fixtures: Array<{
        engines: { valsea: { result: Record<string, unknown> } }
      }>
    } & Record<string, unknown>
    results.fixtures[0]!.engines.valsea.result = {
      status: 'failed',
      inputSha256: HASH,
      transcript: null,
      metrics: null,
      error: 'valsea_http_401',
    }

    expect(() => parseEvidenceResults(results)).toThrow(/Blocked evidence/)
  })

  it('rejects raw provider errors and input hashes that differ from the audio', () => {
    const rawError = validBlockedResults() as {
      status: string
      statusReason: string
      fixtures: Array<{
        engines: {
          valsea: { result: Record<string, unknown> }
          whisper: { result: Record<string, unknown> }
        }
      }>
    } & Record<string, unknown>
    rawError.status = 'incomplete'
    for (const fixture of rawError.fixtures) {
      fixture.engines.valsea.result = {
        status: 'failed',
        inputSha256: HASH,
        transcript: null,
        metrics: null,
        error: 'Authorization Bearer secret@example.com',
      }
      fixture.engines.whisper.result = {
        status: 'failed',
        inputSha256: OTHER_HASH,
        transcript: null,
        metrics: null,
        error: 'whisper_http_503',
      }
    }

    expect(() => parseEvidenceResults(rawError)).toThrow()
  })

  it('keeps the documented provider models and language codes exact', () => {
    const results = validBlockedResults() as {
      fixtures: Array<{ engines: { whisper: Record<string, unknown> } }>
    } & Record<string, unknown>
    results.fixtures[0]!.engines.whisper.language = 'vietnamese'

    expect(() => parseEvidenceResults(results)).toThrow()
  })

  it('accepts deterministic succeeded metrics and rejects metric or diff tampering', () => {
    expect(() => parseEvidenceResults(validCompleteResults())).not.toThrow()

    const metricTamper = validCompleteResults()
    const metricFixture = (metricTamper.fixtures as MutableEvidenceFixture[])[0]!
    const metricResult = metricFixture.engines.valsea.result as MutableSucceededResult
    metricResult.metrics.wordErrorRate.value = 0.5
    expect(() => parseEvidenceResults(metricTamper)).toThrow(/deterministic recomputation/)

    const diffTamper = validCompleteResults()
    const diffFixture = (diffTamper.fixtures as MutableEvidenceFixture[])[0]!
    const diffResult = diffFixture.engines.valsea.result as MutableSucceededResult
    diffResult.metrics.wordErrorRate.diff = []
    expect(() => parseEvidenceResults(diffTamper)).toThrow(/deterministic recomputation/)
  })

  it('rejects allowlist tampering and empty or oversized succeeded transcripts', () => {
    const allowlistTamper = validCompleteResults()
    const allowlistFixture = (allowlistTamper.fixtures as MutableEvidenceFixture[])[0]!
    allowlistFixture.expectedEnglishTokens = []
    expect(() => parseEvidenceResults(allowlistTamper)).toThrow(/deterministic recomputation/)

    for (const transcript of [
      '',
      '🚌'.repeat(MAX_EVIDENCE_TEXT_CODE_POINTS + 1),
      Array.from({ length: MAX_EVIDENCE_TOKENS + 1 }, () => 'vé').join(' '),
    ]) {
      const results = validCompleteResults()
      const fixture = (results.fixtures as MutableEvidenceFixture[])[0]!
      const succeeded = fixture.engines.valsea.result as MutableSucceededResult
      succeeded.transcript = transcript
      expect(() => parseEvidenceResults(results)).toThrow()
    }
  })
})

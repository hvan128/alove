import { z } from 'zod'
import {
  calculateEnglishTokenRetention,
  calculateVietnameseToneRetention,
  calculateWordErrorRate,
  isEnglishToken,
  normalizeTranscript,
  tokenizeTranscript,
} from './wer'

export const EVIDENCE_SCHEMA_VERSION = '1.0.0' as const
export const SYNTHETIC_FIXTURE_PROVENANCE = 'synthetic-no-pii' as const
export const MAX_EVIDENCE_TEXT_CODE_POINTS = 4_096
export const MAX_EVIDENCE_TOKENS = 256
export const MAX_EVIDENCE_DIFF_OPERATIONS = MAX_EVIDENCE_TOKENS * 2

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/, 'Expected a lowercase SHA-256 digest.')
const nonBlankTextSchema = z.string().trim().min(1)
const boundedGroundTruthSchema = nonBlankTextSchema
  .refine(
    (value) => Array.from(value).length <= MAX_EVIDENCE_TEXT_CODE_POINTS,
    { message: `Ground truth must not exceed ${MAX_EVIDENCE_TEXT_CODE_POINTS} Unicode code points.` },
  )
  .refine(
    (value) => {
      const count = tokenizeTranscript(value).length
      return count >= 1 && count <= MAX_EVIDENCE_TOKENS
    },
    { message: `Ground truth must contain 1–${MAX_EVIDENCE_TOKENS} tokens.` },
  )
const boundedTranscriptSchema = z.string()
  .refine((value) => value.trim().length > 0, { message: 'Transcript must not be empty.' })
  .refine(
    (value) => Array.from(value).length <= MAX_EVIDENCE_TEXT_CODE_POINTS,
    { message: `Transcript must not exceed ${MAX_EVIDENCE_TEXT_CODE_POINTS} Unicode code points.` },
  )
  .refine(
    (value) => tokenizeTranscript(value).length <= MAX_EVIDENCE_TOKENS,
    { message: `Transcript must not exceed ${MAX_EVIDENCE_TOKENS} tokens.` },
  )
const expectedEnglishTokenSchema = z.string().min(1).refine(
  (value) => {
    const tokens = tokenizeTranscript(value)
    return value === normalizeTranscript(value)
      && tokens.length === 1
      && tokens[0] === value
      && isEnglishToken(value)
  },
  { message: 'Expected English tokens must be normalized single ASCII-English tokens.' },
)
const expectedEnglishTokensSchema = z.array(expectedEnglishTokenSchema).max(MAX_EVIDENCE_TOKENS)
const boundedDiffTokenSchema = nonBlankTextSchema.refine(
  (value) => Array.from(value).length <= MAX_EVIDENCE_TEXT_CODE_POINTS,
  { message: 'Diff tokens exceed the evidence text limit.' },
)
const safeAudioPathSchema = z.string().regex(
  /^\/evidence\/fixtures\/[a-z0-9][a-z0-9-]*\.wav$/,
  'Audio paths must be safe, absolute public fixture paths.',
)

export const fixtureManifestSchema = z.object({
  schemaVersion: z.literal(EVIDENCE_SCHEMA_VERSION),
  provenance: z.literal(SYNTHETIC_FIXTURE_PROVENANCE),
  fixtures: z.array(z.object({
    id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
    label: nonBlankTextSchema,
    description: nonBlankTextSchema,
    category: z.enum([
      'tonal-vietnamese',
      'dense-vn-en-code-switch',
      'noisy-telephone-8khz',
    ]),
    audioPath: safeAudioPathSchema,
    groundTruth: boundedGroundTruthSchema,
    expectedEnglishTokens: expectedEnglishTokensSchema,
    synthetic: z.literal(true),
    noPii: z.literal(true),
    sampleRateHz: z.union([z.literal(8_000), z.literal(16_000)]),
    channels: z.literal(1),
    bitsPerSample: z.literal(16),
    sha256: sha256Schema,
    provenance: z.object({
      generator: nonBlankTextSchema,
      voice: nonBlankTextSchema,
      processing: z.array(nonBlankTextSchema).min(1),
    }).strict(),
  }).strict()).length(3).superRefine((fixtures, context) => {
    const ids = new Set<string>()
    const paths = new Set<string>()
    const categories = new Set<string>()

    for (const [index, fixture] of fixtures.entries()) {
      if (ids.has(fixture.id)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate fixture id: ${fixture.id}`,
          path: [index, 'id'],
        })
      }
      if (paths.has(fixture.audioPath)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate fixture audio path: ${fixture.audioPath}`,
          path: [index, 'audioPath'],
        })
      }
      if (categories.has(fixture.category)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate fixture category: ${fixture.category}`,
          path: [index, 'category'],
        })
      }
      ids.add(fixture.id)
      paths.add(fixture.audioPath)
      categories.add(fixture.category)

      for (const issue of englishAllowlistIssues(
        fixture.groundTruth,
        fixture.expectedEnglishTokens,
      )) {
        context.addIssue({
          code: 'custom',
          message: issue.message,
          path: [index, 'expectedEnglishTokens', issue.index],
        })
      }
    }
  }),
}).strict()

const diffOperationSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('equal'),
    reference: boundedDiffTokenSchema,
    hypothesis: boundedDiffTokenSchema,
  }).strict().refine(
    ({ reference, hypothesis }) => reference === hypothesis,
    { message: 'Equal diff tokens must match.' },
  ),
  z.object({
    type: z.literal('substitute'),
    reference: boundedDiffTokenSchema,
    hypothesis: boundedDiffTokenSchema,
  }).strict(),
  z.object({
    type: z.literal('delete'),
    reference: boundedDiffTokenSchema,
    hypothesis: z.null(),
  }).strict(),
  z.object({
    type: z.literal('insert'),
    reference: z.null(),
    hypothesis: boundedDiffTokenSchema,
  }).strict(),
])

const evidenceMetricsSchema = z.object({
  wordErrorRate: z.object({
    value: z.number().finite().nonnegative(),
    edits: z.number().int().nonnegative(),
    referenceWords: z.number().int().positive(),
    diff: z.array(diffOperationSchema).max(MAX_EVIDENCE_DIFF_OPERATIONS),
  }).strict(),
  englishTokenRetention: z.object({
    value: z.number().finite().min(0).max(1).nullable(),
    retained: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
  }).strict(),
  vietnameseToneRetention: z.object({
    value: z.number().finite().min(0).max(1).nullable(),
    retained: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
  }).strict(),
}).strict().superRefine((metrics, context) => {
  for (const metricName of ['englishTokenRetention', 'vietnameseToneRetention'] as const) {
    const metric = metrics[metricName]
    if (metric.retained > metric.total) {
      context.addIssue({
        code: 'custom',
        message: 'Retained token count cannot exceed the reference token count.',
        path: [metricName, 'retained'],
      })
    }
    if ((metric.total === 0) !== (metric.value === null)) {
      context.addIssue({
        code: 'custom',
        message: 'Retention value must be null exactly when there are no eligible reference tokens.',
        path: [metricName, 'value'],
      })
    }
  }
})

const unrunEngineStateSchema = z.object({
  status: z.literal('unrun'),
  inputSha256: z.null(),
  transcript: z.null(),
  metrics: z.null(),
  error: z.null(),
}).strict()

const succeededEngineStateSchema = z.object({
  status: z.literal('succeeded'),
  inputSha256: sha256Schema,
  transcript: boundedTranscriptSchema,
  metrics: evidenceMetricsSchema,
  error: z.null(),
}).strict()

const failedEngineStateSchema = z.object({
  status: z.literal('failed'),
  inputSha256: sha256Schema,
  transcript: z.null(),
  metrics: z.null(),
  error: z.string().regex(
    /^[a-z0-9][a-z0-9_-]*$/,
    'Provider errors must be redacted machine-readable reason codes.',
  ),
}).strict()

const engineStateSchema = z.discriminatedUnion('status', [
  unrunEngineStateSchema,
  succeededEngineStateSchema,
  failedEngineStateSchema,
])

const valseaEngineSchema = z.object({
  provider: z.literal('valsea'),
  model: z.literal('valsea-transcribe'),
  language: z.literal('vietnamese'),
  result: engineStateSchema,
}).strict()

const whisperEngineSchema = z.object({
  provider: z.literal('openai-whisper'),
  model: z.literal('whisper-1'),
  language: z.literal('vi'),
  result: engineStateSchema,
}).strict()

const evidenceFixtureSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  label: nonBlankTextSchema,
  description: nonBlankTextSchema,
  category: z.enum([
    'tonal-vietnamese',
    'dense-vn-en-code-switch',
    'noisy-telephone-8khz',
  ]),
  provenance: z.literal(SYNTHETIC_FIXTURE_PROVENANCE),
  groundTruth: boundedGroundTruthSchema,
  expectedEnglishTokens: expectedEnglishTokensSchema,
  audio: z.object({
    path: safeAudioPathSchema,
    sha256: sha256Schema,
    format: z.object({
      container: z.literal('wav'),
      codec: z.literal('pcm_s16le'),
      sampleRateHz: z.union([z.literal(8_000), z.literal(16_000)]),
      channels: z.literal(1),
      bitsPerSample: z.literal(16),
    }).strict(),
  }).strict(),
  engines: z.object({
    valsea: valseaEngineSchema,
    whisper: whisperEngineSchema,
  }).strict(),
}).strict().superRefine((fixture, context) => {
  for (const issue of englishAllowlistIssues(
    fixture.groundTruth,
    fixture.expectedEnglishTokens,
  )) {
    context.addIssue({
      code: 'custom',
      message: issue.message,
      path: ['expectedEnglishTokens', issue.index],
    })
  }

  for (const engineName of ['valsea', 'whisper'] as const) {
    const state = fixture.engines[engineName].result
    if (state.inputSha256 !== null && state.inputSha256 !== fixture.audio.sha256) {
      context.addIssue({
        code: 'custom',
        message: 'Engine input hash must match the fixture audio hash.',
        path: ['engines', engineName, 'result', 'inputSha256'],
      })
    }
    if (state.status === 'succeeded') {
      const recomputed = calculateEvidenceMetrics(
        fixture.groundTruth,
        state.transcript,
        fixture.expectedEnglishTokens,
      )
      if (!evidenceMetricsMatch(state.metrics, recomputed)) {
        context.addIssue({
          code: 'custom',
          message: 'Succeeded engine metrics and diff must match deterministic recomputation.',
          path: ['engines', engineName, 'result', 'metrics'],
        })
      }
    }
  }
})

export const evidenceResultsSchema = z.object({
  schemaVersion: z.literal(EVIDENCE_SCHEMA_VERSION),
  status: z.enum(['blocked', 'incomplete', 'complete']),
  statusReason: nonBlankTextSchema.nullable(),
  generatedAt: z.string().datetime({ offset: true }),
  fixtureManifestSha256: sha256Schema,
  fixtures: z.array(evidenceFixtureSchema).length(3),
}).strict().superRefine((results, context) => {
  const engineStates = results.fixtures.flatMap((fixture) => [
    fixture.engines.valsea.result.status,
    fixture.engines.whisper.result.status,
  ])
  const allUnrun = engineStates.every((status) => status === 'unrun')
  const allSucceeded = engineStates.every((status) => status === 'succeeded')
  const allAttempted = engineStates.every((status) => status !== 'unrun')

  if (results.status === 'blocked' && (!allUnrun || results.statusReason === null)) {
    context.addIssue({
      code: 'custom',
      message: 'Blocked evidence must have a reason and only unrun engine states.',
      path: ['status'],
    })
  }
  if (results.status === 'complete' && (!allSucceeded || results.statusReason !== null)) {
    context.addIssue({
      code: 'custom',
      message: 'Complete evidence requires every engine run to succeed and no status reason.',
      path: ['status'],
    })
  }
  if (results.status === 'incomplete' && (!allAttempted || allSucceeded || results.statusReason === null)) {
    context.addIssue({
      code: 'custom',
      message: 'Incomplete evidence requires all runs to be attempted, at least one failure, and a reason.',
      path: ['status'],
    })
  }
})

export type FixtureManifest = z.infer<typeof fixtureManifestSchema>
export type FixtureManifestEntry = FixtureManifest['fixtures'][number]
export type EvidenceResults = z.infer<typeof evidenceResultsSchema>
export type EvidenceFixture = EvidenceResults['fixtures'][number]
export type EvidenceMetrics = NonNullable<
  EvidenceFixture['engines']['valsea']['result']['metrics']
>

export function calculateEvidenceMetrics(
  reference: string,
  hypothesis: string,
  expectedEnglishTokens?: readonly string[],
): EvidenceMetrics {
  const wordErrorRate = calculateWordErrorRate(reference, hypothesis)
  const englishTokenRetention = calculateEnglishTokenRetention(
    reference,
    hypothesis,
    expectedEnglishTokens,
  )
  const vietnameseToneRetention = calculateVietnameseToneRetention(reference, hypothesis)

  return {
    wordErrorRate: {
      value: wordErrorRate.wer,
      edits: wordErrorRate.counts.errors,
      referenceWords: wordErrorRate.counts.referenceWords,
      diff: wordErrorRate.operations.map((operation) => {
        if (
          (operation.type === 'equal' || operation.type === 'substitute')
          && operation.referenceToken !== null
          && operation.hypothesisToken !== null
        ) {
          return {
            type: operation.type,
            reference: operation.referenceToken,
            hypothesis: operation.hypothesisToken,
          }
        }
        if (operation.type === 'delete' && operation.referenceToken !== null) {
          return { type: 'delete', reference: operation.referenceToken, hypothesis: null }
        }
        if (operation.type === 'insert' && operation.hypothesisToken !== null) {
          return { type: 'insert', reference: null, hypothesis: operation.hypothesisToken }
        }
        throw new Error('Metric diff operation violated its internal contract.')
      }),
    },
    englishTokenRetention: {
      value: englishTokenRetention.rate,
      retained: englishTokenRetention.retainedTokenCount,
      total: englishTokenRetention.referenceTokenCount,
    },
    vietnameseToneRetention: {
      value: vietnameseToneRetention.rate,
      retained: vietnameseToneRetention.retainedTokenCount,
      total: vietnameseToneRetention.referenceTokenCount,
    },
  }
}

function englishAllowlistIssues(
  groundTruth: string,
  expectedEnglishTokens: readonly string[],
): Array<{ index: number; message: string }> {
  const available = new Map<string, number>()
  for (const token of tokenizeTranscript(groundTruth)) {
    available.set(token, (available.get(token) ?? 0) + 1)
  }

  const seen = new Set<string>()
  const issues: Array<{ index: number; message: string }> = []
  for (const [index, token] of expectedEnglishTokens.entries()) {
    if (seen.has(token)) {
      issues.push({ index, message: 'Expected English tokens must be unique.' })
      continue
    }
    seen.add(token)
    const remaining = available.get(token) ?? 0
    if (remaining === 0) {
      issues.push({
        index,
        message: 'Expected English tokens must be a multiset subset of ground truth.',
      })
      continue
    }
    available.set(token, remaining - 1)
  }
  return issues
}

function evidenceMetricsMatch(actual: EvidenceMetrics, expected: EvidenceMetrics): boolean {
  const actualWer = actual.wordErrorRate
  const expectedWer = expected.wordErrorRate
  if (
    !ratesMatch(actualWer.value, expectedWer.value)
    || actualWer.edits !== expectedWer.edits
    || actualWer.referenceWords !== expectedWer.referenceWords
    || actualWer.diff.length !== expectedWer.diff.length
  ) return false

  for (const [index, actualOperation] of actualWer.diff.entries()) {
    const expectedOperation = expectedWer.diff[index]
    if (
      expectedOperation === undefined
      || actualOperation.type !== expectedOperation.type
      || actualOperation.reference !== expectedOperation.reference
      || actualOperation.hypothesis !== expectedOperation.hypothesis
    ) return false
  }

  for (const metricName of ['englishTokenRetention', 'vietnameseToneRetention'] as const) {
    const actualRetention = actual[metricName]
    const expectedRetention = expected[metricName]
    if (
      actualRetention.retained !== expectedRetention.retained
      || actualRetention.total !== expectedRetention.total
      || !ratesMatch(actualRetention.value, expectedRetention.value)
    ) return false
  }
  return true
}

function ratesMatch(actual: number | null, expected: number | null): boolean {
  if (actual === null || expected === null) return actual === expected
  return Math.abs(actual - expected) <= 1e-12
}

export function parseFixtureManifest(value: unknown): FixtureManifest {
  return fixtureManifestSchema.parse(value)
}

export function parseEvidenceResults(value: unknown): EvidenceResults {
  return evidenceResultsSchema.parse(value)
}

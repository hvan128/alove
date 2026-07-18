import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  EVIDENCE_SCHEMA_VERSION,
  MAX_EVIDENCE_TEXT_CODE_POINTS,
  MAX_EVIDENCE_TOKENS,
  SYNTHETIC_FIXTURE_PROVENANCE,
  calculateEvidenceMetrics,
  parseEvidenceResults,
  parseFixtureManifest,
  type EvidenceFixture,
  type EvidenceResults,
  type FixtureManifest,
  type FixtureManifestEntry,
} from '../apps/web/src/lib/evidence/schema.js'

const REPOSITORY_ROOT = fileURLToPath(new URL('../', import.meta.url))
export const FIXTURE_DIRECTORY = resolve(
  REPOSITORY_ROOT,
  'apps/web/public/evidence/fixtures',
)
export const FIXTURE_MANIFEST_PATH = resolve(FIXTURE_DIRECTORY, 'manifest.json')
export const CANONICAL_RESULTS_PATH = resolve(
  REPOSITORY_ROOT,
  'plans/2026-07-18-valsea-rubric-gap/reports/hard-case-results.json',
)
export const WEB_RESULTS_PATH = resolve(
  REPOSITORY_ROOT,
  'apps/web/public/evidence/hard-case-results.json',
)

const VALSEA_ENDPOINT = 'https://api.valsea.ai/v1/audio/transcriptions'
const OPENAI_ENDPOINT = 'https://api.openai.com/v1/audio/transcriptions'
const HTTP_TIMEOUT_MS = 60_000
export const MAX_PROVIDER_RESPONSE_BYTES = 256 * 1_024
export const MAX_PROVIDER_JSON_DEPTH = 8
export const MAX_PROVIDER_JSON_NODES = 2_048

type ProviderName = 'valsea' | 'whisper'
type ProviderKeys = { valsea: string; openai: string }
type FetchImplementation = typeof fetch
type WavMetadata = {
  sampleRateHz: 8_000 | 16_000
  channels: 1
  bitsPerSample: 16
  dataBytes: number
}
type LoadedFixture = {
  manifest: FixtureManifestEntry
  bytes: Buffer
  sha256: string
  wav: WavMetadata
}

class EvaluationInputError extends Error {}

if (isEntrypoint()) {
  void main().catch((error: unknown) => {
    const message = error instanceof EvaluationInputError
      ? error.message
      : 'Hard-case evaluation failed safely; no provider response details were written.'
    console.error(message)
    process.exitCode = 1
  })
}

async function main(): Promise<void> {
  const keys = readProviderKeys(process.env)
  const manifestBytes = await readRequiredFile(FIXTURE_MANIFEST_PATH, 'fixture manifest')
  const manifest = parseManifestBytes(manifestBytes)
  assertPiiFreeManifest(manifest)
  const fixtures = await loadAndVerifyFixtures(manifest)
  const fixtureManifestSha256 = sha256(manifestBytes)

  const evaluatedFixtures: EvidenceFixture[] = []
  for (const fixture of fixtures) {
    evaluatedFixtures.push(await evaluateFixture(fixture, keys, fetch))
  }

  const allSucceeded = evaluatedFixtures.every((fixture) =>
    fixture.engines.valsea.result.status === 'succeeded'
    && fixture.engines.whisper.result.status === 'succeeded')
  const results = parseEvidenceResults({
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    status: allSucceeded ? 'complete' : 'incomplete',
    statusReason: allSucceeded
      ? null
      : 'One or more provider runs failed; see the redacted engine reason codes.',
    generatedAt: new Date().toISOString(),
    fixtureManifestSha256,
    fixtures: evaluatedFixtures,
  })

  await writeArtifactCopiesAtomically(results, keys)
  console.log(
    `Hard-case evidence ${results.status}; wrote identical redacted artifacts to the canonical and web paths.`,
  )

  if (!allSucceeded) {
    throw new EvaluationInputError(
      'Hard-case evidence is incomplete because at least one provider run failed; only redacted reason codes were saved.',
    )
  }
}

function isEntrypoint(): boolean {
  return process.argv[1] !== undefined
    && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
}

export function readProviderKeys(
  environment: {
    VALSEA_API_KEY?: string | undefined
    OPENAI_API_KEY?: string | undefined
  },
): ProviderKeys {
  const valsea = environment.VALSEA_API_KEY?.trim() ?? ''
  const openai = environment.OPENAI_API_KEY?.trim() ?? ''
  const missing = [
    ...(valsea ? [] : ['VALSEA_API_KEY']),
    ...(openai ? [] : ['OPENAI_API_KEY']),
  ]

  if (missing.length > 0) {
    throw new EvaluationInputError(
      `${missing.join(' and ')} must be nonblank; load credentials from the environment, never argv.`,
    )
  }

  return { valsea, openai }
}

function parseManifestBytes(bytes: Uint8Array): FixtureManifest {
  if (bytes.byteLength > MAX_PROVIDER_RESPONSE_BYTES) {
    throw new EvaluationInputError('The fixture manifest is missing or invalid.')
  }
  try {
    return parseFixtureManifest(JSON.parse(Buffer.from(bytes).toString('utf8')))
  } catch {
    throw new EvaluationInputError('The fixture manifest is missing or invalid.')
  }
}

async function readRequiredFile(path: string, label: string): Promise<Buffer> {
  try {
    return await readFile(path)
  } catch {
    throw new EvaluationInputError(`The required ${label} could not be read.`)
  }
}

function assertPiiFreeManifest(manifest: FixtureManifest): void {
  const serialized = JSON.stringify(manifest)
  if (redactSensitiveText(serialized) !== serialized) {
    throw new EvaluationInputError('The synthetic fixture manifest appears to contain PII or a credential.')
  }
}

async function loadAndVerifyFixtures(manifest: FixtureManifest): Promise<LoadedFixture[]> {
  return Promise.all(manifest.fixtures.map(async (entry) => {
    const fixturePath = resolveFixturePath(entry.audioPath)
    const bytes = await readRequiredFile(fixturePath, `fixture for ${entry.id}`)
    const digest = sha256(bytes)
    if (digest !== entry.sha256) {
      throw new EvaluationInputError(`Fixture hash verification failed for ${entry.id}.`)
    }

    const wav = validatePcmWav(bytes)
    if (
      wav.sampleRateHz !== entry.sampleRateHz
      || wav.channels !== entry.channels
      || wav.bitsPerSample !== entry.bitsPerSample
    ) {
      throw new EvaluationInputError(`Fixture WAV metadata does not match the manifest for ${entry.id}.`)
    }

    return { manifest: entry, bytes, sha256: digest, wav }
  }))
}

export function resolveFixturePath(
  audioPath: string,
  fixtureDirectory = FIXTURE_DIRECTORY,
): string {
  const publicPrefix = '/evidence/fixtures/'
  if (!audioPath.startsWith(publicPrefix)) {
    throw new EvaluationInputError('Fixture audio paths must use the public evidence fixture prefix.')
  }

  const resolvedPath = resolve(fixtureDirectory, audioPath.slice(publicPrefix.length))
  const relativePath = relative(fixtureDirectory, resolvedPath)
  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    throw new EvaluationInputError('Fixture audio paths may not escape the fixture directory.')
  }
  return resolvedPath
}

export function validatePcmWav(bytes: Uint8Array): WavMetadata {
  if (bytes.byteLength < 12) {
    throw new EvaluationInputError('Fixture audio is not a complete RIFF/WAVE file.')
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (ascii(bytes, 0, 4) !== 'RIFF' || ascii(bytes, 8, 12) !== 'WAVE') {
    throw new EvaluationInputError('Fixture audio must use the RIFF/WAVE container.')
  }
  const riffEnd = view.getUint32(4, true) + 8
  if (riffEnd > bytes.byteLength) {
    throw new EvaluationInputError('Fixture audio has a truncated RIFF payload.')
  }

  let offset = 12
  let format: {
    audioFormat: number
    channels: number
    sampleRateHz: number
    byteRate: number
    blockAlign: number
    bitsPerSample: number
  } | undefined
  let dataBytes: number | undefined

  while (offset + 8 <= riffEnd) {
    const chunkId = ascii(bytes, offset, offset + 4)
    const chunkSize = view.getUint32(offset + 4, true)
    const chunkStart = offset + 8
    const chunkEnd = chunkStart + chunkSize
    const paddedChunkEnd = chunkEnd + (chunkSize % 2)
    if (paddedChunkEnd > riffEnd) {
      throw new EvaluationInputError('Fixture audio contains a truncated WAV chunk.')
    }

    if (chunkId === 'fmt ' && format === undefined) {
      if (chunkSize < 16) {
        throw new EvaluationInputError('Fixture audio has an incomplete fmt chunk.')
      }
      format = {
        audioFormat: view.getUint16(chunkStart, true),
        channels: view.getUint16(chunkStart + 2, true),
        sampleRateHz: view.getUint32(chunkStart + 4, true),
        byteRate: view.getUint32(chunkStart + 8, true),
        blockAlign: view.getUint16(chunkStart + 12, true),
        bitsPerSample: view.getUint16(chunkStart + 14, true),
      }
    } else if (chunkId === 'data' && dataBytes === undefined) {
      dataBytes = chunkSize
    }
    offset = paddedChunkEnd
  }

  if (!format) throw new EvaluationInputError('Fixture audio is missing its fmt chunk.')
  if (format.audioFormat !== 1) {
    throw new EvaluationInputError('Fixture audio must contain uncompressed PCM samples.')
  }
  if (format.channels !== 1) throw new EvaluationInputError('Fixture audio must be mono.')
  if (format.sampleRateHz !== 8_000 && format.sampleRateHz !== 16_000) {
    throw new EvaluationInputError('Fixture audio must use an 8 kHz or 16 kHz sample rate.')
  }
  if (format.bitsPerSample !== 16) {
    throw new EvaluationInputError('Fixture audio must contain 16-bit samples.')
  }
  const expectedBlockAlign = format.channels * (format.bitsPerSample / 8)
  const expectedByteRate = format.sampleRateHz * expectedBlockAlign
  if (format.blockAlign !== expectedBlockAlign || format.byteRate !== expectedByteRate) {
    throw new EvaluationInputError('Fixture audio has inconsistent PCM alignment metadata.')
  }
  if (dataBytes === undefined || dataBytes === 0 || dataBytes % format.blockAlign !== 0) {
    throw new EvaluationInputError('Fixture audio must contain complete, non-empty PCM samples.')
  }

  return {
    sampleRateHz: format.sampleRateHz,
    channels: 1,
    bitsPerSample: 16,
    dataBytes,
  }
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.subarray(start, end))
}

export function buildValseaRequest(bytes: Uint8Array, fixtureId: string): RequestInit {
  const form = new FormData()
  form.set('file', wavBlob(bytes), `${fixtureId}.wav`)
  form.set('model', 'valsea-transcribe')
  form.set('language', 'vietnamese')
  form.set('response_format', 'verbose_json')
  form.set('enable_correction', 'true')
  form.set('enable_tags', 'true')
  return { method: 'POST', body: form }
}

export function buildWhisperRequest(bytes: Uint8Array, fixtureId: string): RequestInit {
  const form = new FormData()
  form.set('file', wavBlob(bytes), `${fixtureId}.wav`)
  form.set('model', 'whisper-1')
  form.set('language', 'vi')
  form.set('response_format', 'json')
  return { method: 'POST', body: form }
}

function wavBlob(bytes: Uint8Array): Blob {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return new Blob([copy], { type: 'audio/wav' })
}

async function evaluateFixture(
  fixture: LoadedFixture,
  keys: ProviderKeys,
  fetchImplementation: FetchImplementation,
): Promise<EvidenceFixture> {
  const [valseaResult, whisperResult] = await Promise.all([
    evaluateProvider({
      provider: 'valsea',
      endpoint: VALSEA_ENDPOINT,
      key: keys.valsea,
      request: buildValseaRequest(fixture.bytes, fixture.manifest.id),
      fixture,
      keys,
      fetchImplementation,
    }),
    evaluateProvider({
      provider: 'whisper',
      endpoint: OPENAI_ENDPOINT,
      key: keys.openai,
      request: buildWhisperRequest(fixture.bytes, fixture.manifest.id),
      fixture,
      keys,
      fetchImplementation,
    }),
  ])

  return {
    id: fixture.manifest.id,
    label: fixture.manifest.label,
    description: fixture.manifest.description,
    category: fixture.manifest.category,
    provenance: SYNTHETIC_FIXTURE_PROVENANCE,
    groundTruth: fixture.manifest.groundTruth,
    expectedEnglishTokens: fixture.manifest.expectedEnglishTokens,
    audio: {
      path: fixture.manifest.audioPath,
      sha256: fixture.sha256,
      format: {
        container: 'wav',
        codec: 'pcm_s16le',
        sampleRateHz: fixture.wav.sampleRateHz,
        channels: fixture.wav.channels,
        bitsPerSample: fixture.wav.bitsPerSample,
      },
    },
    engines: {
      valsea: {
        provider: 'valsea',
        model: 'valsea-transcribe',
        language: 'vietnamese',
        result: valseaResult,
      },
      whisper: {
        provider: 'openai-whisper',
        model: 'whisper-1',
        language: 'vi',
        result: whisperResult,
      },
    },
  }
}

async function evaluateProvider(options: {
  provider: ProviderName
  endpoint: string
  key: string
  request: RequestInit
  fixture: LoadedFixture
  keys: ProviderKeys
  fetchImplementation: FetchImplementation
}): Promise<EvidenceFixture['engines']['valsea']['result']> {
  try {
    const response = await options.fetchImplementation(options.endpoint, {
      ...options.request,
      headers: {
        Authorization: `Bearer ${options.key}`,
        ...options.request.headers,
      },
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
    })
    if (!response.ok) {
      return failedEngineResult(options.fixture.sha256, `${options.provider}_http_${response.status}`)
    }

    const providerTranscript = await readBoundedProviderTranscript(response)
    if (!providerTranscript.ok) {
      return failedEngineResult(
        options.fixture.sha256,
        `${options.provider}_${providerTranscript.reason}`,
      )
    }
    const safeTranscript = redactSensitiveText(
      providerTranscript.transcript,
      [options.keys.valsea, options.keys.openai],
    )
    const safeTranscriptValidation = validateTranscript(safeTranscript)
    if (!safeTranscriptValidation.ok) {
      return failedEngineResult(
        options.fixture.sha256,
        `${options.provider}_${safeTranscriptValidation.reason}`,
      )
    }
    return {
      status: 'succeeded',
      inputSha256: options.fixture.sha256,
      transcript: safeTranscript,
      metrics: calculateEvidenceMetrics(
        options.fixture.manifest.groundTruth,
        safeTranscript,
        options.fixture.manifest.expectedEnglishTokens,
      ),
      error: null,
    }
  } catch (error) {
    const reason = error instanceof Error && error.name === 'TimeoutError'
      ? `${options.provider}_timeout`
      : `${options.provider}_network_error`
    return failedEngineResult(options.fixture.sha256, reason)
  }
}

function failedEngineResult(
  inputSha256: string,
  error: string,
): Extract<EvidenceFixture['engines']['valsea']['result'], { status: 'failed' }> {
  return { status: 'failed', inputSha256, transcript: null, metrics: null, error }
}

type ProviderTranscriptFailureReason =
  | 'response_too_large'
  | 'invalid_json'
  | 'invalid_response'
  | 'transcript_too_large'
  | 'transcript_too_many_tokens'

type ProviderTranscriptReadResult =
  | { ok: true; transcript: string }
  | { ok: false; reason: ProviderTranscriptFailureReason }

export async function readBoundedProviderTranscript(
  response: Response,
): Promise<ProviderTranscriptReadResult> {
  const declaredLength = response.headers.get('content-length')
  if (declaredLength !== null) {
    const parsedLength = Number(declaredLength)
    if (Number.isFinite(parsedLength) && parsedLength > MAX_PROVIDER_RESPONSE_BYTES) {
      return { ok: false, reason: 'response_too_large' }
    }
  }

  if (response.body === null) return { ok: false, reason: 'invalid_json' }
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let totalBytes = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    totalBytes += value.byteLength
    if (totalBytes > MAX_PROVIDER_RESPONSE_BYTES) {
      try {
        await reader.cancel()
      } catch {
        // The bounded failure reason is stable even if stream cancellation fails.
      }
      return { ok: false, reason: 'response_too_large' }
    }
    chunks.push(value)
  }

  const bytes = new Uint8Array(totalBytes)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }

  let payload: unknown
  try {
    payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  } catch {
    return { ok: false, reason: 'invalid_json' }
  }
  if (!isBoundedProviderJson(payload)) {
    return { ok: false, reason: 'invalid_response' }
  }
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return { ok: false, reason: 'invalid_response' }
  }
  const text = (payload as Record<string, unknown>).text
  return validateTranscript(text)
}

function validateTranscript(value: unknown): ProviderTranscriptReadResult {
  if (typeof value !== 'string' || !value.trim()) {
    return { ok: false, reason: 'invalid_response' }
  }
  if (Array.from(value).length > MAX_EVIDENCE_TEXT_CODE_POINTS) {
    return { ok: false, reason: 'transcript_too_large' }
  }
  const tokenCount = value.match(/[\p{L}\p{M}\p{N}]+(?:[-'’][\p{L}\p{M}\p{N}]+)*/gu)?.length ?? 0
  if (tokenCount > MAX_EVIDENCE_TOKENS) {
    return { ok: false, reason: 'transcript_too_many_tokens' }
  }
  return { ok: true, transcript: value }
}

function isBoundedProviderJson(value: unknown): boolean {
  const stack: Array<{ value: unknown; depth: number }> = [{ value, depth: 0 }]
  let nodeCount = 0
  while (stack.length > 0) {
    const current = stack.pop()
    if (current === undefined) return false
    nodeCount += 1
    if (nodeCount > MAX_PROVIDER_JSON_NODES || current.depth > MAX_PROVIDER_JSON_DEPTH) {
      return false
    }
    const item = current.value
    if (item === null || typeof item === 'string' || typeof item === 'boolean') continue
    if (typeof item === 'number') {
      if (!Number.isFinite(item)) return false
      continue
    }
    if (Array.isArray(item)) {
      for (const child of item) stack.push({ value: child, depth: current.depth + 1 })
      continue
    }
    if (typeof item === 'object') {
      for (const child of Object.values(item)) {
        stack.push({ value: child, depth: current.depth + 1 })
      }
      continue
    }
    return false
  }
  return true
}

export { calculateEvidenceMetrics }

export function createBlockedEvidenceResults(
  manifest: FixtureManifest,
  fixtureManifestSha256: string,
  generatedAt = new Date().toISOString(),
): EvidenceResults {
  const unrun = () => ({
    status: 'unrun' as const,
    inputSha256: null,
    transcript: null,
    metrics: null,
    error: null,
  })
  return parseEvidenceResults({
    schemaVersion: EVIDENCE_SCHEMA_VERSION,
    status: 'blocked',
    statusReason: 'Live provider evaluation has not run.',
    generatedAt,
    fixtureManifestSha256,
    fixtures: manifest.fixtures.map((fixture) => ({
      id: fixture.id,
      label: fixture.label,
      description: fixture.description,
      category: fixture.category,
      provenance: SYNTHETIC_FIXTURE_PROVENANCE,
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
          result: unrun(),
        },
        whisper: {
          provider: 'openai-whisper',
          model: 'whisper-1',
          language: 'vi',
          result: unrun(),
        },
      },
    })),
  })
}

export async function writeArtifactCopiesAtomically(
  results: EvidenceResults,
  keys: Partial<ProviderKeys> = {},
  paths = [CANONICAL_RESULTS_PATH, WEB_RESULTS_PATH] as const,
): Promise<void> {
  const validated = parseEvidenceResults(results)
  const serialized = `${JSON.stringify(validated, null, 2)}\n`
  assertArtifactSafe(serialized, [keys.valsea ?? '', keys.openai ?? ''])
  const nonce = `${process.pid}-${randomUUID()}`
  const staged = paths.map((path) => ({ path, temporaryPath: `${path}.${nonce}.tmp` }))

  try {
    await Promise.all(staged.map(async ({ path, temporaryPath }) => {
      await mkdir(dirname(path), { recursive: true })
      await writeFile(temporaryPath, serialized, { encoding: 'utf8', flag: 'wx', mode: 0o600 })
    }))
    for (const { path, temporaryPath } of staged) {
      await rename(temporaryPath, path)
    }
  } finally {
    await Promise.all(staged.map(async ({ temporaryPath }) => {
      try {
        await unlink(temporaryPath)
      } catch {
        // A successful atomic rename removes the staged path; failed cleanup is non-fatal.
      }
    }))
  }
}

function assertArtifactSafe(serialized: string, keys: string[]): void {
  for (const key of keys) {
    if (key && serialized.includes(key)) {
      throw new EvaluationInputError('Refusing to write an evidence artifact containing a provider key.')
    }
  }
  if (redactSensitiveText(serialized) !== serialized) {
    throw new EvaluationInputError('Refusing to write an evidence artifact containing PII or a credential.')
  }
}

export function redactSensitiveText(value: string, exactSecrets: string[] = []): string {
  let redacted = value
  for (const secret of exactSecrets) {
    if (secret) redacted = redacted.split(secret).join('[redacted]')
  }
  redacted = redacted.replace(/(\bBearer\s+)[^\s"'`,;<>]+/gi, '$1[redacted]')
  redacted = redacted.replace(/\bvl_[A-Za-z0-9][A-Za-z0-9._-]*/g, '[redacted]')
  redacted = redacted.replace(/\bsk-[A-Za-z0-9][A-Za-z0-9._-]*/g, '[redacted]')
  redacted = redacted.replace(
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    '[redacted]',
  )
  redacted = redacted.replace(
    /(^|[^\p{L}\p{N}])((?:\+?84|0)(?:[\s().-]*\d){8,10})(?!\d)/gu,
    (_match, prefix: string) => `${prefix}[redacted]`,
  )
  return redacted.replace(
    /(^|[^\d])(\d{3}[\s.-]\d{3}[\s.-]\d{4})(?!\d)/g,
    (_match, prefix: string) => `${prefix}[redacted]`,
  )
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

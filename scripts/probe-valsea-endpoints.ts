import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import WebSocket from 'ws'

const API_BASE = 'https://api.valsea.ai'
const REALTIME_ENDPOINT = 'wss://api.valsea.ai/v1/realtime'
const DEFAULT_REPORT_PATH = 'plans/2026-07-18-valsea-rubric-gap/reports/valsea-endpoint-probe.md'
const FIXTURE_PROVENANCE = 'synthetic-no-pii'
const REDACTED = '[redacted]'
const SAFE_RESPONSE_HEADERS = [
  'content-type',
  'x-credits-multiplier',
  'x-credits-used',
  'x-request-id',
]
const REQUIRED_PROBES = [
  'Batch transcription',
  'Semantic annotation',
  'Realtime auto-detect',
  'Realtime Vietnamese',
]
const DOCUMENTED_NOT_CALLED = [
  {
    capability: 'Clarification',
    endpoint: '/v1/clarifications',
    docs: 'https://valsea.ai/docs/api/clarify',
    reason: 'Deferred until Phase 02 needs clarification beyond annotation.',
  },
  {
    capability: 'Formatting',
    endpoint: '/v1/formatting',
    docs: 'https://valsea.ai/docs/api/format',
    reason: 'Deferred because Alove owns the booking output contract.',
  },
  {
    capability: 'Translation',
    endpoint: '/v1/translations',
    docs: 'https://valsea.ai/docs/api/translate',
    reason: 'Deferred because translation is not required for the Phase 01/02 decision.',
  },
  {
    capability: 'Realtime diarization (opt-in)',
    endpoint: '/v1/realtime with diarize=true',
    docs: 'https://valsea.ai/docs/realtime',
    reason: 'Not enabled because it is opt-in and documented as additional-credit usage.',
  },
] as const

type JsonRecord = Record<string, unknown>
type FixtureProvenance = typeof FIXTURE_PROVENANCE

type ProbeResult = {
  name: string
  endpoint: string
  transport: 'HTTP' | 'WebSocket'
  status: string
  ok: boolean
  durationMs: number
  headers?: Record<string, string> | undefined
  responseShape: unknown
  responseSample: unknown
  note?: string | undefined
}

let apiKey = ''
let audioPath = ''
let reportPath = ''

if (isEntrypoint()) {
  void main().catch((error: unknown) => {
    console.error(redactString(error instanceof Error ? error.message : 'VALSEA probe failed.', apiKey))
    process.exitCode = 1
  })
}

async function main(): Promise<void> {
  apiKey = process.env.VALSEA_API_KEY?.trim() ?? ''
  audioPath = resolve(process.argv[2] ?? process.env.VALSEA_PROBE_WAV ?? '')
  reportPath = resolve(process.env.VALSEA_PROBE_REPORT ?? DEFAULT_REPORT_PATH)

  if (!apiKey) {
    throw new Error('VALSEA_API_KEY is required. Load it from .env without placing the value in argv.')
  }

  if (!process.argv[2] && !process.env.VALSEA_PROBE_WAV) {
    throw new Error('Pass a consented WAV path as argv[2] or set VALSEA_PROBE_WAV.')
  }

  const fixtureProvenance = validateFixtureProvenance(process.env.VALSEA_PROBE_FIXTURE_PROVENANCE)

  const audioBytes = await readFile(audioPath)
  validatePcmWav(audioBytes)

  const results: ProbeResult[] = []

  results.push(await probeBatchTranscription(audioBytes))
  results.push(await probeAnnotation())
  results.push(await probeLegacyAsrPath(audioBytes))
  results.push(await probeJsonEndpoint({
    name: 'Brief path: understand',
    path: '/v1/understand',
    body: { transcript: 'Tôi muốn book hai vé từ Sài Gòn đi Đà Lạt.' },
    note: 'Path appears in the challenge brief but not in the public API reference.',
  }))
  results.push(await probeRealtime('Realtime auto-detect', { model: 'valsea-auto' }))
  results.push(await probeRealtime('Realtime Vietnamese', {
    model: 'valsea-rtt',
    language: 'vietnamese',
  }))
  results.push(await probeRealtime('Realtime language-array negative probe', {
    model: 'valsea-rtt',
    language: ['vietnamese', 'english'],
  }))

  const report = renderReport(results, fixtureProvenance, apiKey)
  await mkdir(dirname(reportPath), { recursive: true })
  await writeFile(reportPath, report, 'utf8')

  console.log(`VALSEA endpoint probe completed: ${results.filter((result) => result.ok).length}/${results.length} probes succeeded.`)
  console.log(`Redacted report: ${reportPath}`)

  const failedRequiredProbes = results.filter(
    (result) => REQUIRED_PROBES.includes(result.name) && !result.ok,
  )
  if (failedRequiredProbes.length > 0) {
    throw new Error(`Required probes failed: ${failedRequiredProbes.map((result) => result.name).join(', ')}`)
  }
}

function isEntrypoint(): boolean {
  return process.argv[1] !== undefined && resolve(process.argv[1]) === resolve(__filename)
}

export function validateFixtureProvenance(value: string | undefined): FixtureProvenance {
  if (value?.trim() !== FIXTURE_PROVENANCE) {
    throw new Error(
      `VALSEA_PROBE_FIXTURE_PROVENANCE must be exactly ${FIXTURE_PROVENANCE}; the probe will not infer or claim fixture provenance.`,
    )
  }
  return FIXTURE_PROVENANCE
}

export function validatePcmWav(bytes: Uint8Array): {
  sampleRate: 16000
  channels: 1
  bitsPerSample: 16
  dataBytes: number
} {
  if (bytes.byteLength < 12) {
    throw new Error('The probe fixture is not a complete RIFF/WAVE file.')
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (ascii(bytes, 0, 4) !== 'RIFF' || ascii(bytes, 8, 12) !== 'WAVE') {
    throw new Error('The probe fixture must use the RIFF/WAVE container.')
  }

  const riffEnd = view.getUint32(4, true) + 8
  if (riffEnd > bytes.byteLength) {
    throw new Error('The probe fixture has a truncated RIFF payload.')
  }

  let offset = 12
  let format: {
    audioFormat: number
    channels: number
    sampleRate: number
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
      throw new Error(`The probe fixture has a truncated ${chunkId || 'unknown'} chunk.`)
    }

    if (chunkId === 'fmt ' && format === undefined) {
      if (chunkSize < 16) {
        throw new Error('The probe fixture has an incomplete fmt chunk.')
      }
      format = {
        audioFormat: view.getUint16(chunkStart, true),
        channels: view.getUint16(chunkStart + 2, true),
        sampleRate: view.getUint32(chunkStart + 4, true),
        byteRate: view.getUint32(chunkStart + 8, true),
        blockAlign: view.getUint16(chunkStart + 12, true),
        bitsPerSample: view.getUint16(chunkStart + 14, true),
      }
    } else if (chunkId === 'data' && dataBytes === undefined) {
      dataBytes = chunkSize
    }

    offset = paddedChunkEnd
  }

  if (offset !== riffEnd) throw new Error('The probe fixture has an incomplete RIFF chunk table.')

  if (!format) throw new Error('The probe fixture is missing its fmt chunk.')
  if (format.audioFormat !== 1) throw new Error('The probe fixture must contain uncompressed PCM audio.')
  if (format.channels !== 1) throw new Error('The probe fixture must be mono.')
  if (format.sampleRate !== 16_000) throw new Error('The probe fixture must use a 16 kHz sample rate.')
  if (format.bitsPerSample !== 16) throw new Error('The probe fixture must use 16-bit samples.')
  if (format.blockAlign !== 2 || format.byteRate !== 32_000) {
    throw new Error('The probe fixture has inconsistent PCM alignment metadata.')
  }
  if (dataBytes === undefined || dataBytes === 0) {
    throw new Error('The probe fixture must contain a non-empty data chunk.')
  }
  if (dataBytes % format.blockAlign !== 0) {
    throw new Error('The probe fixture data chunk ends with a partial PCM sample.')
  }

  return { sampleRate: 16_000, channels: 1, bitsPerSample: 16, dataBytes }
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.subarray(start, end))
}

function webSocketCloseReason(value: unknown): string {
  if (typeof value === 'string') return value
  if (value instanceof Uint8Array) return Buffer.from(value).toString('utf8')
  return ''
}

async function probeBatchTranscription(audio: Buffer): Promise<ProbeResult> {
  const form = new FormData()
  form.set('file', new Blob([copyBytes(audio)], { type: 'audio/wav' }), 'synthetic-probe.wav')
  form.set('model', 'valsea-transcribe')
  form.set('language', 'vietnamese')
  form.set('response_format', 'verbose_json')
  form.set('enable_correction', 'true')
  form.set('enable_tags', 'true')

  return probeHttp({
    name: 'Batch transcription',
    path: '/v1/audio/transcriptions',
    init: { method: 'POST', body: form },
    note: 'Documented OpenAI-compatible batch ASR endpoint.',
  })
}

async function probeAnnotation(): Promise<ProbeResult> {
  return probeJsonEndpoint({
    name: 'Semantic annotation',
    path: '/v1/annotations',
    body: {
      model: 'valsea-annotate',
      text: 'Tôi muốn book hai vé từ Sài Gòn đi Đà Lạt, check giúp chuyến tối nay.',
      response_format: 'verbose_json',
      language: 'vietnamese',
      enable_correction: true,
      enable_tags: true,
    },
    note: 'Documented correction and semantic-tag endpoint proposed for Phase 02.',
  })
}

async function probeLegacyAsrPath(audio: Buffer): Promise<ProbeResult> {
  const form = new FormData()
  form.set('file', new Blob([copyBytes(audio)], { type: 'audio/wav' }), 'synthetic-probe.wav')
  form.set('model', 'valsea-transcribe')
  form.set('language', 'vietnamese')

  return probeHttp({
    name: 'Brief path: ASR transcribe',
    path: '/v1/asr/transcribe',
    init: { method: 'POST', body: form },
    note: 'Path appears in the challenge brief but not in the public API reference.',
  })
}

async function probeJsonEndpoint(options: {
  name: string
  path: string
  body: JsonRecord
  note?: string
}): Promise<ProbeResult> {
  return probeHttp({
    name: options.name,
    path: options.path,
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options.body),
    },
    note: options.note,
  })
}

async function probeHttp(options: {
  name: string
  path: string
  init: RequestInit
  note?: string | undefined
}): Promise<ProbeResult> {
  const startedAt = performance.now()

  try {
    const response = await fetch(`${API_BASE}${options.path}`, {
      ...options.init,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...options.init.headers,
      },
      signal: AbortSignal.timeout(30_000),
    })
    const responseBody = await readResponseBody(response)

    return {
      name: options.name,
      endpoint: options.path,
      transport: 'HTTP',
      status: redactString(`${response.status} ${response.statusText}`.trim(), apiKey),
      ok: response.ok,
      durationMs: elapsedMs(startedAt),
      headers: pickSafeHeaders(response.headers),
      responseShape: sanitizeForReport(shapeOf(responseBody), apiKey),
      responseSample: sanitizeForReport(responseBody, apiKey),
      note: options.note,
    }
  } catch (error) {
    return failedProbe(options.name, options.path, 'HTTP', startedAt, error, options.note)
  }
}

async function probeRealtime(name: string, config: JsonRecord): Promise<ProbeResult> {
  const startedAt = performance.now()

  return new Promise((resolveProbe) => {
    const events: unknown[] = []
    const socket = new WebSocket(REALTIME_ENDPOINT, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    let settled = false

    const finish = (status: string, ok: boolean, note?: string) => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'session.stop' }))
      }
      socket.close()
      resolveProbe({
        name,
        endpoint: '/v1/realtime',
        transport: 'WebSocket',
        status,
        ok,
        durationMs: elapsedMs(startedAt),
        responseShape: sanitizeForReport(shapeOf(events), apiKey),
        responseSample: sanitizeForReport(events, apiKey),
        note: note ? redactString(note, apiKey) : note,
      })
    }

    const timeout = setTimeout(() => {
      finish('timeout', false, 'No session.ready or error event arrived within 15 seconds.')
    }, 15_000)

    socket.on('open', () => {
      socket.send(JSON.stringify({ type: 'session.start', ...config }))
    })
    socket.on('message', (payload) => {
      const parsed = parseJson(String(payload))
      events.push(parsed)

      if (isRecord(parsed) && parsed.type === 'session.ready') {
        finish('session.ready', true)
      } else if (isRecord(parsed) && parsed.type === 'error') {
        finish(`error: ${redactString(stringValue(parsed.code) ?? 'unknown', apiKey)}`, false)
      }
    })
    socket.on('error', (error) => {
      const detail = error instanceof Error
        ? `WebSocket error before session.ready: ${redactString(error.message, apiKey)}`
        : 'WebSocket connection failed before a conclusive server event.'
      finish('connection error', false, detail)
    })
    socket.on('close', (code, reason) => {
      if (settled) return
      const closeCode = typeof code === 'number' ? code : 1006
      const closeReason = redactString(webSocketCloseReason(reason), apiKey)
      const detail = closeReason
        ? `WebSocket closed before session.ready: ${closeReason}`
        : 'WebSocket closed before session.ready without a reason.'
      finish(`closed: ${closeCode}`, false, detail)
    })
  })
}

async function readResponseBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  return parseJson(text)
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function pickSafeHeaders(headers: Headers): Record<string, string> {
  return Object.fromEntries(
    SAFE_RESPONSE_HEADERS.flatMap((name) => {
      const value = headers.get(name)
      return value ? [[name, value]] : []
    }),
  )
}

function failedProbe(
  name: string,
  endpoint: string,
  transport: ProbeResult['transport'],
  startedAt: number,
  error: unknown,
  note?: string,
): ProbeResult {
  return {
    name,
    endpoint,
    transport,
    status: 'client error',
    ok: false,
    durationMs: elapsedMs(startedAt),
    responseShape: 'error',
    responseSample: sanitizeForReport(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      apiKey,
    ),
    note: note ? redactString(note, apiKey) : note,
  }
}

function elapsedMs(startedAt: number): number {
  return Math.round(performance.now() - startedAt)
}

function copyBytes(bytes: Buffer): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return copy
}

function shapeOf(value: unknown, depth = 0): unknown {
  if (depth >= 4) return typeof value
  if (Array.isArray(value)) {
    return value.length === 0 ? [] : [shapeOf(value[0], depth + 1)]
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, shapeOf(child, depth + 1)]),
    )
  }
  if (value === null) return 'null'
  return typeof value
}

export function redactString(value: string, currentApiKey = ''): string {
  let redacted = currentApiKey ? value.split(currentApiKey).join(REDACTED) : value
  redacted = redacted.replace(/(\bBearer\s+)[^\s"'`,;<>]+/gi, `$1${REDACTED}`)
  redacted = redacted.replace(/([?&]api_key=)[^&#\s"'<>]+/gi, `$1${REDACTED}`)
  redacted = redacted.replace(/(\bapi_key\s*=\s*)[^&#\s"'<>]+/gi, `$1${REDACTED}`)
  redacted = redacted.replace(/\bvl_[A-Za-z0-9][A-Za-z0-9._-]*/g, REDACTED)
  redacted = redacted.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, REDACTED)
  redacted = redacted.replace(
    /\b((?:credits?\s+(?:balance|remaining)|remaining\s+credits?(?:\s+balance)?)\s*(?:(?:is|equals?)\s*)?(?:[:=]\s*)?)(?:[$€£]|USD|SGD|VND)?\s*-?\d[\d,]*(?:\.\d+)?\b/gi,
    `$1${REDACTED}`,
  )
  return redacted.replace(
    /(^|[^\w-])(\+\d(?:[\s().-]*\d){7,14}|0(?:[\s().-]*\d){8,10}|\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4})(?![\w-])/g,
    (_match, prefix: string) => `${prefix}${REDACTED}`,
  )
}

export function sanitizeForReport(value: unknown, currentApiKey = ''): unknown {
  return sanitizeValue(value, currentApiKey, 0)
}

function sanitizeValue(value: unknown, currentApiKey: string, depth: number): unknown {
  if (depth >= 5) return '[truncated]'
  if (typeof value === 'string') {
    const redacted = redactString(value, currentApiKey)
    return redacted.length > 500 ? `${redacted.slice(0, 500)}…` : redacted
  }
  if (Array.isArray(value)) {
    return value.slice(0, 8).map((child) => sanitizeValue(child, currentApiKey, depth + 1))
  }
  if (!isRecord(value)) return value

  return Object.fromEntries(
    Object.entries(value).slice(0, 40).map(([key, child]) => {
      const safeKey = redactString(key, currentApiKey)
      return [
        safeKey,
        isSensitiveKey(key) ? REDACTED : sanitizeValue(child, currentApiKey, depth + 1),
      ]
    }),
  )
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replaceAll('_', '-').replaceAll(' ', '-')
  if (normalized === 'x-credits-used') return false
  if (/api-?key|authorization|secret|token/.test(normalized)) return true
  return normalized === 'balance'
    || normalized === 'remaining'
    || /credits?.*(?:remaining|balance)|(?:remaining|balance).*credits?/.test(normalized)
}

export function renderReport(
  probes: ProbeResult[],
  fixtureProvenance: FixtureProvenance,
  currentApiKey = '',
): string {
  const timestamp = new Date().toISOString()
  const safeProbes = probes.map((probe) => ({
    ...probe,
    name: redactString(probe.name, currentApiKey),
    endpoint: redactString(probe.endpoint, currentApiKey),
    status: redactString(probe.status, currentApiKey),
    headers: sanitizeForReport(probe.headers, currentApiKey) as Record<string, string> | undefined,
    responseShape: sanitizeForReport(probe.responseShape, currentApiKey),
    responseSample: sanitizeForReport(probe.responseSample, currentApiKey),
    note: probe.note ? redactString(probe.note, currentApiKey) : probe.note,
  }))
  const tableRows = safeProbes.map((probe) =>
    `| ${escapeCell(probe.name)} | \`${probe.endpoint}\` | ${probe.status} | ${probe.durationMs} ms | ${probe.ok ? 'Dùng được' : 'Không xác nhận'} |`,
  ).join('\n')
  const details = safeProbes.map((probe) => {
    const payload = JSON.stringify({
      headers: probe.headers,
      responseShape: probe.responseShape,
      responseSample: probe.responseSample,
    }, null, 2)

    return `## ${probe.name}\n\n- Transport: ${probe.transport}\n- Endpoint: \`${probe.endpoint}\`\n- Status: ${probe.status}\n- Duration: ${probe.durationMs} ms\n${probe.note ? `- Note: ${probe.note}\n` : ''}\n\`\`\`json\n${payload}\n\`\`\``
  }).join('\n\n')
  const batch = safeProbes.find((probe) => probe.name === 'Batch transcription')
  const annotation = safeProbes.find((probe) => probe.name === 'Semantic annotation')
  const briefAsr = safeProbes.find((probe) => probe.name === 'Brief path: ASR transcribe')
  const briefUnderstand = safeProbes.find((probe) => probe.name === 'Brief path: understand')
  const realtimeAuto = safeProbes.find((probe) => probe.name === 'Realtime auto-detect')
  const realtimeVietnamese = safeProbes.find((probe) => probe.name === 'Realtime Vietnamese')
  const languageArray = safeProbes.find((probe) => probe.name === 'Realtime language-array negative probe')
  const conclusions = [
    `Batch ASR: ${probeSummary(batch)}. The current Alove build has no upload comparison route; reserve this endpoint for a future uploaded-audio workflow and keep current transcription on realtime WebSocket.`,
    `Annotation: ${probeSummary(annotation)}. Parse correction/tag fields as optional and never treat tags as validated booking data.`,
    `Brief-only REST paths: ASR ${probeSummary(briefAsr)}; understand ${probeSummary(briefUnderstand)}. Do not build adapters against undocumented 404 paths.`,
    `Realtime: auto ${probeSummary(realtimeAuto)}; Vietnamese ${probeSummary(realtimeVietnamese)}; language array ${probeSummary(languageArray)}. Simultaneous language arrays are not supported by this probe.`,
  ].map((conclusion) => `- ${conclusion}`).join('\n')
  const staticInventory = DOCUMENTED_NOT_CALLED.map((entry) =>
    `| ${entry.capability} | \`${entry.endpoint}\` | not called | [docs](${entry.docs}) | ${entry.reason} |`,
  ).join('\n')

  const report = `# VALSEA endpoint probe\n\n- Timestamp (UTC): ${timestamp}\n- Audio fixture provenance: \`${fixtureProvenance}\` (local filename intentionally omitted)\n- Authentication: credential sent only in the WebSocket/HTTP Authorization header; the value is never written to this report\n- Redaction: response capture and final rendering both remove credentials, credit balance/remaining, phone numbers, and email addresses; \`x-credits-used\` remains as usage evidence\n- Public docs checked:\n  - https://valsea.ai/docs/api/transcribe\n  - https://valsea.ai/docs/api/annotate\n  - https://valsea.ai/docs/api/clarify\n  - https://valsea.ai/docs/api/format\n  - https://valsea.ai/docs/api/translate\n  - https://valsea.ai/docs/realtime\n\n## Summary\n\n| Probe | Endpoint | Status | Latency | Decision |\n|---|---|---:|---:|---|\n${tableRows}\n\n## Documented capabilities not called\n\nThese entries are a static inventory from the public documentation, not live probe results.\n\n| Capability | Endpoint/config | Status | Documentation | Reason |\n|---|---|---|---|---|\n${staticInventory}\n\n## Implementation decisions\n\n${conclusions}\n\n${details}\n`
  return redactString(report, currentApiKey)
}

function probeSummary(probe: ProbeResult | undefined): string {
  return probe ? `${probe.status} in ${probe.durationMs} ms` : 'not run'
}

function escapeCell(value: string): string {
  return value.replaceAll('|', '\\|')
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

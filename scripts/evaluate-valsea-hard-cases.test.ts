import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseFixtureManifest } from '../apps/web/src/lib/evidence/schema.js'
import {
  MAX_PROVIDER_JSON_DEPTH,
  MAX_PROVIDER_RESPONSE_BYTES,
  buildValseaRequest,
  buildWhisperRequest,
  calculateEvidenceMetrics,
  createBlockedEvidenceResults,
  readProviderKeys,
  readBoundedProviderTranscript,
  redactSensitiveText,
  resolveFixturePath,
  validatePcmWav,
  writeArtifactCopiesAtomically,
} from './evaluate-valsea-hard-cases.js'

const HASH = 'a'.repeat(64)
const MANIFEST_HASH = 'b'.repeat(64)

function pcmWav(sampleRateHz: 8_000 | 16_000): Buffer {
  const dataBytes = 4
  const blockAlign = 2
  const wav = Buffer.alloc(44 + dataBytes)
  wav.write('RIFF', 0)
  wav.writeUInt32LE(36 + dataBytes, 4)
  wav.write('WAVE', 8)
  wav.write('fmt ', 12)
  wav.writeUInt32LE(16, 16)
  wav.writeUInt16LE(1, 20)
  wav.writeUInt16LE(1, 22)
  wav.writeUInt32LE(sampleRateHz, 24)
  wav.writeUInt32LE(sampleRateHz * blockAlign, 28)
  wav.writeUInt16LE(blockAlign, 32)
  wav.writeUInt16LE(16, 34)
  wav.write('data', 36)
  wav.writeUInt32LE(dataBytes, 40)
  return wav
}

function manifest() {
  const fixture = (
    id: string,
    category: 'tonal-vietnamese' | 'dense-vn-en-code-switch' | 'noisy-telephone-8khz',
    sampleRateHz: 8_000 | 16_000,
  ) => ({
    id,
    label: id,
    description: `Synthetic ${category}`,
    category,
    audioPath: `/evidence/fixtures/${id}.wav`,
    groundTruth: 'Tôi muốn book vé đi Đà Lạt.',
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
  })

  return parseFixtureManifest({
    schemaVersion: '1.0.0',
    provenance: 'synthetic-no-pii',
    fixtures: [
      fixture('tonal-vietnamese', 'tonal-vietnamese', 16_000),
      fixture('dense-code-switch', 'dense-vn-en-code-switch', 16_000),
      fixture('noisy-telephone-8khz', 'noisy-telephone-8khz', 8_000),
    ],
  })
}

describe('hard-case evaluator input gates', () => {
  it('fails closed before evaluation when either provider key is blank', () => {
    expect(() => readProviderKeys({ VALSEA_API_KEY: ' ', OPENAI_API_KEY: 'openai' }))
      .toThrow(/VALSEA_API_KEY must be nonblank/)
    expect(() => readProviderKeys({ VALSEA_API_KEY: 'valsea', OPENAI_API_KEY: '\n' }))
      .toThrow(/OPENAI_API_KEY must be nonblank/)
    expect(readProviderKeys({ VALSEA_API_KEY: ' valsea ', OPENAI_API_KEY: ' openai ' }))
      .toEqual({ valsea: 'valsea', openai: 'openai' })
  })

  it('accepts only PCM16 mono WAV at the declared hard-case sample rates', () => {
    expect(validatePcmWav(pcmWav(16_000))).toEqual({
      sampleRateHz: 16_000,
      channels: 1,
      bitsPerSample: 16,
      dataBytes: 4,
    })
    expect(validatePcmWav(pcmWav(8_000)).sampleRateHz).toBe(8_000)

    const stereo = pcmWav(16_000)
    stereo.writeUInt16LE(2, 22)
    expect(() => validatePcmWav(stereo)).toThrow(/mono/)
  })

  it('keeps fixture resolution inside the public fixture directory', () => {
    const fixtureDirectory = '/tmp/alove-evidence-fixtures'
    expect(resolveFixturePath('/evidence/fixtures/tonal-vietnamese.wav', fixtureDirectory))
      .toBe('/tmp/alove-evidence-fixtures/tonal-vietnamese.wav')
    expect(() => resolveFixturePath('/private/customer.wav', fixtureDirectory)).toThrow()
    expect(() => resolveFixturePath('/evidence/fixtures/../private.wav', fixtureDirectory)).toThrow()
  })

  it('caps declared and streamed provider JSON before parsing', async () => {
    const declaredOversize = new Response('{"text":"ok"}', {
      headers: { 'content-length': String(MAX_PROVIDER_RESPONSE_BYTES + 1) },
    })
    expect(await readBoundedProviderTranscript(declaredOversize)).toEqual({
      ok: false,
      reason: 'response_too_large',
    })

    const actualOversize = new Response(JSON.stringify({
      text: 'ok',
      padding: 'x'.repeat(MAX_PROVIDER_RESPONSE_BYTES),
    }))
    expect(await readBoundedProviderTranscript(actualOversize)).toEqual({
      ok: false,
      reason: 'response_too_large',
    })
  })

  it('rejects deep, empty, and transcript-over-budget provider payloads', async () => {
    let nested: unknown = 'leaf'
    for (let depth = 0; depth <= MAX_PROVIDER_JSON_DEPTH; depth += 1) {
      nested = { nested }
    }
    expect(await readBoundedProviderTranscript(new Response(JSON.stringify({
      text: 'ok',
      nested,
    })))).toEqual({ ok: false, reason: 'invalid_response' })

    expect(await readBoundedProviderTranscript(new Response('{"text":"   "}')))
      .toEqual({ ok: false, reason: 'invalid_response' })
    const boundaryTranscript = '🚌'.repeat(4_096)
    expect(await readBoundedProviderTranscript(new Response(JSON.stringify({
      text: boundaryTranscript,
    })))).toEqual({ ok: true, transcript: boundaryTranscript })
    expect(await readBoundedProviderTranscript(new Response(JSON.stringify({
      text: '🚌'.repeat(4_097),
    })))).toEqual({ ok: false, reason: 'transcript_too_large' })
    expect(await readBoundedProviderTranscript(new Response(JSON.stringify({
      text: Array.from({ length: 257 }, () => 'vé').join(' '),
    })))).toEqual({ ok: false, reason: 'transcript_too_many_tokens' })
  })
})

describe('identical provider audio and documented batch configuration', () => {
  it('sends byte-identical WAV blobs to VALSEA and Whisper with exact model/language fields', async () => {
    const bytes = pcmWav(16_000)
    const valseaBody = buildValseaRequest(bytes, 'tonal-vietnamese').body
    const whisperBody = buildWhisperRequest(bytes, 'tonal-vietnamese').body
    expect(valseaBody).toBeInstanceOf(FormData)
    expect(whisperBody).toBeInstanceOf(FormData)
    const valseaForm = valseaBody as FormData
    const whisperForm = whisperBody as FormData

    expect(valseaForm.get('model')).toBe('valsea-transcribe')
    expect(valseaForm.get('language')).toBe('vietnamese')
    expect(valseaForm.get('response_format')).toBe('verbose_json')
    expect(valseaForm.get('enable_correction')).toBe('true')
    expect(valseaForm.get('enable_tags')).toBe('true')
    expect(whisperForm.get('model')).toBe('whisper-1')
    expect(whisperForm.get('language')).toBe('vi')
    expect(whisperForm.get('response_format')).toBe('json')

    const valseaFile = valseaForm.get('file')
    const whisperFile = whisperForm.get('file')
    expect(valseaFile).toBeInstanceOf(Blob)
    expect(whisperFile).toBeInstanceOf(Blob)
    expect(Buffer.from(await (valseaFile as Blob).arrayBuffer())).toEqual(bytes)
    expect(Buffer.from(await (whisperFile as Blob).arrayBuffer())).toEqual(bytes)
  })
})

describe('deterministic, safe evidence artifacts', () => {
  it('maps deterministic metrics into the validated web artifact shape', () => {
    const first = calculateEvidenceMetrics(
      'Tôi muốn book hai vé đi Đà Lạt.',
      'Tôi muốn hai vé đi Đà Lạt.',
      ['book'],
    )
    const second = calculateEvidenceMetrics(
      'Tôi muốn book hai vé đi Đà Lạt.',
      'Tôi muốn hai vé đi Đà Lạt.',
      ['book'],
    )

    expect(first).toEqual(second)
    expect(first.wordErrorRate).toMatchObject({ value: 1 / 8, edits: 1, referenceWords: 8 })
    expect(first.englishTokenRetention).toEqual({ value: 0, retained: 0, total: 1 })
    expect(first.wordErrorRate.diff).toContainEqual({
      type: 'delete',
      reference: 'book',
      hypothesis: null,
    })
  })

  it('redacts exact keys, credentials, email, and phone-like PII', () => {
    const secret = 'opaque-provider-key'
    const output = redactSensitiveText(
      `Bearer ${secret}; sk-project-secret; vl_live_secret; person@example.com; +84 912 345 678`,
      [secret],
    )

    expect(output).not.toContain(secret)
    expect(output).not.toContain('sk-project-secret')
    expect(output).not.toContain('vl_live_secret')
    expect(output).not.toContain('person@example.com')
    expect(output).not.toContain('912 345 678')
  })

  it('writes the canonical and web-safe copies from identical validated bytes', async () => {
    const temporaryDirectory = await mkdtemp(join(tmpdir(), 'alove-evidence-'))
    const canonicalPath = join(temporaryDirectory, 'plans', 'hard-case-results.json')
    const webPath = join(temporaryDirectory, 'public', 'hard-case-results.json')
    const blocked = createBlockedEvidenceResults(
      manifest(),
      MANIFEST_HASH,
      '2026-07-18T12:00:00.000Z',
    )

    try {
      await writeArtifactCopiesAtomically(blocked, {}, [canonicalPath, webPath])
      const [canonical, web] = await Promise.all([
        readFile(canonicalPath, 'utf8'),
        readFile(webPath, 'utf8'),
      ])
      expect(canonical).toBe(web)
      expect(JSON.parse(canonical)).toMatchObject({
        status: 'blocked',
        statusReason: 'Live provider evaluation has not run.',
      })
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true })
    }
  })
})

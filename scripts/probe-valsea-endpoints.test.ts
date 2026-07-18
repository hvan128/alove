import { describe, expect, it } from 'vitest'
import {
  redactString,
  renderReport,
  sanitizeForReport,
  validateFixtureProvenance,
  validatePcmWav,
} from './probe-valsea-endpoints.js'

function pcmWav(): Buffer {
  const dataBytes = 4
  const wav = Buffer.alloc(44 + dataBytes)
  wav.write('RIFF', 0)
  wav.writeUInt32LE(36 + dataBytes, 4)
  wav.write('WAVE', 8)
  wav.write('fmt ', 12)
  wav.writeUInt32LE(16, 16)
  wav.writeUInt16LE(1, 20)
  wav.writeUInt16LE(1, 22)
  wav.writeUInt32LE(16_000, 24)
  wav.writeUInt32LE(32_000, 28)
  wav.writeUInt16LE(2, 32)
  wav.writeUInt16LE(16, 34)
  wav.write('data', 36)
  wav.writeUInt32LE(dataBytes, 40)
  return wav
}

describe('VALSEA probe report redaction', () => {
  it('redacts credentials, balances, and PII while retaining credits used', () => {
    const currentApiKey = 'opaque-current-key-123'
    const sanitized = sanitizeForReport({
      api_key: currentApiKey,
      authorization: 'Bearer bearer-secret',
      credit_remaining: 99,
      credit_balance: 101,
      balance: 202,
      'x-credits-used': '1.5',
      detail: [
        `exact=${currentApiKey}`,
        'Authorization: Bearer another-secret',
        'wss://api.valsea.ai/v1/realtime?api_key=query-secret',
        'provider key vl_live_abc123',
        'contact person@example.com or +84 912 345 678',
      ],
    }, currentApiKey) as Record<string, unknown>
    const output = JSON.stringify(sanitized)

    expect(sanitized['x-credits-used']).toBe('1.5')
    expect(output).not.toContain(currentApiKey)
    expect(output).not.toContain('bearer-secret')
    expect(output).not.toContain('another-secret')
    expect(output).not.toContain('query-secret')
    expect(output).not.toContain('vl_live_abc123')
    expect(output).not.toContain('person@example.com')
    expect(output).not.toContain('912 345 678')
    expect(output).not.toContain('101')
    expect(output).not.toContain('202')
  })

  it('sanitizes again while rendering and lists deferred endpoints as not called', () => {
    const currentApiKey = 'render-only-current-key'
    const report = renderReport([{
      name: 'Synthetic result',
      endpoint: '/v1/example',
      transport: 'HTTP',
      status: `error Bearer ${currentApiKey}`,
      ok: false,
      durationMs: 1,
      responseShape: { message: 'string' },
      responseSample: {
        timestamp: 1_784_387_557_597,
        phone: '0912 345 678',
        message: `Call person@example.com with ${currentApiKey}`,
      },
    }], 'synthetic-no-pii', currentApiKey)
    const jsonFence = /```json\n([\s\S]*?)\n```/.exec(report)?.[1]

    expect(report).not.toContain(currentApiKey)
    expect(report).not.toContain('person@example.com')
    expect(jsonFence).toBeDefined()
    expect(JSON.parse(jsonFence ?? '{}')).toMatchObject({
      responseSample: {
        timestamp: 1_784_387_557_597,
        phone: '[redacted]',
      },
    })
    expect(report).toContain('local filename intentionally omitted')
    expect(report).toContain('| Clarification | `/v1/clarifications` | not called |')
    expect(report).toContain('| Realtime diarization (opt-in) | `/v1/realtime with diarize=true` | not called |')
  })

  it('requires explicit synthetic-no-pii provenance', () => {
    expect(validateFixtureProvenance('synthetic-no-pii')).toBe('synthetic-no-pii')
    expect(() => validateFixtureProvenance(undefined)).toThrow(/must be exactly synthetic-no-pii/)
    expect(() => validateFixtureProvenance('customer-recording')).toThrow(/will not infer or claim/)
  })

  it('redacts a key-like VALSEA credential without a configured current key', () => {
    expect(redactString('failed for vl_test_secret')).toBe('failed for [redacted]')
  })

  it('does not mistake an epoch timestamp for a phone number', () => {
    expect(redactString('timestamp=1784387557597')).toBe('timestamp=1784387557597')
    expect(redactString('phones: 0912345678, +84 912 345 678, 415-555-2671'))
      .toBe('phones: [redacted], [redacted], [redacted]')
  })

  it('redacts credit balance and remaining-credit values in arbitrary strings', () => {
    expect(redactString(
      'credit balance=123.45; credits remaining: 99; remaining credits is SGD 88.5; x-credits-used=1.5',
    )).toBe(
      'credit balance=[redacted]; credits remaining: [redacted]; remaining credits is [redacted]; x-credits-used=1.5',
    )
  })
})

describe('VALSEA probe WAV validation', () => {
  it('accepts RIFF/WAVE PCM16 at 16 kHz mono with a non-empty data chunk', () => {
    expect(validatePcmWav(pcmWav())).toEqual({
      sampleRate: 16_000,
      channels: 1,
      bitsPerSample: 16,
      dataBytes: 4,
    })
  })

  it('rejects incompatible or malformed audio before a request can be sent', () => {
    const cases: Array<{ message: RegExp; mutate: (wav: Buffer) => void }> = [
      { message: /RIFF\/WAVE container/, mutate: (wav) => wav.write('RIFX', 0) },
      { message: /uncompressed PCM/, mutate: (wav) => wav.writeUInt16LE(3, 20) },
      { message: /mono/, mutate: (wav) => wav.writeUInt16LE(2, 22) },
      { message: /16 kHz/, mutate: (wav) => wav.writeUInt32LE(48_000, 24) },
      { message: /16-bit/, mutate: (wav) => wav.writeUInt16LE(24, 34) },
    ]

    for (const testCase of cases) {
      const wav = pcmWav()
      testCase.mutate(wav)
      expect(() => validatePcmWav(wav)).toThrow(testCase.message)
    }
  })

  it('rejects a RIFF/WAVE file without a data chunk', () => {
    const wav = pcmWav().subarray(0, 36)
    wav.writeUInt32LE(28, 4)
    expect(() => validatePcmWav(wav)).toThrow(/non-empty data chunk/)
  })

  it('rejects an empty data chunk', () => {
    const wav = pcmWav().subarray(0, 44)
    wav.writeUInt32LE(36, 4)
    wav.writeUInt32LE(0, 40)
    expect(() => validatePcmWav(wav)).toThrow(/non-empty data chunk/)
  })
})

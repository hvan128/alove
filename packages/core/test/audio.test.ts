import { describe, expect, it } from 'vitest'
import { decodeMuLaw, resamplePcm16 } from '../src/audio.js'

describe('telephony audio conversion', () => {
  it('decodes mu-law silence and doubles an 8kHz frame to 16kHz', () => {
    const decoded = decodeMuLaw(new Uint8Array([0xff, 0x7f, 0x00]))

    expect(decoded).toBeInstanceOf(Int16Array)
    expect(decoded).toHaveLength(3)
    expect(decoded[0]).toBe(0)
    expect(resamplePcm16(decoded, 8000, 16000)).toHaveLength(6)
  })

  it('rejects a non-positive input or output sample rate', () => {
    expect(() => resamplePcm16(new Int16Array([0]), 0, 16000)).toThrow('sample rate')
  })
})

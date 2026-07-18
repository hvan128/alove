import { describe, expect, it } from 'vitest'

import {
  calculateEnglishTokenRetention,
  calculateVietnameseToneRetention,
  calculateWordErrorRate,
  hasVietnameseToneMark,
  isEnglishToken,
  normalizeTranscript,
  tokenizeTranscript,
} from './wer'

describe('evidence transcript normalization', () => {
  it('normalizes decomposed Vietnamese to NFC before tokenizing', () => {
    const decomposed = '  To\u0302i   MUO\u0302\u0301N đi Đa\u0300 La\u0323t!  '

    expect(normalizeTranscript(decomposed)).toBe('tôi muốn đi đà lạt!')
    expect(tokenizeTranscript(decomposed)).toEqual(['tôi', 'muốn', 'đi', 'đà', 'lạt'])
  })

  it('retains Unicode words and internal English apostrophes and hyphens', () => {
    expect(tokenizeTranscript("Đặt premium-seat, Wi-Fi và driver's lounge."))
      .toEqual(['đặt', 'premium-seat', 'wi-fi', 'và', "driver's", 'lounge'])
  })
})

describe('word error rate', () => {
  it('returns the complete deterministic edit path and counts', () => {
    const result = calculateWordErrorRate(
      'tôi muốn vé xe',
      'tôi cần xe ngay',
    )

    expect(result.wer).toBe(0.75)
    expect(result.counts).toEqual({
      correct: 2,
      substitutions: 1,
      deletions: 1,
      insertions: 1,
      errors: 3,
      referenceWords: 4,
      hypothesisWords: 4,
    })
    expect(result.operations).toEqual([
      { type: 'equal', referenceToken: 'tôi', hypothesisToken: 'tôi' },
      { type: 'delete', referenceToken: 'muốn', hypothesisToken: null },
      { type: 'substitute', referenceToken: 'vé', hypothesisToken: 'cần' },
      { type: 'equal', referenceToken: 'xe', hypothesisToken: 'xe' },
      { type: 'insert', referenceToken: null, hypothesisToken: 'ngay' },
    ])
  })

  it('prefers an exact match when edit paths have equal distance', () => {
    const result = calculateWordErrorRate('a b', 'b a')

    expect(result.operations.map(({ type }) => type)).toEqual(['insert', 'equal', 'delete'])
    expect(result.counts.errors).toBe(2)
  })

  it('treats canonically equivalent Unicode tokens as equal', () => {
    const result = calculateWordErrorRate('Tôi muốn đến Huế', 'to\u0302i muo\u0302\u0301n đến Huế')

    expect(result.wer).toBe(0)
    expect(result.counts.correct).toBe(4)
  })

  it('handles empty references without NaN or Infinity', () => {
    const bothEmpty = calculateWordErrorRate('', '   ')
    const insertionsOnly = calculateWordErrorRate('', 'xin chào')

    expect(bothEmpty.wer).toBe(0)
    expect(bothEmpty.operations).toEqual([])
    expect(insertionsOnly.wer).toBe(2)
    expect(insertionsOnly.counts).toMatchObject({
      insertions: 2,
      errors: 2,
      referenceWords: 0,
      hypothesisWords: 2,
    })
    expect(insertionsOnly.operations).toEqual([
      { type: 'insert', referenceToken: null, hypothesisToken: 'xin' },
      { type: 'insert', referenceToken: null, hypothesisToken: 'chào' },
    ])
  })
})

describe('token retention', () => {
  it('measures exact English-token retention with repeated-token accounting', () => {
    const result = calculateEnglishTokenRetention(
      'Tôi cần premium-seat và Wi-Fi, AI AI AI.',
      'Tôi cần premium-seat và wifi, AI AI.',
    )

    expect(isEnglishToken('premium-seat')).toBe(true)
    expect(isEnglishToken('Huế')).toBe(false)
    expect(result).toEqual({
      rate: 0.6,
      retainedTokenCount: 3,
      referenceTokenCount: 5,
      referenceTokens: ['premium-seat', 'wi-fi', 'ai', 'ai', 'ai'],
      retainedTokens: ['premium-seat', 'ai', 'ai'],
      missingTokens: ['wi-fi', 'ai'],
    })
  })

  it('uses an explicit normalized English-token list when provided', () => {
    const result = calculateEnglishTokenRetention(
      'Xe cho bạn dùng PREMIUM-SEAT và 4G.',
      'Xe cho bạn dùng premium seat và 4g.',
      ['PREMIUM-SEAT', '4G'],
    )

    expect(result).toEqual({
      rate: 0.5,
      retainedTokenCount: 1,
      referenceTokenCount: 2,
      referenceTokens: ['premium-seat', '4g'],
      retainedTokens: ['4g'],
      missingTokens: ['premium-seat'],
    })
  })

  it('measures exact retention of tokens carrying Vietnamese tone marks', () => {
    const result = calculateVietnameseToneRetention(
      'Mã vé đến Huế là chín.',
      'Ma vé đến Huế là chin.',
    )

    expect(hasVietnameseToneMark('Huế')).toBe(true)
    expect(hasVietnameseToneMark('đi')).toBe(false)
    expect(result).toEqual({
      rate: 4 / 6,
      retainedTokenCount: 4,
      referenceTokenCount: 6,
      referenceTokens: ['mã', 'vé', 'đến', 'huế', 'là', 'chín'],
      retainedTokens: ['vé', 'đến', 'huế', 'là'],
      missingTokens: ['mã', 'chín'],
    })
  })

  it('returns not-applicable retention for an empty eligible reference', () => {
    expect(calculateEnglishTokenRetention('Huế', 'hue')).toMatchObject({
      rate: null,
      retainedTokenCount: 0,
      referenceTokenCount: 0,
    })
    expect(calculateVietnameseToneRetention('AI', 'AI')).toMatchObject({
      rate: null,
      retainedTokenCount: 0,
      referenceTokenCount: 0,
    })
  })
})

export type WordDiffOperationType = 'equal' | 'substitute' | 'delete' | 'insert'

export interface WordDiffOperation {
  type: WordDiffOperationType
  referenceToken: string | null
  hypothesisToken: string | null
}

export interface WordErrorCounts {
  correct: number
  substitutions: number
  deletions: number
  insertions: number
  errors: number
  referenceWords: number
  hypothesisWords: number
}

export interface WordErrorRateResult {
  wer: number
  referenceTokens: string[]
  hypothesisTokens: string[]
  operations: WordDiffOperation[]
  counts: WordErrorCounts
}

export interface TokenRetentionResult {
  rate: number | null
  retainedTokenCount: number
  referenceTokenCount: number
  referenceTokens: string[]
  retainedTokens: string[]
  missingTokens: string[]
}

const TOKEN_PATTERN = /[\p{L}\p{M}\p{N}]+(?:[-'’][\p{L}\p{M}\p{N}]+)*/gu
const ENGLISH_TOKEN_PATTERN = /^[a-z]+(?:[-'’][a-z]+)*$/
const VIETNAMESE_TONE_MARK_PATTERN = /[\u0300\u0301\u0303\u0309\u0323]/u

/** Normalize transcript text before tokenization and comparison. */
export function normalizeTranscript(text: string): string {
  return text
    .normalize('NFC')
    .toLocaleLowerCase('vi')
    .trim()
    .replace(/\s+/gu, ' ')
}

/** Tokenize Unicode words while retaining internal apostrophes and hyphens. */
export function tokenizeTranscript(text: string): string[] {
  return normalizeTranscript(text).match(TOKEN_PATTERN) ?? []
}

/** Identify ASCII English-like tokens in a normalized transcript. */
export function isEnglishToken(token: string): boolean {
  return ENGLISH_TOKEN_PATTERN.test(normalizeTranscript(token))
}

/** Detect a Vietnamese marked-tone diacritic on a token. */
export function hasVietnameseToneMark(token: string): boolean {
  return VIETNAMESE_TONE_MARK_PATTERN.test(normalizeTranscript(token).normalize('NFD'))
}

/**
 * Calculate deterministic word error rate and its complete edit path.
 *
 * Equal-cost paths prefer the one exposing the most exact matches, then resolve
 * remaining ties as substitution, deletion and insertion. An empty reference
 * uses a denominator of one, keeping the result finite while leaving every
 * insertion visible in both the WER and counts.
 */
export function calculateWordErrorRate(
  reference: string,
  hypothesis: string,
): WordErrorRateResult {
  const referenceTokens = tokenizeTranscript(reference)
  const hypothesisTokens = tokenizeTranscript(hypothesis)
  const rows = referenceTokens.length + 1
  const columns = hypothesisTokens.length + 1
  const distances = Array.from({ length: rows }, () => Array<number>(columns).fill(0))
  const exactMatches = Array.from({ length: rows }, () => Array<number>(columns).fill(0))
  const steps = Array.from(
    { length: rows },
    () => Array<WordDiffOperationType | null>(columns).fill(null),
  )

  for (let row = 1; row < rows; row += 1) {
    setCell(distances, row, 0, row)
    setCell(steps, row, 0, 'delete')
  }

  for (let column = 1; column < columns; column += 1) {
    setCell(distances, 0, column, column)
    setCell(steps, 0, column, 'insert')
  }

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const referenceToken = getItem(referenceTokens, row - 1)
      const hypothesisToken = getItem(hypothesisTokens, column - 1)

      if (referenceToken === hypothesisToken) {
        setCell(distances, row, column, getCell(distances, row - 1, column - 1))
        setCell(
          exactMatches,
          row,
          column,
          getCell(exactMatches, row - 1, column - 1) + 1,
        )
        setCell(steps, row, column, 'equal')
        continue
      }

      const candidates = [
        {
          type: 'substitute' as const,
          distance: getCell(distances, row - 1, column - 1) + 1,
          exactMatches: getCell(exactMatches, row - 1, column - 1),
        },
        {
          type: 'delete' as const,
          distance: getCell(distances, row - 1, column) + 1,
          exactMatches: getCell(exactMatches, row - 1, column),
        },
        {
          type: 'insert' as const,
          distance: getCell(distances, row, column - 1) + 1,
          exactMatches: getCell(exactMatches, row, column - 1),
        },
      ]
      const best = candidates.reduce((current, candidate) => {
        if (candidate.distance < current.distance) return candidate
        if (
          candidate.distance === current.distance
          && candidate.exactMatches > current.exactMatches
        ) return candidate
        return current
      })

      setCell(distances, row, column, best.distance)
      setCell(exactMatches, row, column, best.exactMatches)
      setCell(steps, row, column, best.type)
    }
  }

  const operations: WordDiffOperation[] = []
  let row = referenceTokens.length
  let column = hypothesisTokens.length

  while (row > 0 || column > 0) {
    const type = getCell(steps, row, column)

    if (type === 'equal' || type === 'substitute') {
      operations.push({
        type,
        referenceToken: getItem(referenceTokens, row - 1),
        hypothesisToken: getItem(hypothesisTokens, column - 1),
      })
      row -= 1
      column -= 1
      continue
    }

    if (type === 'delete') {
      operations.push({
        type,
        referenceToken: getItem(referenceTokens, row - 1),
        hypothesisToken: null,
      })
      row -= 1
      continue
    }

    if (type === 'insert') {
      operations.push({
        type,
        referenceToken: null,
        hypothesisToken: getItem(hypothesisTokens, column - 1),
      })
      column -= 1
      continue
    }

    throw new Error('Unable to reconstruct word error path')
  }

  operations.reverse()

  const counts = operations.reduce<WordErrorCounts>((result, operation) => {
    if (operation.type === 'equal') result.correct += 1
    if (operation.type === 'substitute') result.substitutions += 1
    if (operation.type === 'delete') result.deletions += 1
    if (operation.type === 'insert') result.insertions += 1
    return result
  }, {
    correct: 0,
    substitutions: 0,
    deletions: 0,
    insertions: 0,
    errors: 0,
    referenceWords: referenceTokens.length,
    hypothesisWords: hypothesisTokens.length,
  })

  counts.errors = counts.substitutions + counts.deletions + counts.insertions

  return {
    wer: counts.errors / Math.max(1, counts.referenceWords),
    referenceTokens,
    hypothesisTokens,
    operations,
    counts,
  }
}

/**
 * Measure exact English-token retention.
 *
 * An explicit token list takes precedence over automatic ASCII classification,
 * so fixture metadata can avoid treating unaccented Vietnamese as English.
 */
export function calculateEnglishTokenRetention(
  reference: string,
  hypothesis: string,
  expectedEnglishTokens?: readonly string[],
): TokenRetentionResult {
  const explicitReferenceTokens = expectedEnglishTokens === undefined
    ? undefined
    : expectedEnglishTokens.flatMap(tokenizeTranscript)

  return calculateTokenRetention(
    reference,
    hypothesis,
    isEnglishToken,
    explicitReferenceTokens,
  )
}

/** Measure exact retention of reference tokens carrying a Vietnamese tone mark. */
export function calculateVietnameseToneRetention(
  reference: string,
  hypothesis: string,
): TokenRetentionResult {
  return calculateTokenRetention(reference, hypothesis, hasVietnameseToneMark)
}

function calculateTokenRetention(
  reference: string,
  hypothesis: string,
  isEligible: (token: string) => boolean,
  explicitReferenceTokens?: readonly string[],
): TokenRetentionResult {
  const referenceTokens = explicitReferenceTokens === undefined
    ? tokenizeTranscript(reference).filter(isEligible)
    : [...explicitReferenceTokens]
  const remainingHypothesisTokens = countTokens(tokenizeTranscript(hypothesis))
  const retainedTokens: string[] = []
  const missingTokens: string[] = []

  for (const token of referenceTokens) {
    const remaining = remainingHypothesisTokens.get(token) ?? 0

    if (remaining > 0) {
      retainedTokens.push(token)
      remainingHypothesisTokens.set(token, remaining - 1)
    } else {
      missingTokens.push(token)
    }
  }

  return {
    rate: referenceTokens.length === 0 ? null : retainedTokens.length / referenceTokens.length,
    retainedTokenCount: retainedTokens.length,
    referenceTokenCount: referenceTokens.length,
    referenceTokens,
    retainedTokens,
    missingTokens,
  }
}

function countTokens(tokens: string[]): Map<string, number> {
  const counts = new Map<string, number>()

  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1)
  }

  return counts
}

function getCell<T>(matrix: T[][], row: number, column: number): T {
  const value = matrix[row]?.[column]
  if (value === undefined) throw new Error('Word error matrix index is out of bounds')
  return value
}

function setCell<T>(matrix: T[][], row: number, column: number, value: T): void {
  const matrixRow = matrix[row]
  if (!matrixRow) throw new Error('Word error matrix index is out of bounds')
  matrixRow[column] = value
}

function getItem<T>(items: readonly T[], index: number): T {
  const value = items[index]
  if (value === undefined) throw new Error('Word error token index is out of bounds')
  return value
}

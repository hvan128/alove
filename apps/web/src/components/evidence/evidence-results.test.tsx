import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { EvidenceResults } from '@/lib/evidence/schema'
import { EvidenceResultsView } from './evidence-results'

const completeResults: EvidenceResults = {
  schemaVersion: '1.0.0',
  status: 'complete',
  statusReason: null,
  generatedAt: '2026-07-18T16:00:00.000Z',
  fixtureManifestSha256: 'a'.repeat(64),
  fixtures: [
    {
      id: 'tonal-test',
      label: 'Thanh điệu tiếng Việt',
      description: 'Mẫu kiểm tra dấu thanh tổng hợp.',
      category: 'tonal-vietnamese',
      provenance: 'synthetic-no-pii',
      groundTruth: 'Mã vé đến Huế là chín.',
      expectedEnglishTokens: [],
      audio: {
        path: '/evidence/fixtures/tonal-test.wav',
        sha256: 'b'.repeat(64),
        format: {
          container: 'wav',
          codec: 'pcm_s16le',
          sampleRateHz: 16_000,
          channels: 1,
          bitsPerSample: 16,
        },
      },
      engines: {
        valsea: {
          provider: 'valsea',
          model: 'valsea-transcribe',
          language: 'vietnamese',
          result: {
            status: 'succeeded',
            inputSha256: 'b'.repeat(64),
            transcript: 'Ma vé đến Huế là chín.',
            metrics: {
              wordErrorRate: {
                value: 0.25,
                edits: 1,
                referenceWords: 4,
                diff: [
                  { type: 'substitute', reference: 'mã', hypothesis: 'ma' },
                  { type: 'equal', reference: 'vé', hypothesis: 'vé' },
                ],
              },
              englishTokenRetention: { value: 0.75, retained: 3, total: 4 },
              vietnameseToneRetention: { value: 0.5, retained: 1, total: 2 },
            },
            error: null,
          },
        },
        whisper: {
          provider: 'openai-whisper',
          model: 'whisper-1',
          language: 'vi',
          result: {
            status: 'succeeded',
            inputSha256: 'b'.repeat(64),
            transcript: 'Mã vé đến Huế là chín.',
            metrics: {
              wordErrorRate: {
                value: 0,
                edits: 0,
                referenceWords: 4,
                diff: [{ type: 'equal', reference: 'mã', hypothesis: 'mã' }],
              },
              englishTokenRetention: { value: null, retained: 0, total: 0 },
              vietnameseToneRetention: { value: 1, retained: 2, total: 2 },
            },
            error: null,
          },
        },
      },
    },
  ],
}

describe('EvidenceResultsView', () => {
  it('shows provenance, ground truth, comparison metrics, and visible word diffs', () => {
    render(<EvidenceResultsView results={completeResults} />)

    expect(screen.getByRole('heading', { name: 'Bằng chứng nhận dạng giọng nói' })).toBeVisible()
    expect(screen.getByText('synthetic-no-pii')).toBeVisible()
    expect(screen.getByLabelText('Nghe mẫu Thanh điệu tiếng Việt')).toHaveAttribute('src', '/evidence/fixtures/tonal-test.wav')
    const groundTruth = screen.getByRole('heading', { name: 'Ground truth' }).parentElement
    expect(groundTruth).not.toBeNull()
    expect(within(groundTruth!).getByText('Mã vé đến Huế là chín.')).toBeVisible()

    const valseaRow = screen.getByRole('row', { name: /VALSEA/u })
    expect(within(valseaRow).getByText('25%')).toBeVisible()
    expect(within(valseaRow).getByText('75%')).toBeVisible()
    expect(within(valseaRow).getByText('50%')).toBeVisible()
    const whisperRow = screen.getByRole('row', { name: /Whisper/u })
    expect(within(whisperRow).getByText('—')).toBeVisible()

    const diff = screen.getByTestId('diff-valsea')
    expect(within(diff).getByTitle('Token bị thay thế')).toHaveTextContent('mã→ma')
  })

  it('keeps blocked and unrun results visibly empty without inventing metrics', () => {
    const unrun = {
      status: 'unrun' as const,
      inputSha256: null,
      transcript: null,
      metrics: null,
      error: null,
    }
    const blockedResults: EvidenceResults = {
      ...completeResults,
      status: 'blocked',
      statusReason: 'missing_provider_credentials',
      fixtures: completeResults.fixtures.map((fixture) => ({
        ...fixture,
        engines: {
          valsea: { ...fixture.engines.valsea, result: unrun },
          whisper: { ...fixture.engines.whisper, result: unrun },
        },
      })),
    }

    render(<EvidenceResultsView results={blockedResults} />)

    expect(screen.getByText('Đánh giá bị chặn', { exact: true })).toBeVisible()
    expect(screen.getAllByText('Chưa chạy').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Lượt đánh giá chưa chạy/u)).toHaveLength(2)
    expect(screen.getByText('không chứng minh giọng vùng miền', { exact: true })).toBeVisible()
    expect(screen.queryByText('25%')).not.toBeInTheDocument()
  })
})

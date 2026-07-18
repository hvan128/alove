'use client'

import { useId, useRef, useState } from 'react'
import type { BookingDraft, CallMessage, TranscriptSegment } from '@ordervoice/contracts'
import { advanceBookingAgent, createInitialBooking } from '@ordervoice/core/bus-booking'
import { Panel } from '@/components/ui/panel'
import { TranscriptLane } from '@/components/ui/transcript-lane'
import { BookingSummary } from '@/components/bus-call/booking-summary'
import { useZaloReplay } from '@/hooks/use-zalo-replay'
import { useRecordedAudio } from '@/hooks/use-recorded-audio'
import { AudioSourcePanel } from './audio-source-panel'
import { BaselinePanel } from './baseline-panel'

export type BaselineState = 'idle' | 'loading' | 'done' | 'error'

const SCENARIO_HINT
  = 'Tôi muốn đi từ Sài Gòn tới Đà Lạt tối nay, 2 vé, tên tôi là Nguyễn Văn A, số điện thoại 0912345678. Xác nhận đặt vé giúp em.'

export function EngineWorkspace() {
  const conversationId = `engine-${useId().replace(/[^a-z0-9]/giu, '')}`
  const [file, setFile] = useState<File | null>(null)
  const [segments, setSegments] = useState<TranscriptSegment[]>([])
  const [booking, setBooking] = useState<BookingDraft>(() => createInitialBooking(conversationId))
  const [elapsedMs, setElapsedMs] = useState<number | null>(null)
  const [baselineState, setBaselineState] = useState<BaselineState>('idle')
  const [baselineText, setBaselineText] = useState<string | null>(null)
  const [baselineError, setBaselineError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  const startedAtRef = useRef<number | null>(null)
  const sequenceRef = useRef(0)
  const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL

  const replay = useZaloReplay({
    conversationId,
    ...(gatewayUrl ? { gatewayUrl } : {}),
    onStatus: setStatus,
    onTranscript: (segment) => {
      setSegments((current) => [...current, segment])
      if (segment.kind !== 'final') return
      if (startedAtRef.current !== null) setElapsedMs(new Date().getTime() - startedAtRef.current)

      sequenceRef.current += 1
      const message: CallMessage = {
        id: `engine-${String(sequenceRef.current).padStart(3, '0')}`,
        conversationId,
        role: 'customer',
        text: segment.text,
        createdAt: new Date().toISOString(),
        channel: 'voice',
        final: true,
      }
      setBooking((current) => advanceBookingAgent(current, message).draft)
    },
  })

  const recorder = useRecordedAudio()

  const reset = () => {
    setSegments([])
    setBooking(createInitialBooking(conversationId))
    setElapsedMs(null)
    setBaselineState('idle')
    setBaselineText(null)
    setBaselineError(null)
    sequenceRef.current = 0
  }

  const chooseFile = (next: File | null) => {
    reset()
    setFile(next)
    replay.selectFile(next)
  }

  const startRecording = () => void recorder.start()
  const stopRecording = async () => {
    const recorded = await recorder.stop()
    if (recorded) chooseFile(recorded)
  }

  const run = async () => {
    if (!file) return
    startedAtRef.current = new Date().getTime()
    setElapsedMs(null)
    void replay.start()
    void runBaseline(file)
  }

  const runBaseline = async (audio: File) => {
    setBaselineState('loading')
    setBaselineError(null)
    try {
      const form = new FormData()
      form.append('audio', audio, audio.name)
      const res = await fetch('/api/engine/baseline', { method: 'POST', body: form })
      const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'baseline transcription failed')
      setBaselineText(data.text ?? '')
      setBaselineState('done')
    } catch (error) {
      setBaselineState('error')
      setBaselineError(error instanceof Error ? error.message : 'Không gọi được engine đối chứng.')
    }
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-6 lg:py-8">
      <section className="mb-6">
        <p className="text-sm font-semibold text-[var(--action)]">Alove / Tổng đài nhà xe Mai Anh</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-[-0.045em] text-[var(--ink)] sm:text-[34px]">Lõi nhận diện giọng nói Alove</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
          Đưa một đoạn giọng nói tiếng Việt thật — giọng vùng miền, xen tiếng Anh, hoặc thu qua điện thoại nhiễu — vào thẳng lõi nhận diện.
          Transcript cuối cùng tự đổ vào phiếu đặt vé, không dừng lại ở văn bản thô.
        </p>
      </section>

      <Panel eyebrow="Gợi ý kịch bản" title="Câu nói ra được phiếu vé đầy đủ" className="mb-5">
        <p className="text-sm leading-6 text-[var(--muted)]">
          Bộ trích xuất hiện chỉ hiểu tuyến Sài Gòn ↔ Đà Lạt và các cụm câu kiểu dưới đây — nói tự do vẫn ra transcript thật, nhưng phiếu vé có thể thiếu trường. Để lại ~2 giây im lặng sau câu cuối (ghi âm thì đợi 2 giây rồi mới bấm dừng) để lõi giọng nói kịp chốt transcript cuối cùng.
        </p>
        <p className="mt-2 rounded-xl bg-[var(--pearl)] p-3 font-mono text-xs leading-6 text-[var(--ink)]">{SCENARIO_HINT}</p>
      </Panel>

      <AudioSourcePanel
        fileName={file?.name ?? null}
        mediaUrl={replay.url}
        mediaKey={replay.mediaKey}
        setMediaElement={replay.setMediaElement}
        replayState={replay.state}
        recorderState={recorder.state}
        elapsedMs={elapsedMs}
        status={status}
        onChooseFile={chooseFile}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        onRun={run}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel eyebrow="Lõi Alove" title="Transcript" className="lg:col-span-1">
          <div aria-live="polite" className="space-y-3">
            {segments.length === 0 ? (
              <p className="text-sm leading-6 text-[var(--muted)]">Chưa có transcript. Chọn audio rồi bấm &ldquo;Chạy nhận diện&rdquo;.</p>
            ) : segments.map((segment, index) => <TranscriptLane key={`${segment.id}-${index}`} segment={segment} />)}
          </div>
        </Panel>
        <BaselinePanel state={baselineState} text={baselineText} error={baselineError} />
      </div>

      <div className="mt-5 max-w-md">
        <BookingSummary booking={booking} />
      </div>
    </div>
  )
}

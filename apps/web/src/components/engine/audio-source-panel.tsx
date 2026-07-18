import { Mic, Play, Square, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Panel } from '@/components/ui/panel'
import type { RecordingState } from '@/hooks/use-recorded-audio'
import type { ReplayState } from '@/hooks/use-zalo-replay'

type AudioSourcePanelProps = {
  fileName: string | null
  mediaUrl: string | null
  mediaKey: number
  setMediaElement: (element: HTMLMediaElement | null) => void
  replayState: ReplayState
  recorderState: RecordingState
  elapsedMs: number | null
  status: string | null
  onChooseFile: (file: File | null) => void
  onStartRecording: () => void
  onStopRecording: () => void
  onRun: () => void
}

// Kept separate from EngineWorkspace: it owns the useZaloReplay call whose
// setMediaElement/url/mediaKey come from refs internal to that hook, and
// wiring a ref-backed <audio> element in the same component that calls the
// hook trips react-hooks/refs. Receiving them as plain props here avoids that.
export function AudioSourcePanel({
  fileName,
  mediaUrl,
  mediaKey,
  setMediaElement,
  replayState,
  recorderState,
  elapsedMs,
  status,
  onChooseFile,
  onStartRecording,
  onStopRecording,
  onRun,
}: AudioSourcePanelProps) {
  const recording = recorderState === 'recording'
  const busy = replayState === 'connecting' || replayState === 'playing'

  return (
    <Panel eyebrow="Nguồn audio" title="Tải file hoặc ghi âm trực tiếp" className="mb-5">
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-[var(--hairline)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--ink)] hover:bg-[var(--pearl)]">
          <Upload size={16} />{fileName ?? 'Chọn file audio'}
          <input aria-label="Tải file audio" className="sr-only" type="file" accept="audio/*" onChange={(event) => onChooseFile(event.target.files?.[0] ?? null)} />
        </label>
        <Button variant="secondary" leadingIcon={recording ? <Square size={16} /> : <Mic size={16} />} onClick={recording ? onStopRecording : onStartRecording}>
          {recording ? 'Dừng ghi âm' : 'Ghi âm mic'}
        </Button>
        <Button variant="primary" leadingIcon={<Play size={16} />} disabled={!fileName || busy} onClick={onRun}>
          Chạy nhận diện
        </Button>
        {elapsedMs !== null ? <span className="font-mono text-xs text-[var(--muted)]">Thời gian tới phiếu vé: {(elapsedMs / 1000).toFixed(1)}s</span> : null}
      </div>
      {fileName ? <audio key={mediaKey} ref={setMediaElement} src={mediaUrl ?? undefined} controls className="mt-3 w-full" /> : null}
      {recorderState === 'denied' ? <p className="mt-2 text-xs text-[var(--danger)]">Chưa có quyền microphone.</p> : null}
      {status ? <p className="mt-2 text-xs text-[var(--muted)]" role="status">{status}</p> : null}
    </Panel>
  )
}

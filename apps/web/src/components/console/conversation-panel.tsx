'use client'

import { AudioWaveform, CircleAlert, Mic, Play, Video } from 'lucide-react'
import type { DemoWorkspace, Source } from '@ordervoice/contracts'
import { Button } from '@/components/ui/button'
import { Callout } from './shared'
import { TranscriptLane } from '@/components/ui/transcript-lane'
import type { AudioCaptureState } from '@/hooks/use-normalized-audio-capture'
import type { ReplayMediaKind, ReplayState } from '@/hooks/use-zalo-replay'

type ConversationPanelProps = {
  workspace: DemoWorkspace
  onRunDemo: () => void
  onRunAmbiguousDemo: () => void
  onStartMic: () => void
  micState: AudioCaptureState
  replayName: string | null
  replayUrl: string | null
  replayKind: ReplayMediaKind
  replayMediaKey: number
  replayState: ReplayState
  setReplayMediaElement: (element: HTMLMediaElement | null) => void
  onReplayFile: (file: File | null) => void
  onStartReplay: () => void
  onStopReplay: () => void
}

export function ConversationPanel({ workspace, onRunDemo, onRunAmbiguousDemo, onStartMic, micState, replayName, replayUrl, replayKind, replayMediaKey, replayState, setReplayMediaElement, onReplayFile, onStartReplay, onStopReplay }: ConversationPanelProps) {
  const source = workspace.activeSource
  const isBrowser = source === 'browser'
  const isReplay = source === 'replay'

  return (
    <div className="space-y-4">
      <div className="rounded-[18px] bg-[var(--ink)] p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-[0.1em] text-white/60">Nguồn đang chọn</p><h3 className="mt-1 text-xl font-semibold tracking-[-0.03em]">{isBrowser ? 'Web gọi trực tiếp' : isReplay ? 'Zalo audio/video replay' : 'Điện thoại trực tiếp'}</h3></div>
          <AudioWaveform size={24} className="text-[#7c96ff]" />
        </div>
        <p className="mt-3 max-w-prose text-sm leading-6 text-white/70">{isBrowser ? 'Âm thanh browser đi qua gateway theo PCM16 16 kHz. Chỉ transcript cuối cùng mới sửa đơn.' : isReplay ? 'Tệp được phát đồng bộ theo thời gian. Đây là replay tệp Zalo, không phải giả lập gọi Zalo trực tiếp.' : 'Cần số Twilio, webhook đã ký và WSS public. Fixture demo kiểm tra decoder nhưng không tuyên bố có cuộc gọi PSTN thật.'}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {isBrowser ? <Button variant="secondary" className="border-white/20 bg-white text-[var(--ink)]" onClick={onStartMic} leadingIcon={<Mic size={16} />}>{micState === 'live' ? 'Mic đang mở' : micState === 'connecting' ? 'Đang kết nối gateway…' : micState === 'requesting' ? 'Đang xin quyền mic…' : 'Bật microphone'}</Button> : null}
          {isReplay ? <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-[var(--ink)]"><Video size={16} />{replayName ?? 'Chọn audio / video'}<input aria-label="Tải tệp Zalo audio hoặc video" className="sr-only" type="file" accept="audio/*,video/*" onChange={(event) => onReplayFile(event.target.files?.[0] ?? null)} /></label> : null}
          {isReplay && replayName ? <Button variant="quiet" className="text-white hover:bg-white/10" onClick={replayState === 'playing' || replayState === 'connecting' ? onStopReplay : onStartReplay} leadingIcon={<Play size={16} />}>{replayState === 'playing' || replayState === 'connecting' ? 'Dừng replay' : 'Phát & chuyển transcript'}</Button> : null}
          <Button variant="quiet" className="text-white hover:bg-white/10" onClick={onRunAmbiguousDemo} leadingIcon={<CircleAlert size={16} />}>Chạy demo ngoại lệ</Button>
          <Button variant="quiet" className="text-white hover:bg-white/10" onClick={onRunDemo} leadingIcon={<Play size={16} />}>Chạy demo đơn hàng</Button>
        </div>
      </div>

      {micState === 'denied' ? <Callout tone="warning" title="Chưa có quyền microphone">Bạn có thể bật quyền mic trong trình duyệt hoặc dùng Zalo replay / demo cục bộ.</Callout> : null}
      {isReplay ? <Callout tone="info" title="Luồng replay có provenance">{replayName ? `Đã chọn: ${replayName}. Chỉ khi người vận hành bấm phát, audio mới được chuẩn hoá và gửi gateway.` : 'Chọn một file do người vận hành có quyền sử dụng. Không upload tệp trong demo công khai.'}</Callout> : null}
      {source === 'telephony' ? <Callout tone="warning" title="Twilio chưa được provision">Cần `TWILIO_ACCOUNT_SID`, số gọi, webhook ký và gateway WSS. Xem `docs/integration-feasibility.md` trước khi test thật.</Callout> : null}

      {isReplay && replayUrl ? <div className="rounded-xl border border-[var(--hairline)] bg-[var(--pearl)] p-3">
        {replayKind === 'video' ? <video key={replayMediaKey} ref={setReplayMediaElement} data-testid="zalo-replay-media" src={replayUrl} controls playsInline className="aspect-video w-full rounded-lg bg-black" /> : <audio key={replayMediaKey} ref={setReplayMediaElement} data-testid="zalo-replay-media" src={replayUrl} controls className="w-full" />}
        <p className="mt-2 text-xs text-[var(--muted)]">{replayState === 'playing' ? 'Đang phát và chuyển PCM16 16 kHz.' : replayState === 'connecting' ? 'Đang chờ gateway ASR.' : 'Sẵn sàng phát sau xác nhận của người vận hành.'}</p>
      </div> : null}

      <div aria-live="polite" className="space-y-3">
        {workspace.transcript.length === 0 ? <div className="rounded-xl border border-dashed border-[var(--hairline)] p-5 text-sm leading-6 text-[var(--muted)]">Chưa có transcript. Chạy demo để xem một partial tạm thời và final evidence-backed.</div> : workspace.transcript.map((segment) => <TranscriptLane key={segment.id} segment={segment} />)}
      </div>
    </div>
  )
}

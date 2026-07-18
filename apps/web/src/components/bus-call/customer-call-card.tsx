import type { BookingDraft, CallMessage, CallMessageChannel, CallStatus } from '@ordervoice/contracts'
import { Microphone, PaperPlaneTilt, UserCircle } from '@phosphor-icons/react'
import type { SpeechRecognitionState } from '@/hooks/use-speech-recognition'
import { Button } from '@/components/ui/button'
import { TextInput } from '@/components/ui/input'
import { MessageTimeline } from './message-timeline'

const PRESETS = [
  { label: 'Gửi yêu cầu mẫu', text: 'Tôi muốn đi từ Sài Gòn đến Đà Lạt tối thứ Sáu, 2 vé.' },
  { label: 'Chọn chuyến 22:00', text: 'Tôi chọn chuyến 22 giờ.' },
  { label: 'Gửi thông tin hành khách', text: 'Tôi là Nguyễn Minh Anh, số điện thoại 0909123456.' },
  { label: 'Xác nhận đặt vé', text: 'Tôi xác nhận đặt vé.' },
] as const

type CustomerCallCardProps = {
  status: CallStatus
  messages: CallMessage[]
  booking: BookingDraft
  value: string
  onValueChange: (value: string) => void
  onSubmit: (text: string, channel: CallMessageChannel) => void
  recognitionState: SpeechRecognitionState
  interimText: string
  onStartMic: () => void
  onStopMic: () => void
}

export function CustomerCallCard({ status, messages, booking, value, onValueChange, onSubmit, recognitionState, interimText, onStartMic, onStopMic }: CustomerCallCardProps) {
  const connected = status === 'connected'
  const confirmed = booking.status === 'confirmed'
  const submitText = () => {
    const trimmed = value.trim()
    if (!trimmed) return
    onSubmit(trimmed, 'text')
    onValueChange('')
  }

  return (
    <section className="flex min-h-[650px] flex-col rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-4 shadow-[0_18px_60px_color-mix(in_srgb,var(--ink)_6%,transparent)] sm:p-5" aria-labelledby="customer-side-title">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--divider)] pb-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-[var(--action-soft)] text-[var(--action)]"><UserCircle size={24} weight="duotone" aria-hidden /></span>
          <div>
            <p className="text-xs font-medium text-[var(--muted)]">Phía khách hàng</p>
            <h2 id="customer-side-title" className="font-semibold text-[var(--ink)]">Nguyễn Minh Anh</h2>
          </div>
        </div>
        <span className="rounded-full bg-[var(--pearl)] px-3 py-1.5 text-xs font-medium text-[var(--muted)]">Web voice</span>
      </div>

      <div className="min-h-0 flex-1 py-3">
        <MessageTimeline messages={messages} />
      </div>

      <div className="border-t border-[var(--divider)] pt-4">
        <div className="mb-4 grid grid-cols-2 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              disabled={!connected || confirmed}
              onClick={() => onSubmit(preset.text, 'preset')}
              className="min-h-11 rounded-xl border border-[var(--hairline)] bg-[var(--pearl)] px-3 py-2 text-left text-xs font-medium leading-5 text-[var(--ink)] transition hover:border-[var(--action)] hover:bg-[var(--action-soft)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <form className="flex items-end gap-2" onSubmit={(event) => { event.preventDefault(); submitText() }}>
          <div className="min-w-0 flex-1"><TextInput label="Lời khách hàng" id="customer-message" value={value} onChange={(event) => onValueChange(event.target.value)} disabled={!connected || confirmed} placeholder="Nhập yêu cầu đặt vé..." /></div>
          <Button type="submit" aria-label="Gửi lời khách" disabled={!connected || confirmed || !value.trim()}><PaperPlaneTilt size={18} weight="fill" aria-hidden /></Button>
          <Button
            type="button"
            variant="secondary"
            aria-label={recognitionState === 'listening' ? 'Dừng mic khách hàng' : 'Bật mic khách hàng'}
            disabled={!connected || confirmed || recognitionState === 'unsupported'}
            onClick={recognitionState === 'listening' ? onStopMic : onStartMic}
            title={recognitionState === 'unsupported' ? 'Trình duyệt không hỗ trợ SpeechRecognition' : undefined}
          >
            <Microphone size={18} weight={recognitionState === 'listening' ? 'fill' : 'regular'} aria-hidden />
          </Button>
        </form>
        <p className="mt-2 text-xs leading-5 text-[var(--muted)]" role="status">
          {recognitionState === 'unsupported'
            ? 'Mic STT không có trên trình duyệt này. Câu demo và nhập text vẫn hoạt động.'
            : recognitionState === 'listening'
              ? interimText || 'Đang nghe tiếng Việt...'
              : recognitionState === 'error'
                ? 'Không thể mở mic. Kiểm tra quyền trình duyệt hoặc dùng câu demo.'
                : 'Mic tiếng Việt là tùy chọn. Câu demo luôn sẵn sàng.'}
        </p>
      </div>
    </section>
  )
}

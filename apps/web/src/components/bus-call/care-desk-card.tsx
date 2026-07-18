import type { BookingDraft, CallMessage, CallMode, CallStatus } from '@ordervoice/contracts'
import { Bot, CircleCheck, Headset, Send, Sparkles, Volume2, VolumeX } from 'lucide-react'
import { canConfirmBooking } from '@ordervoice/core/bus-booking'
import { Button } from '@/components/ui/button'
import { TextInput } from '@/components/ui/input'
import { BookingSummary } from './booking-summary'

type CareDeskCardProps = {
  mode: CallMode
  status: CallStatus
  messages: CallMessage[]
  booking: BookingDraft
  reply: string
  onReplyChange: (value: string) => void
  onSendReply: () => void
  onConfirm: () => void
  speechStatus: string | null
  onReplay: () => void
  onStopSpeech: () => void
}

export function CareDeskCard({ mode, status, messages, booking, reply, onReplyChange, onSendReply, onConfirm, speechStatus, onReplay, onStopSpeech }: CareDeskCardProps) {
  const connected = status === 'connected'
  const latestReply = [...messages].reverse().find((message) => message.role === 'agent' || message.role === 'staff')
  const confirmReady = connected && booking.status !== 'confirmed' && canConfirmBooking(booking)

  return (
    <section className="flex min-h-[650px] flex-col rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-4 shadow-[var(--shadow-panel)] sm:p-5" aria-labelledby="care-side-title">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--divider)] pb-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--success)_12%,var(--surface))] text-[var(--success)]">
            {mode === 'auto' ? <Bot size={21} aria-hidden /> : <Headset size={21} aria-hidden />}
          </span>
          <div>
            <p className="text-xs font-medium text-[var(--muted)]">Nhân viên chăm sóc</p>
            <h2 id="care-side-title" className="font-semibold text-[var(--ink)]">{mode === 'auto' ? 'Agent VéĐi đang trực' : 'Thu Hà đang tiếp quản'}</h2>
          </div>
        </div>
        <span className="rounded-full bg-[var(--pearl)] px-3 py-1.5 text-xs font-medium text-[var(--muted)]">{mode === 'auto' ? 'Auto reply' : 'Human reply'}</span>
      </div>

      <div className="mt-4">
        <BookingSummary booking={booking} />
      </div>

      <div className="mt-4 rounded-2xl border border-[var(--divider)] p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]"><Sparkles size={16} className="text-[var(--success)]" aria-hidden /> Phản hồi gần nhất</div>
        <p className="mt-2 min-h-12 text-sm leading-6 text-[var(--muted)]">{latestReply?.text ?? (mode === 'auto' ? 'Agent sẽ trả lời sau câu đầu tiên của khách.' : 'Nhân viên nhập phản hồi bên dưới.')}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button variant="quiet" onClick={onReplay} disabled={!latestReply}><Volume2 size={16} aria-hidden /> Phát lại phản hồi</Button>
          <Button variant="quiet" onClick={onStopSpeech}><VolumeX size={16} aria-hidden /> Dừng giọng</Button>
        </div>
        {speechStatus ? <p className="mt-2 text-xs text-[var(--muted)]" role="status">{speechStatus}</p> : null}
      </div>

      <div className="mt-auto border-t border-[var(--divider)] pt-4">
        <TextInput label="Phản hồi của nhân viên" id="staff-reply" value={reply} onChange={(event) => onReplyChange(event.target.value)} disabled={!connected || mode !== 'human' || booking.status === 'confirmed'} placeholder={mode === 'human' ? 'Nhập câu trả lời...' : 'Chuyển sang Nhân viên để trả lời'} />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => onReplyChange('Dạ em kiểm tra chuyến phù hợp ngay ạ.')} disabled={!connected || mode !== 'human' || booking.status === 'confirmed'}>Dùng gợi ý</Button>
          <Button onClick={onSendReply} disabled={!connected || mode !== 'human' || !reply.trim() || booking.status === 'confirmed'}><Send size={16} aria-hidden /> Gửi &amp; nói</Button>
          <Button onClick={onConfirm} disabled={!confirmReady}><CircleCheck size={17} aria-hidden /> Xác nhận thủ công</Button>
        </div>
      </div>
    </section>
  )
}

import { ChatCircleDotsIcon } from '@phosphor-icons/react/dist/icons/ChatCircleDots'
import { WaveformIcon } from '@phosphor-icons/react/dist/icons/Waveform'
import type { CallSessionState } from '@/lib/call/session-state'
import { cn } from '@/lib/cn'

type Props = Pick<CallSessionState, 'messages' | 'partial' | 'transcriptLanguage'>

export function LiveTranscript({ messages, partial, transcriptLanguage }: Props) {
  return (
    <section className="flex min-h-[560px] flex-col overflow-hidden rounded-[18px] border border-[var(--hairline)] bg-white" aria-labelledby="live-transcript-title">
      <header className="flex items-start justify-between gap-4 border-b border-[var(--divider)] px-4 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Cuộc hội thoại</p>
          <h2 id="live-transcript-title" className="mt-1 text-[17px] font-semibold tracking-[-0.025em]">Transcript trực tiếp</h2>
        </div>
        <WaveformIcon size={21} className="text-[var(--action)]" aria-hidden />
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto p-3" aria-live="polite">
        {messages.length === 0 && !partial ? (
          <div className="grid min-h-[350px] place-items-center text-center">
            <div className="max-w-[250px]">
              <ChatCircleDotsIcon size={30} className="mx-auto text-[var(--subtle)]" aria-hidden />
              <p className="mt-3 text-sm font-medium">Đang chờ người gọi</p>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">Mở link người gọi trong tab khác để bắt đầu demo.</p>
            </div>
          </div>
        ) : null}

        {messages.map((message) => {
          const display = displayTranscript(message, transcriptLanguage)
          const speaker = message.role === 'caller' ? 'Người gọi' : message.role === 'agent' ? 'Agent VéĐi' : 'Nhân viên'
          return (
            <article
              key={message.id}
              data-testid={message.role === 'agent' ? 'message-agent' : `message-${message.role}`}
              className={cn(
                'animate-transcript-arrive rounded-[14px] border p-3',
                message.role === 'caller'
                  ? 'border-[var(--hairline)] bg-white'
                  : message.role === 'agent'
                    ? 'border-[color-mix(in_srgb,var(--action)_24%,var(--hairline))] bg-[var(--action-soft)]'
                    : 'border-[var(--divider)] bg-[var(--pearl)]',
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-[var(--ink)]">{speaker}</span>
                <span className="text-[10px] uppercase tracking-[0.06em] text-[var(--muted)]">Đã chốt</span>
              </div>
              <p className="mt-2 text-[15px] leading-6 text-[var(--ink)]">{display.text}</p>
              {display.fallback ? <p className="mt-2 text-[11px] text-[var(--warning)]">Chưa có bản dịch, đang hiển thị nguyên bản.</p> : null}
              <p className="mt-2 text-[11px] text-[var(--muted)]">{channelLabel(message.channel)} · {message.confidence === null ? 'Chưa có độ tin cậy' : `${Math.round(message.confidence * 100)}%`}</p>
            </article>
          )
        })}

        {partial ? (
          <article className="rounded-[14px] border border-dashed border-[var(--action)] bg-[var(--action-soft)] p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold">Người gọi</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--action)]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--action)]" aria-hidden /> Đang nhận
              </span>
            </div>
            <p className="mt-2 text-[15px] leading-6 text-[var(--muted)]">{partial.text}</p>
            <p className="mt-2 text-[11px] text-[var(--muted)]">Nội dung tạm thời, chưa điền vào phiếu.</p>
          </article>
        ) : null}
      </div>
    </section>
  )
}

function displayTranscript(
  message: CallSessionState['messages'][number],
  language: CallSessionState['transcriptLanguage'],
): { text: string; fallback: boolean } {
  if (language === 'original') return { text: message.text, fallback: false }
  if (message.language === language) return { text: message.text, fallback: false }
  return message.translations[language]
    ? { text: message.translations[language]!, fallback: false }
    : { text: message.text, fallback: true }
}

function channelLabel(channel: CallSessionState['messages'][number]['channel']): string {
  if (channel === 'voice') return 'Giọng nói'
  if (channel === 'preset') return 'Câu mẫu'
  return 'Tin nhắn'
}

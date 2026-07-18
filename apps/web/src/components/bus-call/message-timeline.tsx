import type { CallMessage } from '@ordervoice/contracts'
import { MessageCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

const ROLE_LABEL: Record<CallMessage['role'], string> = {
  customer: 'Khách hàng',
  staff: 'Nhân viên',
  agent: 'Agent Alove',
  system: 'Hệ thống',
}

export function MessageTimeline({ messages }: { messages: CallMessage[] }) {
  if (messages.length === 0) {
    return (
      <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
        <span className="mb-4 flex size-11 items-center justify-center rounded-full bg-[var(--action-soft)] text-[var(--action)]">
          <MessageCircle size={20} aria-hidden />
        </span>
        <p className="font-medium text-[var(--ink)]">Chưa bắt đầu cuộc gọi</p>
        <p className="mt-1 max-w-64 text-sm leading-6 text-[var(--muted)]">Bắt đầu Web Call, sau đó dùng mic, nhập nội dung hoặc chọn câu demo.</p>
      </div>
    )
  }

  return (
    <ol className="flex max-h-[430px] min-h-56 flex-col gap-3 overflow-y-auto px-1 py-2" aria-label="Nội dung cuộc gọi">
      {messages.map((message) => (
        <li
          key={message.id}
          data-testid={`message-${message.role}`}
          className={cn(
            'max-w-[88%] rounded-2xl border px-4 py-3 text-sm leading-6 shadow-[var(--shadow-card)]',
            message.role === 'customer' && 'ml-auto border-[color-mix(in_srgb,var(--action)_18%,var(--hairline))] bg-[var(--action-soft)]',
            message.role === 'agent' && 'mr-auto border-[color-mix(in_srgb,var(--success)_22%,var(--hairline))] bg-[color-mix(in_srgb,var(--success)_9%,var(--surface))]',
            message.role === 'staff' && 'mr-auto border-[var(--hairline)] bg-[var(--surface)]',
            message.role === 'system' && 'mx-auto max-w-full border-transparent bg-[var(--pearl)] text-center text-xs text-[var(--muted)] shadow-none',
          )}
        >
          {message.role !== 'system' ? (
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">{ROLE_LABEL[message.role]}</p>
          ) : null}
          <p className="text-[var(--ink)]">{message.text}</p>
        </li>
      ))}
    </ol>
  )
}

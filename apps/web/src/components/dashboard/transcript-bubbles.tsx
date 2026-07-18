import { cn } from '@/lib/cn'

export type TranscriptTurn = {
  id: string | number
  role: 'customer' | 'agent'
  text: string
  createdAt?: string | Date
}

/**
 * Chat-bubble rendering shared by the stored transcript (Neon turns) and the
 * live captions (LiveKit transcriptions): customer on the right in action tint,
 * agent on the left in success tint — same language as the web-call demo.
 */
export function TranscriptBubbles({ turns, label = 'Transcript' }: { turns: TranscriptTurn[]; label?: string }) {
  return (
    <ol className="flex flex-col gap-3" aria-label={label}>
      {turns.map((turn) => (
        <li
          key={turn.id}
          className={cn(
            // Viền + nền tint đã đủ tách bong bóng khỏi surface; thêm shadow lên
            // từng lượt thì một transcript 20 lượt thành 20 khối nổi.
            'max-w-[85%] rounded-2xl border px-4 py-3 text-ui leading-6',
            turn.role === 'customer'
              ? 'ml-auto border-[color-mix(in_srgb,var(--action)_18%,var(--hairline))] bg-[var(--action-soft)]'
              : 'mr-auto border-[color-mix(in_srgb,var(--success)_22%,var(--hairline))] bg-[color-mix(in_srgb,var(--success)_9%,var(--surface))]',
          )}
        >
          <p className="mb-1 flex items-baseline gap-2 text-metric font-medium text-[var(--muted)]">
            {turn.role === 'customer' ? 'Khách' : 'Tổng đài viên AI'}
            {turn.createdAt ? (
              <time className="font-normal">
                {new Date(turn.createdAt).toLocaleTimeString('vi-VN')}
              </time>
            ) : null}
          </p>
          <p className="text-[var(--ink)]">{turn.text}</p>
        </li>
      ))}
    </ol>
  )
}

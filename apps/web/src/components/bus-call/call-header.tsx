import type { CallMode, CallStatus } from '@ordervoice/contracts'
import { Bot, Bus, Headset, PhoneCall, PhoneOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'

type CallHeaderProps = {
  status: CallStatus
  mode: CallMode
  elapsedSec: number
  onModeChange: (mode: CallMode) => void
  onStart: () => void
  onEnd: () => void
}

export function CallHeader({ status, mode, elapsedSec, onModeChange, onStart, onEnd }: CallHeaderProps) {
  const connected = status === 'connected'
  return (
    <header className="rounded-2xl border border-[var(--hairline)] bg-[color-mix(in_srgb,var(--surface)_90%,transparent)] p-4 shadow-[var(--shadow-panel)] backdrop-blur-xl sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--ink)] text-[var(--on-ink)]">
            <Bus size={22} aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-[-0.035em] text-[var(--ink)]">VéĐi Web Call</h1>
              <span className={cn(
                'rounded-full px-2.5 py-1 text-xs font-semibold',
                connected ? 'bg-[color-mix(in_srgb,var(--success)_12%,var(--surface))] text-[var(--success)]' : 'bg-[var(--pearl)] text-[var(--muted)]',
              )}>
                {connected ? 'Đang kết nối' : status === 'ended' ? 'Đã kết thúc' : 'Sẵn sàng'}
              </span>
            </div>
            <p className="mt-1 truncate text-sm text-[var(--muted)]">Demo hai phía trong cùng trình duyệt, không cần số điện thoại.</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="grid grid-cols-2 rounded-full border border-[var(--hairline)] bg-[var(--pearl)] p-1" aria-label="Chế độ trả lời">
            <button
              type="button"
              aria-pressed={mode === 'human'}
              onClick={() => onModeChange('human')}
              className={cn('inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium transition active:scale-[0.98]', mode === 'human' ? 'bg-[var(--surface)] text-[var(--ink)] shadow-sm' : 'text-[var(--muted)]')}
            >
              <Headset size={16} aria-hidden /> Nhân viên
            </button>
            <button
              type="button"
              aria-pressed={mode === 'auto'}
              onClick={() => onModeChange('auto')}
              className={cn('inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium transition active:scale-[0.98]', mode === 'auto' ? 'bg-[var(--ink)] text-[var(--on-ink)] shadow-sm' : 'text-[var(--muted)]')}
            >
              <Bot size={16} aria-hidden /> Agent tự động
            </button>
          </div>

          <span className="min-w-14 text-center font-mono text-sm tabular-nums text-[var(--muted)]">{formatTimer(elapsedSec)}</span>
          {connected ? (
            <Button variant="danger" onClick={onEnd}><PhoneOff size={17} aria-hidden /> Kết thúc</Button>
          ) : (
            <Button onClick={onStart} disabled={status === 'ended'}><PhoneCall size={17} aria-hidden /> Bắt đầu Web Call</Button>
          )}
        </div>
      </div>
    </header>
  )
}

function formatTimer(seconds: number): string {
  const minutes = String(Math.floor(seconds / 60)).padStart(2, '0')
  const rest = String(seconds % 60).padStart(2, '0')
  return `${minutes}:${rest}`
}

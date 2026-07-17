'use client'

import { FileAudioIcon, MicrophoneIcon, PhoneIcon } from '@phosphor-icons/react'
import type { Source } from '@ordervoice/contracts'
import { cn } from '@/lib/cn'
import { StatusPill } from '@/components/ui/status'

type SourceSwitcherProps = {
  activeSource: Source
  sourceStates: Record<Source, 'ready' | 'connecting' | 'live' | 'unavailable' | 'demo'>
  onSourceChange: (source: Source) => void
}

const sources: Array<{ source: Source; label: string; detail: string; icon: typeof MicrophoneIcon }> = [
  { source: 'browser', label: 'Web gọi', detail: 'Mic trực tiếp', icon: MicrophoneIcon },
  { source: 'replay', label: 'Zalo replay', detail: 'Audio/video đồng bộ', icon: FileAudioIcon },
  { source: 'telephony', label: 'Điện thoại', detail: 'Twilio Media Stream', icon: PhoneIcon },
]

const toneFor = (state: SourceSwitcherProps['sourceStates'][Source]) => {
  if (state === 'live') return 'success' as const
  if (state === 'unavailable') return 'warning' as const
  if (state === 'demo') return 'demo' as const
  if (state === 'connecting') return 'info' as const
  return 'neutral' as const
}

const textFor = (state: SourceSwitcherProps['sourceStates'][Source]) => {
  if (state === 'live') return 'Trực tiếp'
  if (state === 'unavailable') return 'Cần cấu hình'
  if (state === 'demo') return 'Demo cục bộ'
  if (state === 'connecting') return 'Đang kết nối'
  return 'Sẵn sàng'
}

export function SourceSwitcher({ activeSource, sourceStates, onSourceChange }: SourceSwitcherProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-3" role="tablist" aria-label="Nguồn âm thanh">
      {sources.map(({ source, label, detail, icon: Icon }) => {
        const selected = source === activeSource
        return (
          <button
            key={source}
            role="tab"
            aria-selected={selected}
            onClick={() => onSourceChange(source)}
            className={cn('flex min-h-20 items-start justify-between rounded-[14px] border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--action-focus)]', selected ? 'border-[var(--action)] bg-[var(--action-soft)]' : 'border-[var(--hairline)] bg-white hover:bg-[var(--pearl)]')}
          >
            <span className="flex gap-2.5"><span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', selected ? 'bg-[var(--action)] text-white' : 'bg-[var(--pearl)] text-[var(--ink)]')}><Icon size={19} /></span><span><span className="block text-sm font-semibold text-[var(--ink)]">{label}</span><span className="mt-0.5 block text-xs text-[var(--muted)]">{detail}</span></span></span>
            <StatusPill tone={toneFor(sourceStates[source])}>{textFor(sourceStates[source])}</StatusPill>
          </button>
        )
      })}
    </div>
  )
}

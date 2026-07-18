'use client'

import { CircleStop, Volume2 } from 'lucide-react'
import type { Reply } from '@ordervoice/contracts'
import { Button } from '@/components/ui/button'
import { Callout } from './shared'

type ReplyPanelProps = {
  reply: Reply
  onSpeak: () => void
  onStop: () => void
  status: string | null
}

export function ReplyPanel({ reply, onSpeak, onStop, status }: ReplyPanelProps) {
  return <div className="space-y-4"><div className="rounded-[14px] bg-[var(--pearl)] p-4"><p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Gợi ý phản hồi</p><p className="mt-3 text-sm leading-6 text-[var(--ink)]">{reply.text}</p></div><Callout tone="info" title="Giọng AI cần thao tác người">Nút này chỉ phát sau cú nhấp của người vận hành. Demo dùng giọng thiết bị và gắn nhãn rõ; VALSEA/OpenAI TTS là adapter server-side khi có key.</Callout><div className="flex flex-wrap gap-2"><Button onClick={onSpeak} disabled={!reply.approvedForSpeech} disabledReason="Cần duyệt nội dung phản hồi" leadingIcon={<Volume2 size={17} />}>Nói phản hồi</Button><Button variant="secondary" onClick={onStop} leadingIcon={<CircleStop size={17} />}>Dừng</Button></div>{status ? <p className="text-xs text-[var(--muted)]" role="status">{status}</p> : null}</div>
}

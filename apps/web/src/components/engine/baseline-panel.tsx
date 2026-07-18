import { Panel } from '@/components/ui/panel'
import { StatusPill } from '@/components/ui/status'
import type { BaselineState } from './engine-workspace'

export function BaselinePanel({ state, text, error }: { state: BaselineState; text: string | null; error: string | null }) {
  return (
    <Panel
      eyebrow="Đối chứng"
      title="ASR thường (không tinh chỉnh giọng vùng miền/tiếng Việt)"
      action={<StatusPill tone={state === 'error' ? 'danger' : state === 'done' ? 'success' : 'warning'}>{LABEL[state]}</StatusPill>}
    >
      {state === 'idle' ? (
        <p className="text-sm leading-6 text-[var(--muted)]">Chưa có audio để so sánh.</p>
      ) : state === 'loading' ? (
        <p className="text-sm leading-6 text-[var(--muted)]">Đang gửi cùng đoạn audio sang engine đối chứng…</p>
      ) : state === 'error' ? (
        <p className="text-sm leading-6 text-[var(--danger)]">{error ?? 'Không gọi được engine đối chứng.'}</p>
      ) : (
        <p className="text-sm leading-6 text-[var(--ink)]">{text || '(không nhận diện được nội dung)'}</p>
      )}
    </Panel>
  )
}

const LABEL: Record<BaselineState, string> = {
  idle: 'Chưa chạy',
  loading: 'Đang chạy',
  done: 'Xong',
  error: 'Lỗi',
}

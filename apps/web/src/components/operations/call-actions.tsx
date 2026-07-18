'use client'

import { useRouter } from 'next/navigation'
import { useState, type ReactNode } from 'react'

type CommandState = { pending: boolean; error: string | null }

const ERROR_MESSAGES: Record<string, string> = {
  CALL_ALREADY_OWNED: 'Cuộc gọi đã có người nhận.',
  CALL_NOT_OWNED: 'Cuộc gọi chưa có người nhận.',
  AGENT_ALREADY_DELEGATED: 'Agent đang giữ quyền trả lời.',
  AGENT_NOT_DELEGATED: 'Agent không giữ quyền trả lời.',
  TAKEOVER_REASON_REQUIRED: 'Cần nhập lý do thu quyền.',
  FORBIDDEN: 'Vai trò của bạn không được phép thao tác này.',
}

async function sendCommand(sessionCode: string, command: string, body?: unknown): Promise<void> {
  const response = await fetch(`/api/operations/calls/${encodeURIComponent(sessionCode)}/${command}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  if (response.ok) return
  const payload = await response.json().catch(() => ({}))
  const code = typeof payload.error === 'string' ? payload.error : 'OPERATIONS_REQUEST_FAILED'
  throw new Error(ERROR_MESSAGES[code] ?? 'Không thực hiện được thao tác.')
}

/**
 * Accepting is a claim, not a navigation. The dashboard must not open the
 * cockpit until the server confirms this operator won the session, otherwise
 * two dispatchers both believe they own the call.
 */
export function AcceptCallButton({ sessionCode }: { sessionCode: string }) {
  const router = useRouter()
  const [state, setState] = useState<CommandState>({ pending: false, error: null })

  return (
    <div className="flex flex-col items-stretch gap-1 sm:items-end">
      <button
        type="button"
        disabled={state.pending}
        aria-label={`Nhận cuộc gọi ${sessionCode}`}
        onClick={async () => {
          setState({ pending: true, error: null })
          try {
            await sendCommand(sessionCode, 'accept')
            router.push(`/staff?session=${encodeURIComponent(sessionCode)}`)
          } catch (error) {
            setState({ pending: false, error: error instanceof Error ? error.message : 'Không thực hiện được.' })
            router.refresh()
          }
        }}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[var(--ink)] px-4 text-sm font-medium text-[var(--on-ink)] transition-transform hover:-translate-y-0.5 disabled:opacity-60"
      >
        {state.pending ? 'Đang nhận…' : 'Nhận cuộc gọi'}
      </button>
      {state.error ? (
        <p role="alert" className="text-xs text-[var(--danger)]">{state.error}</p>
      ) : null}
    </div>
  )
}

export function DelegateAgentButton({
  sessionCode,
  delegated,
}: {
  sessionCode: string
  delegated: boolean
}) {
  const router = useRouter()
  const [state, setState] = useState<CommandState>({ pending: false, error: null })

  const run = async (action: () => Promise<void>) => {
    setState({ pending: true, error: null })
    try {
      await action()
      setState({ pending: false, error: null })
      router.refresh()
    } catch (error) {
      setState({ pending: false, error: error instanceof Error ? error.message : 'Không thực hiện được.' })
    }
  }

  if (delegated) {
    return (
      <TakeoverControl
        sessionCode={sessionCode}
        pending={state.pending}
        error={state.error}
        onTakeover={(reason) => run(() => sendCommand(sessionCode, 'takeover', { reason }))}
      />
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={state.pending}
        aria-label={`Trao quyền Agent cho ${sessionCode}`}
        onClick={() => run(() => sendCommand(sessionCode, 'delegate'))}
        className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--hairline)] px-4 text-sm font-medium disabled:opacity-60"
      >
        Trao quyền Agent
      </button>
      {state.error ? <p role="alert" className="text-xs text-[var(--danger)]">{state.error}</p> : null}
    </div>
  )
}

/**
 * The reason is collected before the request rather than after a failure,
 * because F-12 requires the dashboard to be able to show why authority moved.
 */
function TakeoverControl({
  sessionCode,
  pending,
  error,
  onTakeover,
}: {
  sessionCode: string
  pending: boolean
  error: string | null
  onTakeover: (reason: string) => void
}) {
  const [reason, setReason] = useState('')
  const inputId = `takeover-reason-${sessionCode}`

  return (
    <form
      className="flex flex-col gap-1"
      onSubmit={(event) => {
        event.preventDefault()
        onTakeover(reason)
      }}
    >
      <label htmlFor={inputId} className="sr-only">{`Lý do thu quyền ${sessionCode}`}</label>
      <input
        id={inputId}
        value={reason}
        required
        onChange={(event) => setReason(event.target.value)}
        placeholder="Lý do thu quyền"
        className="min-h-11 rounded-full border border-[var(--hairline)] bg-[var(--surface)] px-4 text-sm outline-none"
      />
      <button
        type="submit"
        disabled={pending}
        aria-label={`Thu quyền về nhân viên cho ${sessionCode}`}
        className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--hairline)] px-4 text-sm font-medium disabled:opacity-60"
      >
        Thu quyền về
      </button>
      {error ? <p role="alert" className="text-xs text-[var(--danger)]">{error}</p> : null}
    </form>
  )
}

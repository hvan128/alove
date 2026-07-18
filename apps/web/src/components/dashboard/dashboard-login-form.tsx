'use client'

import { useState } from 'react'
import { KeyRound, Sparkles } from 'lucide-react'

import { TextInput } from '@/components/ui/input'

const DEMO_ACCESS_KEY = 'c96bcbcd48d5f02fe50368a3a870dce8'

export function DashboardLoginForm({
  action,
  error,
}: {
  action: (formData: FormData) => void | Promise<void>
  error?: string
}) {
  const [key, setKey] = useState('')

  return (
    <form action={action} className="mt-5 flex flex-col gap-3 text-left">
      <TextInput
        label="Khóa truy cập"
        id="dashboard-key"
        name="key"
        type="password"
        autoComplete="off"
        required
        value={key}
        onChange={(event) => setKey(event.target.value)}
        {...(error ? { error } : {})}
      />
      <button
        type="button"
        onClick={() => setKey(DEMO_ACCESS_KEY)}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[var(--hairline)] bg-[var(--surface)] px-4 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--pearl)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--action-focus)] active:scale-[0.98]"
      >
        <Sparkles size={16} aria-hidden /> Điền key demo
      </button>
      <button
        type="submit"
        className="mt-1 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--action)] px-4 text-sm font-medium text-[var(--on-action)] transition hover:bg-[var(--action-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--action-focus)] active:scale-[0.98]"
      >
        <KeyRound size={16} aria-hidden /> Vào dashboard
      </button>
    </form>
  )
}

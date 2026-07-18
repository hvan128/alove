import { KeyRound } from 'lucide-react'

import { TextInput } from '@/components/ui/input'

export function DashboardLoginForm({
  action,
  error,
}: {
  action: (formData: FormData) => void | Promise<void>
  error?: string
}) {
  return (
    <form action={action} className="mt-5 flex flex-col gap-3 text-left">
      <TextInput
        label="Khóa truy cập"
        id="dashboard-key"
        name="key"
        type="password"
        autoComplete="current-password"
        required
        {...(error ? { error } : {})}
      />
      <button
        type="submit"
        className="mt-1 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--action)] px-4 text-sm font-medium text-[var(--on-action)] transition hover:bg-[var(--action-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--action-focus)] active:scale-[0.98]"
      >
        <KeyRound size={16} aria-hidden /> Vào màn hình vận hành
      </button>
    </form>
  )
}

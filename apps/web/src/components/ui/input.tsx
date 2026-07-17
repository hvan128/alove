import type { InputHTMLAttributes, SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type CommonProps = { label: string; hint?: string; error?: string }

export function TextInput({ label, hint, error, className, id, ...props }: CommonProps & InputHTMLAttributes<HTMLInputElement>) {
  const inputId = id ?? label.toLocaleLowerCase('vi-VN').replace(/\s+/gu, '-')
  return <label className="block text-sm font-medium text-[var(--ink)]" htmlFor={inputId}>
    {label}
    <input id={inputId} className={cn('mt-2 min-h-11 w-full rounded-xl border border-[var(--hairline)] bg-white px-3 text-sm outline-none transition focus:border-[var(--action)] focus:ring-2 focus:ring-[var(--action-soft)]', error && 'border-[var(--danger)]', className)} aria-invalid={Boolean(error)} {...props} />
    {error ? <span className="mt-1 block text-xs text-[var(--danger)]">{error}</span> : hint ? <span className="mt-1 block text-xs text-[var(--muted)]">{hint}</span> : null}
  </label>
}

export function SelectInput({ label, hint, error, className, id, children, ...props }: CommonProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const inputId = id ?? label.toLocaleLowerCase('vi-VN').replace(/\s+/gu, '-')
  return <label className="block text-sm font-medium text-[var(--ink)]" htmlFor={inputId}>
    {label}
    <select id={inputId} className={cn('mt-2 min-h-11 w-full rounded-xl border border-[var(--hairline)] bg-white px-3 text-sm outline-none transition focus:border-[var(--action)] focus:ring-2 focus:ring-[var(--action-soft)]', error && 'border-[var(--danger)]', className)} aria-invalid={Boolean(error)} {...props}>{children}</select>
    {error ? <span className="mt-1 block text-xs text-[var(--danger)]">{error}</span> : hint ? <span className="mt-1 block text-xs text-[var(--muted)]">{hint}</span> : null}
  </label>
}

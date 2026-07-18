import type { InputHTMLAttributes, SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type CommonProps = { label: string; hint?: string; error?: string }

export function TextInput({ label, hint, error, className, id, ...props }: CommonProps & InputHTMLAttributes<HTMLInputElement>) {
  const inputId = id ?? label.toLocaleLowerCase('vi-VN').replace(/\s+/gu, '-')
  const messageId = hint || error ? `${inputId}-message` : undefined
  const describedBy = [props['aria-describedby'], messageId].filter(Boolean).join(' ') || undefined
  return <label className="block text-sm font-medium text-[var(--ink)]" htmlFor={inputId}>
    {label}
    <input {...props} id={inputId} className={cn('mt-2 min-h-11 w-full rounded-xl border border-[var(--hairline)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--action)] focus:ring-2 focus:ring-[var(--action-soft)]', error && 'border-[var(--danger)]', className)} aria-describedby={describedBy} aria-invalid={error ? true : props['aria-invalid']} />
    {error ? <span id={messageId} className="mt-1 block text-xs text-[var(--danger)]">{error}</span> : hint ? <span id={messageId} className="mt-1 block text-xs text-[var(--muted)]">{hint}</span> : null}
  </label>
}

export function SelectInput({ label, hint, error, className, id, children, ...props }: CommonProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const inputId = id ?? label.toLocaleLowerCase('vi-VN').replace(/\s+/gu, '-')
  const messageId = hint || error ? `${inputId}-message` : undefined
  const describedBy = [props['aria-describedby'], messageId].filter(Boolean).join(' ') || undefined
  return <label className="block text-sm font-medium text-[var(--ink)]" htmlFor={inputId}>
    {label}
    <select {...props} id={inputId} className={cn('mt-2 min-h-11 w-full rounded-xl border border-[var(--hairline)] bg-[var(--surface)] px-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--action)] focus:ring-2 focus:ring-[var(--action-soft)]', error && 'border-[var(--danger)]', className)} aria-describedby={describedBy} aria-invalid={error ? true : props['aria-invalid']}>{children}</select>
    {error ? <span id={messageId} className="mt-1 block text-xs text-[var(--danger)]">{error}</span> : hint ? <span id={messageId} className="mt-1 block text-xs text-[var(--muted)]">{hint}</span> : null}
  </label>
}

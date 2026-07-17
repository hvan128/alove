import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger'

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  disabledReason?: string
  leadingIcon?: ReactNode
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-[var(--action)] text-white hover:bg-[var(--action-hover)]',
  secondary: 'border border-[var(--hairline)] bg-white text-[var(--ink)] hover:bg-[var(--pearl)]',
  quiet: 'bg-transparent text-[var(--action)] hover:bg-[var(--action-soft)]',
  danger: 'bg-[var(--danger)] text-white hover:bg-[color-mix(in_srgb,var(--danger),black_12%)]',
}

export function Button({
  className,
  variant = 'primary',
  disabledReason,
  leadingIcon,
  children,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  const reasonId = disabledReason ? `${props.id ?? 'button'}-disabled-reason` : undefined

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        className={cn(
          'inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium tracking-[-0.01em] transition duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--action-focus)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45',
          variants[variant],
          className,
        )}
        disabled={disabled}
        aria-describedby={disabled && reasonId ? reasonId : undefined}
        type={type}
        {...props}
      >
        {leadingIcon}
        {children}
      </button>
      {disabled && disabledReason ? <span id={reasonId} className="text-xs text-[var(--muted)]">{disabledReason}</span> : null}
    </span>
  )
}

export type IconButtonProps = Omit<ButtonProps, 'children'> & { label: string }

export function IconButton({ label, className, ...props }: IconButtonProps) {
  return <Button aria-label={label} className={cn('h-11 w-11 px-0', className)} {...props} />
}

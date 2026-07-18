import { CircleAlert, CircleCheck } from 'lucide-react'
import { cn } from '@/lib/cn'

type FieldEvidenceProps = {
  quote: string
  confidence: number
  className?: string
  compact?: boolean
}

export function FieldEvidence({ quote, confidence, className, compact = false }: FieldEvidenceProps) {
  const percentage = Math.round(confidence * 100)
  const lowConfidence = confidence < 0.8

  return (
    <div className={cn('rounded-xl border border-[var(--hairline)] bg-[var(--pearl)] p-3', compact && 'p-2', className)}>
      <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted)]">
        {lowConfidence ? <CircleAlert aria-hidden size={15} className="text-[var(--warning)]" /> : <CircleCheck aria-hidden size={15} className="text-[var(--success)]" />}
        <span>Dẫn chứng · {percentage}%</span>
      </div>
      <p className="mt-1 text-sm leading-5 text-[var(--ink)]">“{quote}”</p>
    </div>
  )
}

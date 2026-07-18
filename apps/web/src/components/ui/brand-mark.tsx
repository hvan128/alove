import Image from 'next/image'
import { cn } from '@/lib/cn'

/**
 * Logo Alove dùng chung ở header và dashboard.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'relative inline-flex items-center justify-center',
        className ?? 'size-7',
      )}
    >
      <Image src="/alove-logo.png" alt="" fill sizes="48px" className="object-contain" priority />
    </span>
  )
}

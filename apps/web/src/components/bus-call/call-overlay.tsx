'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from 'framer-motion'
import { PhoneCall } from 'lucide-react'
import { createInitialBusDemoWorkspace } from '@/lib/bus-demo'
import { cn } from '@/lib/cn'
import { BusCallWorkspace, type BusCallControls } from './bus-call-workspace'

// Spring ~450ms: nút CTA phình ra thành chính panel cuộc gọi, đóng thì thu về.
const MORPH_SPRING = { type: 'spring', stiffness: 260, damping: 30 } as const

// Morph chỉ nội suy khung; nếu vì lý do gì onLayoutAnimationComplete không bắn
// (reduced-motion, tab nền), cuộc gọi vẫn phải bắt đầu — mốc chặn dưới đây.
const START_FALLBACK_MS = 800

const PILL_CLASSES =
  'inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--action)] px-6 text-base font-semibold text-[var(--on-action)] transition hover:bg-[var(--action-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--action-focus)] active:scale-[0.98]'

type CallOverlayProps = {
  /** Phân biệt các vị trí CTA trên trang — mỗi vị trí một layoutId riêng để morph đúng nút vừa bấm. */
  layoutKey: string
  label?: string
  className?: string
}

/**
 * CTA "Gọi để đặt xe": bấm một chạm là nút morph thành overlay cuộc gọi và cuộc
 * gọi tự bắt đầu (xin mic sau khi overlay đã hiện). Đóng/kết thúc thì morph
 * ngược về đúng nút. Tái dùng nguyên khối BusCallWorkspace, không đụng /console.
 */
export function CallOverlay({ layoutKey, label = 'Gọi để đặt xe', className }: CallOverlayProps) {
  const [open, setOpen] = useState(false)
  const controls = useRef<BusCallControls | null>(null)
  const started = useRef(false)
  const reduceMotion = useReducedMotion()
  // reduced-motion: bỏ layoutId (không morph), thay bằng fade nhanh.
  const morphProps = reduceMotion ? {} : { layoutId: `call-cta-${layoutKey}`, transition: MORPH_SPRING }

  const startOnce = useCallback(() => {
    if (started.current) return
    started.current = true
    controls.current?.start()
  }, [])

  const close = useCallback(() => {
    controls.current?.end()
    setOpen(false)
  }, [])

  // Khoá scroll trang + ESC đóng + mốc chặn auto-start khi overlay mở.
  useEffect(() => {
    if (!open) return
    started.current = false
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    // reduced-motion không có morph để chờ — bắt đầu gọi ngay, khỏi bắt khách đợi 800ms.
    const fallback = window.setTimeout(startOnce, reduceMotion ? 0 : START_FALLBACK_MS)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
      window.clearTimeout(fallback)
    }
  }, [open, close, startOnce, reduceMotion])

  return (
    <LazyMotion features={domAnimation} strict>
      {open ? (
        // Giữ chỗ đúng kích thước để layout trang không nhảy khi pill bay đi.
        <span aria-hidden className={cn(PILL_CLASSES, 'invisible', className)}>
          <PhoneCall size={19} aria-hidden />
          {label}
        </span>
      ) : (
        <m.button
          type="button"
          style={{ borderRadius: 999 }}
          onClick={() => setOpen(true)}
          className={cn(PILL_CLASSES, className)}
          {...morphProps}
        >
          <PhoneCall size={19} aria-hidden />
          {label}
        </m.button>
      )}

      <AnimatePresence>
        {open ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-6">
            <m.div
              aria-hidden
              className="absolute inset-0 bg-[oklch(0.13_0.02_278/0.55)] backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <m.div
              role="dialog"
              aria-modal="true"
              aria-label="Cuộc gọi đặt vé nhà xe Mai Anh"
              style={{ borderRadius: 24 }}
              onLayoutAnimationComplete={startOnce}
              className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[var(--canvas)] shadow-[var(--shadow-panel)] sm:h-[min(760px,92dvh)] sm:max-w-6xl"
              {...(reduceMotion
                ? {
                    initial: { opacity: 0 },
                    animate: { opacity: 1 },
                    exit: { opacity: 0 },
                    transition: { duration: 0.15 },
                  }
                : morphProps)}
            >
              {/* Nội dung fade-in sau khi khung đáp để morph không phải nội suy cả cây CallStage. */}
              <m.div
                className="flex min-h-0 flex-1 flex-col"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.1, duration: 0.2 } }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
              >
                <BusCallWorkspace
                  initialWorkspace={createInitialBusDemoWorkspace()}
                  variant="overlay"
                  controlRef={controls}
                  onEnded={() => setOpen(false)}
                />
              </m.div>
            </m.div>
          </div>
        ) : null}
      </AnimatePresence>
    </LazyMotion>
  )
}

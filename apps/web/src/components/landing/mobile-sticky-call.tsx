'use client'

import { useEffect, useState } from 'react'
import { CallOverlay } from '@/components/bus-call/call-overlay'

export function MobileStickyCall() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const update = () => setVisible(window.scrollY > Math.min(window.innerHeight * 0.72, 620))
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-3 bottom-3 z-30 rounded-2xl border border-white/70 bg-white/88 p-2 shadow-[var(--shadow-pop)] backdrop-blur-xl transition duration-300 lg:hidden ${visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'}`}
    >
      <CallOverlay layoutKey="sticky" className="w-full" />
    </div>
  )
}

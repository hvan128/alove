'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Server components render the freshest Neon state; this just re-requests them
// on an interval so the dashboard tracks live calls without a websocket.
export function AutoRefresh({ seconds = 5 }: { seconds?: number }) {
  const router = useRouter()
  useEffect(() => {
    const timer = setInterval(() => router.refresh(), seconds * 1000)
    return () => clearInterval(timer)
  }, [router, seconds])
  return null
}

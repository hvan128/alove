import type { Metadata } from 'next'

import { VerifyBooking } from '@/components/booking/verify-booking'
import { AppShell } from '@/components/ui/app-shell'

export const metadata: Metadata = {
  title: 'Xác minh vé | Alove',
  description: 'Xác minh vé Alove bằng mã vé và số điện thoại đã dùng khi đặt.',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
}

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string | string[] }>
}) {
  const query = await searchParams
  const initialCode = typeof query.code === 'string' ? query.code : ''
  return <AppShell><VerifyBooking initialCode={initialCode} /></AppShell>
}

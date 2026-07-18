import type { Metadata } from 'next'
import { CallerWorkspace } from '@/components/call/caller-workspace'
import { getPublicIntegrationStatus, normalizeSessionCode } from '@/lib/livekit/server'

export const metadata: Metadata = {
  title: 'Gọi đặt vé | VéĐi',
  description: 'Trang gọi đặt vé đơn giản cho khách hàng trên điện thoại.',
}

export default async function CallPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string | string[] }>
}) {
  const params = await searchParams
  const raw = Array.isArray(params.session) ? params.session[0] : params.session
  let sessionCode = 'DEMO42'
  try {
    if (raw) sessionCode = normalizeSessionCode(raw)
  } catch {
    sessionCode = 'DEMO42'
  }
  return <CallerWorkspace sessionCode={sessionCode} integrationStatus={getPublicIntegrationStatus()} />
}

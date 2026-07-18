import type { Metadata } from 'next'
import { StaffWorkspace } from '@/components/staff/staff-workspace'
import { getPublicIntegrationStatus, normalizeSessionCode } from '@/lib/livekit/server'
import { getOperatorActor } from '@/lib/auth/operator-actor'

export const metadata: Metadata = {
  title: 'Bàn hỗ trợ đặt vé | VéĐi',
  description: 'Transcript trực tiếp, gợi ý trả lời và phiếu đặt xe tự điền cho nhân viên.',
}

export default async function StaffPage({
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
  let actorRole
  try {
    actorRole = getOperatorActor(process.env).role
  } catch {
    actorRole = undefined
  }
  return <StaffWorkspace sessionCode={sessionCode} integrationStatus={getPublicIntegrationStatus()} actorRole={actorRole} />
}

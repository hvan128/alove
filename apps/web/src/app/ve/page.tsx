import type { Metadata } from 'next'
import { TicketLookup } from '@/components/ticket/ticket-lookup'
import { AppShell } from '@/components/ui/app-shell'

export const metadata: Metadata = {
  title: 'Vé của bạn | Alove',
  description: 'Tra cứu và lưu lại vé xe khách đã đặt qua tổng đài Alove.',
  // Ticket pages carry passenger names; keeping them out of search results is
  // free and removes a whole class of accidental exposure.
  robots: { index: false, follow: false },
}

export default async function TicketPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string | string[] }>
}) {
  const params = await searchParams
  const raw = Array.isArray(params.code) ? params.code[0] : params.code

  return (
    <AppShell>
      <main className="mx-auto max-w-[1180px] px-4 py-12 sm:px-6 sm:py-16">
        <TicketLookup initialCode={raw?.trim().toUpperCase() ?? ''} />
      </main>
    </AppShell>
  )
}

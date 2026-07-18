import { OperationsAccessUnavailable, OperationsShell } from '@/components/operations/operations-shell'
import { OperationsReport } from '@/components/operations/operations-report'
import { getOperatorActor } from '@/lib/auth/operator-actor'
import { createOperationsRepository } from '@/lib/operations/operations-repository'
import type { OperatorActor } from '@ordervoice/contracts'
import type { OperationsReportData, OperationsRepository } from '@/lib/operations/operations-repository'

export const dynamic = 'force-dynamic'

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  let result: { actor: OperatorActor; repository: OperationsRepository; report: OperationsReportData } | null = null
  let unavailable: 'auth' | 'range' | null = null
  try {
    const actor = getOperatorActor(process.env)
    const params = await searchParams
    const now = new Date()
    const to = parseDateParam(params.to, now, true)
    const fromDefault = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1_000)
    const from = parseDateParam(params.from, fromDefault, false)
    const repository = createOperationsRepository()
    const report = await repository.getReport({ from: from.toISOString(), to: to.toISOString() })
    result = { actor, repository, report }
  } catch (error) {
    if (error instanceof Error && error.message === 'OPERATOR_AUTH_UNCONFIGURED') unavailable = 'auth'
    else if (error instanceof Error && ['INVALID_REPORT_RANGE', 'REPORT_RANGE_TOO_LARGE'].includes(error.message)) unavailable = 'range'
    else throw error
  }
  if (unavailable === 'auth') return <OperationsAccessUnavailable />
  if (unavailable === 'range') return <ReportRangeUnavailable />
  if (!result) throw new Error('REPORT_RESULT_UNAVAILABLE')
  return <OperationsShell actor={result.actor} mode={result.repository.mode}><OperationsReport report={result.report} /></OperationsShell>
}

function parseDateParam(value: string | undefined, fallback: Date, endOfDay: boolean): Date {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return fallback
  return new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}+07:00`)
}

function ReportRangeUnavailable() {
  return <main className="grid min-h-screen place-items-center bg-[var(--canvas)] p-6 text-center"><div><p className="text-sm font-medium text-[var(--danger)]">Khoảng báo cáo không hợp lệ</p><h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Chọn tối đa 90 ngày</h1><p className="mt-3 text-[var(--muted)]">Ngày bắt đầu phải trước ngày kết thúc.</p></div></main>
}

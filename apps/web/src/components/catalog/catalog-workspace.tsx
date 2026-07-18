'use client'

import type { CatalogDraft, CatalogValidationIssue, CatalogVersion, OperatorRole } from '@ordervoice/contracts'
import { validateCatalogDraft } from '@ordervoice/core'
import { CheckCircleIcon, FloppyDiskIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { CatalogImportDialog } from './catalog-import-dialog'
import { CatalogTable } from './catalog-table'
import { CatalogVersionBar } from './catalog-version-bar'
import type { CatalogTab } from './types'

const tabs: Array<{ id: CatalogTab; label: string }> = [
  { id: 'locations', label: 'Chi nhánh & điểm' },
  { id: 'routes', label: 'Tuyến' },
  { id: 'schedules', label: 'Lịch chạy' },
  { id: 'trips', label: 'Chuyến' },
  { id: 'vehicles', label: 'Xe' },
  { id: 'seatClasses', label: 'Loại ghế' },
  { id: 'fares', label: 'Giá' },
]

export function CatalogWorkspace({ initial, actorRole }: { initial: CatalogVersion; actorRole: OperatorRole }) {
  const [catalog, setCatalog] = useState(initial)
  const [tab, setTab] = useState<CatalogTab>('routes')
  const [serverIssues, setServerIssues] = useState<CatalogValidationIssue[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirmPublish, setConfirmPublish] = useState(false)
  const issues = useMemo(() => [...validateCatalogDraft(toDraft(catalog)), ...serverIssues], [catalog, serverIssues])
  const blockingIssues = uniqueIssues(issues.filter((issue) => issue.blocking))
  const canEdit = actorRole === 'admin' || actorRole === 'dispatcher'
  const canPublish = actorRole === 'admin' && catalog.status === 'validated' && blockingIssues.length === 0

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setMessage(null)
    try {
      await action()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể cập nhật catalog.')
    } finally {
      setBusy(false)
    }
  }

  async function validate() {
    await run(async () => {
      const response = await fetch(`/api/catalog/versions/${catalog.id}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedRevision: catalog.revision }),
      })
      const body = await response.json() as { version?: CatalogVersion; issues?: CatalogValidationIssue[]; error?: string }
      if (!response.ok || !body.version) throw new Error(readError(response.status, body.error))
      setCatalog(body.version)
      setServerIssues(body.issues ?? [])
      setMessage(body.issues?.some((issue) => issue.blocking) ? 'Catalog còn lỗi blocking.' : 'Validated')
    })
  }

  async function save() {
    await run(async () => {
      const response = await fetch(`/api/catalog/versions/${catalog.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedRevision: catalog.revision, catalog: toDraft(catalog) }),
      })
      const body = await response.json() as { version?: CatalogVersion; error?: string }
      if (!response.ok || !body.version) throw new Error(readError(response.status, body.error))
      setCatalog(body.version)
      setServerIssues([])
      setMessage('Đã lưu draft.')
    })
  }

  async function publish() {
    await run(async () => {
      const response = await fetch(`/api/catalog/versions/${catalog.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedRevision: catalog.revision }),
      })
      const body = await response.json() as { version?: CatalogVersion; error?: string }
      if (!response.ok || !body.version) throw new Error(readError(response.status, body.error))
      setCatalog(body.version)
      setConfirmPublish(false)
      setMessage('Published')
    })
  }

  async function applyCsv(csv: string) {
    await run(async () => {
      const response = await fetch('/api/catalog/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId: catalog.id, expectedRevision: catalog.revision, csv, apply: true }),
      })
      const body = await response.json() as { version?: CatalogVersion; error?: string }
      if (!response.ok || !body.version) throw new Error(readError(response.status, body.error))
      setCatalog(body.version)
      setMessage('Đã áp dụng CSV vào draft.')
    })
  }

  return (
    <div className="mx-auto max-w-[1240px]">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-sm font-medium text-[var(--action)]">Catalog nhà xe</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Tuyến, chuyến và giá vé</h1>
          <p className="mt-3 text-[var(--muted)]">Chuẩn bị draft, kiểm tra tham chiếu rồi publish có chủ đích.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={!canEdit || busy || catalog.status === 'published' || catalog.status === 'retired'} onClick={() => void save()} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--hairline)] bg-[var(--surface)] px-4 text-sm font-medium disabled:opacity-40"><FloppyDiskIcon size={17} aria-hidden />Lưu draft</button>
          <button type="button" disabled={!canEdit || busy || catalog.status === 'published' || catalog.status === 'retired'} onClick={() => void validate()} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--hairline)] bg-[var(--surface)] px-4 text-sm font-medium disabled:opacity-40"><CheckCircleIcon size={17} aria-hidden />Validate</button>
          <button type="button" disabled={!canPublish || busy} onClick={() => setConfirmPublish(true)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--ink)] px-5 text-sm font-medium text-[var(--on-ink)] disabled:opacity-40"><FloppyDiskIcon size={17} aria-hidden />Publish</button>
        </div>
      </header>

      <div className="mt-6"><CatalogVersionBar version={catalog.version} revision={catalog.revision} status={catalog.status} issueCount={blockingIssues.length} /></div>

      {message ? <p role="status" className="mt-4 rounded-2xl bg-[var(--action-soft)] px-4 py-3 text-sm text-[var(--action)]">{message}</p> : null}
      {blockingIssues.length > 0 ? (
        <section aria-label="Lỗi catalog" className="mt-5 rounded-3xl border border-[var(--danger)]/20 bg-[var(--danger-soft)] p-5 text-[var(--danger)]">
          <h2 className="flex items-center gap-2 font-semibold"><WarningCircleIcon size={19} aria-hidden />Cần xử lý trước khi publish</h2>
          <ul className="mt-3 space-y-2 text-sm">{blockingIssues.map((issue) => <li key={`${issue.code}-${issue.path}`}>{issue.message}<span className="ml-2 text-xs opacity-70">{issue.path}</span></li>)}</ul>
        </section>
      ) : null}

      <section className="mt-6 rounded-3xl border border-[var(--hairline)] bg-[var(--surface)] p-4 shadow-[var(--metric-shadow)] sm:p-6">
        <div role="tablist" aria-label="Nhóm dữ liệu catalog" className="flex gap-1 overflow-x-auto pb-2">
          {tabs.map((item) => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} onClick={() => setTab(item.id)} className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-medium ${tab === item.id ? 'bg-[var(--ink)] text-[var(--on-ink)]' : 'text-[var(--muted)] hover:bg-[var(--pearl)]'}`}>{item.label}</button>)}
        </div>
        <div role="tabpanel" className="mt-3"><CatalogTable catalog={catalog} tab={tab} readOnly={!canEdit || catalog.status === 'published' || catalog.status === 'retired'} onChange={(next) => { setCatalog({ ...next, status: next.status === 'validated' ? 'draft' : next.status }); setServerIssues([]) }} /></div>
      </section>

      <div className="mt-6"><CatalogImportDialog draft={toDraft(catalog)} onApply={applyCsv} /></div>

      {confirmPublish ? (
        <div role="dialog" aria-modal="true" aria-labelledby="publish-title" className="fixed inset-0 z-50 grid place-items-center bg-[color-mix(in_srgb,var(--ink)_38%,transparent)] p-5 backdrop-blur-sm">
          <section className="w-full max-w-md rounded-3xl bg-[var(--surface)] p-6 shadow-[var(--metric-shadow)]">
            <h2 id="publish-title" className="text-2xl font-semibold tracking-[-0.04em]">Publish catalog v{catalog.version}?</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--muted)]">Phiên bản sẽ có hiệu lực từ {new Date(catalog.effectiveFrom).toLocaleString('vi-VN')}.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmPublish(false)} className="min-h-11 rounded-full px-4 text-sm font-medium">Hủy</button>
              <button type="button" onClick={() => void publish()} className="min-h-11 rounded-full bg-[var(--ink)] px-5 text-sm font-medium text-[var(--on-ink)]">Xác nhận publish</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  )
}

function toDraft(version: CatalogVersion): CatalogDraft {
  const { publishedAt: _publishedAt, publishedBy: _publishedBy, ...body } = structuredClone(version)
  return { ...body, status: body.status === 'validated' ? 'validated' : 'draft' }
}

function uniqueIssues(issues: CatalogValidationIssue[]): CatalogValidationIssue[] {
  return [...new Map(issues.map((issue) => [`${issue.code}:${issue.path}`, issue])).values()]
}

function readError(status: number, code?: string): string {
  if (status === 409) return 'Catalog đã đổi; tải lại diff. Nội dung đang nhập vẫn được giữ.'
  return code ?? 'Không thể cập nhật catalog.'
}

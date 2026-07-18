'use client'

import type { CatalogDraft } from '@ordervoice/contracts'
import { UploadSimpleIcon } from '@phosphor-icons/react'
import { useState } from 'react'
import { csvKinds, dryRunCatalogCsv, type CatalogCsvDryRun } from '@/lib/catalog/catalog-csv'

export function CatalogImportDialog({ draft, onApply }: { draft: CatalogDraft; onApply: (csv: string) => Promise<void> }) {
  const [csv, setCsv] = useState('')
  const [preview, setPreview] = useState<CatalogCsvDryRun | null>(null)
  const [busy, setBusy] = useState(false)

  async function readFile(file: File | undefined) {
    if (!file) return
    const text = await readFileText(file)
    setCsv(text)
    setPreview(dryRunCatalogCsv(text, draft))
  }

  async function apply() {
    setBusy(true)
    try {
      await onApply(csv)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-labelledby="csv-import-title" className="rounded-3xl border border-dashed border-[var(--hairline)] bg-[var(--pearl)] p-5">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--action-soft)] text-[var(--action)]"><UploadSimpleIcon size={20} aria-hidden /></span>
        <div>
          <h3 id="csv-import-title" className="font-semibold">Nhập dữ liệu CSV</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">Chỉ preview trước. Chỉ ghi vào draft, không bao giờ tự publish.</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Cột <code>kind</code> nhận: {csvKinds.join(', ')}.
          </p>
        </div>
      </div>
      <label className="mt-4 flex min-h-11 cursor-pointer items-center justify-center rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] px-4 text-sm font-medium">
        Nhập CSV
        <input className="sr-only" type="file" accept=".csv,text/csv" aria-label="Nhập CSV" onChange={(event) => void readFile(event.target.files?.[0])} />
      </label>
      {preview ? (
        <div className="mt-4" aria-live="polite">
          <p className="text-sm font-medium">{preview.validRows} dòng hợp lệ · {preview.invalidRows} dòng lỗi</p>
          <ul className="mt-2 space-y-2 text-xs text-[var(--danger)]">
            {preview.rows.filter((row) => row.errors.length > 0).map((row) => (
              <li key={row.row}>
                <span className="font-medium">Dòng {row.row}</span>
                <span className="text-[var(--muted)]"> · {row.kind}{row.id ? ` · ${row.id}` : ''}</span>
                <span className="block">{row.errors.join(', ')}</span>
              </li>
            ))}
          </ul>
          <button type="button" disabled={preview.invalidRows > 0 || preview.validRows === 0 || busy} onClick={() => void apply()} className="mt-4 min-h-11 rounded-full bg-[var(--ink)] px-4 text-sm font-medium text-[var(--on-ink)] disabled:cursor-not-allowed disabled:opacity-40">
            {busy ? 'Đang áp dụng…' : 'Áp dụng dòng hợp lệ'}
          </button>
        </div>
      ) : null}
    </section>
  )
}

function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

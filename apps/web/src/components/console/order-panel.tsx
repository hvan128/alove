'use client'

import { useState } from 'react'
import { CheckCircleIcon, ExportIcon, PencilSimpleIcon } from '@phosphor-icons/react'
import type { OrderDraft } from '@ordervoice/contracts'
import { Button } from '@/components/ui/button'
import { FieldEvidence } from '@/components/ui/field-evidence'
import { StatusPill } from '@/components/ui/status'
import { Callout } from './shared'

const productOptions = [
  { sku: 'CF-ARABICA-1KG', label: 'Arabica Premium' },
  { sku: 'OM-OAT-1L', label: 'Oat Milk 1L' },
  { sku: 'CF-HOUSE-BLEND', label: 'House Blend' },
  { sku: 'CF-HOUSE-DECAF', label: 'House Decaf' },
  { sku: 'SYR-VAN-750', label: 'Vanilla Syrup 750ml' },
] as const

type EditingLine = {
  lineId: string
  originalLabel: string
  sku: string
  quantity: string
  unit: string
}

type DemoLineCorrection = {
  lineId: string
  sku: string
  productLabel: string
  quantity: number
  unit: string
}

type OrderPanelProps = {
  draft: OrderDraft
  onCorrect: (correction: DemoLineCorrection) => void
  onApprove: () => void
  onExport: () => void
}

export function OrderPanel({ draft, onCorrect, onApprove, onExport }: OrderPanelProps) {
  const [editing, setEditing] = useState<EditingLine | null>(null)
  const blocking = draft.exceptions.some((exception) => exception.blocking)
  const approved = draft.status === 'approved' || draft.status === 'exported'
  const exported = draft.status === 'exported'
  const approvalReason = blocking ? 'Xử lý ngoại lệ trước' : draft.lines.length === 0 ? 'Cần final transcript' : null

  const saveCorrection = () => {
    if (!editing) return
    const product = productOptions.find((option) => option.sku === editing.sku)
    const quantity = Number(editing.quantity)
    if (!product || !Number.isFinite(quantity) || quantity <= 0 || !editing.unit.trim()) return
    onCorrect({ lineId: editing.lineId, sku: product.sku, productLabel: product.label, quantity, unit: editing.unit.trim() })
    setEditing(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Đơn nháp</p><h3 className="mt-1 text-xl font-semibold tracking-[-0.03em]">{draft.customerName ?? 'Chưa nhận diện khách'}</h3></div><StatusPill tone={exported ? 'success' : blocking ? 'warning' : approved ? 'info' : 'demo'}>{exported ? 'Đã xuất' : blocking ? 'Cần xử lý' : approved ? 'Đã duyệt' : 'Chờ duyệt'}</StatusPill></div>
      {draft.exceptions.length > 0 ? <div className="space-y-2">{draft.exceptions.map((exception) => <Callout key={exception.id} tone="warning" title={exception.code}>{exception.message}</Callout>)}</div> : null}
      {draft.lines.length === 0 ? <div className="rounded-xl border border-dashed border-[var(--hairline)] p-4 text-sm text-[var(--muted)]">Final transcript sẽ tạo dòng đơn ở đây.</div> : null}
      <div className="space-y-3">
        {draft.lines.map((line) => {
          const isEditing = editing?.lineId === line.id
          const selectedProduct = productOptions.find((option) => option.sku === editing?.sku)
          const invalidCorrection = !selectedProduct || !Number.isFinite(Number(editing?.quantity)) || Number(editing?.quantity) <= 0 || !editing?.unit.trim()

          return <article key={line.id} className="rounded-[14px] border border-[var(--hairline)] bg-[var(--pearl)] p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-[var(--ink)]">{line.productLabel}</p><p className="mt-1 font-mono text-xs text-[var(--muted)]">{line.sku ?? 'Cần chọn SKU'}</p></div><button type="button" aria-label={`Sửa ${line.productLabel}`} disabled={exported} onClick={() => setEditing({ lineId: line.id, originalLabel: line.productLabel, sku: line.sku ?? '', quantity: String(line.quantity ?? ''), unit: line.unit ?? 'thùng' })} className="grid h-9 w-9 place-items-center rounded-full text-[var(--action)] hover:bg-[var(--action-soft)] disabled:cursor-not-allowed disabled:opacity-45"><PencilSimpleIcon size={17} /></button></div><div className="mt-4 flex items-end justify-between gap-3"><p className="text-2xl font-semibold tracking-[-0.04em]">{line.quantity ?? '—'} <span className="text-sm font-medium text-[var(--muted)]">{line.unit ?? 'đơn vị'}</span></p><StatusPill tone={line.resolution === 'resolved' ? 'success' : 'warning'}>{line.resolution === 'resolved' ? 'Đã khớp' : line.resolution === 'ambiguous' ? 'Mơ hồ' : 'Chưa khớp'}</StatusPill></div><div className="mt-4 space-y-2">{line.evidence.map((evidence) => <FieldEvidence key={`${evidence.segmentId}-${evidence.quote}`} quote={evidence.quote} confidence={evidence.confidence} compact />)}</div>{isEditing && editing ? <form className="mt-4 space-y-3 border-t border-[var(--hairline)] pt-4" onSubmit={(event) => { event.preventDefault(); saveCorrection() }}><p className="text-sm font-semibold text-[var(--ink)]">Xác nhận chỉnh sửa bởi người vận hành</p><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5 text-xs font-medium text-[var(--muted)]" htmlFor={`sku-${line.id}`}>SKU cho {editing.originalLabel}<select id={`sku-${line.id}`} value={editing.sku} onChange={(event) => setEditing((current) => current ? { ...current, sku: event.target.value } : current)} className="min-h-11 rounded-xl border border-[var(--hairline)] bg-white px-3 text-sm text-[var(--ink)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--action-focus)]"><option value="">Chọn SKU</option>{productOptions.map((option) => <option key={option.sku} value={option.sku}>{option.label} · {option.sku}</option>)}</select></label><label className="grid gap-1.5 text-xs font-medium text-[var(--muted)]" htmlFor={`quantity-${line.id}`}>Số lượng cho {editing.originalLabel}<input id={`quantity-${line.id}`} value={editing.quantity} onChange={(event) => setEditing((current) => current ? { ...current, quantity: event.target.value } : current)} min="1" step="1" inputMode="numeric" type="number" className="min-h-11 rounded-xl border border-[var(--hairline)] bg-white px-3 text-sm text-[var(--ink)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--action-focus)]" /></label></div><label className="grid gap-1.5 text-xs font-medium text-[var(--muted)]" htmlFor={`unit-${line.id}`}>Đơn vị<input id={`unit-${line.id}`} value={editing.unit} onChange={(event) => setEditing((current) => current ? { ...current, unit: event.target.value } : current)} className="min-h-11 rounded-xl border border-[var(--hairline)] bg-white px-3 text-sm text-[var(--ink)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--action-focus)]" /></label><div className="flex flex-wrap gap-2"><Button type="submit" disabled={invalidCorrection} {...(invalidCorrection ? { disabledReason: 'Chọn SKU, số lượng và đơn vị hợp lệ' } : {})}>Lưu chỉnh sửa</Button><Button variant="quiet" onClick={() => setEditing(null)}>Huỷ</Button></div></form> : null}</article>
        })}
      </div>
      <div className="rounded-[14px] border border-[var(--hairline)] bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-[var(--ink)]">Human in the loop</p><p className="mt-1 text-xs leading-5 text-[var(--muted)]">AI không có quyền duyệt, định giá, tồn kho hoặc xuất ERP.</p></div>{approved ? <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--success)]"><CheckCircleIcon size={18} weight="fill" /> {exported ? 'Đã xuất ERP nháp' : `Đã duyệt bởi ${draft.approvedBy ?? 'operator'}`}</span> : <Button variant="secondary" onClick={onApprove} disabled={blocking || draft.lines.length === 0} {...(approvalReason ? { disabledReason: approvalReason } : {})} leadingIcon={<CheckCircleIcon size={17} />}>Duyệt đơn nháp</Button>}</div><div className="mt-4"><Button onClick={onExport} disabled={!approved || exported} disabledReason={exported ? 'Đơn này đã được xuất idempotent' : 'Cần duyệt đơn trước'} leadingIcon={<ExportIcon size={17} />}>Xuất ERP nháp</Button>{exported && draft.externalReference ? <p className="mt-2 font-mono text-xs text-[var(--muted)]">{draft.externalReference}</p> : null}</div></div>
    </div>
  )
}

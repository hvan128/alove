'use client'

import { useState } from 'react'
import type { DemoWorkspace, OrderDraft, Source } from '@ordervoice/contracts'
import { Panel } from '@/components/ui/panel'
import { SourceSwitcher } from './source-switcher'
import { ConversationPanel } from './conversation-panel'
import { OrderPanel } from './order-panel'
import { ReplyPanel } from './reply-panel'
import { useNormalizedAudioCapture } from '@/hooks/use-normalized-audio-capture'
import { useZaloReplay } from '@/hooks/use-zalo-replay'

type DemoLineCorrection = {
  lineId: string
  sku: string
  productLabel: string
  quantity: number
  unit: string
}

export function ConsoleWorkspace({ initialWorkspace }: { initialWorkspace: DemoWorkspace }) {
  const [workspace, setWorkspace] = useState(initialWorkspace)
  const [speechStatus, setSpeechStatus] = useState<string | null>(null)
  const [audioStatus, setAudioStatus] = useState<string | null>(null)
  const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL
  const capture = useNormalizedAudioCapture({
    conversationId: workspace.conversationId,
    source: workspace.activeSource,
    ...(gatewayUrl ? { gatewayUrl } : {}),
    onStatus: setAudioStatus,
    onTranscript: (segment) => setWorkspace((current) => ({ ...current, transcript: [...current.transcript, segment] })),
  })
  const replay = useZaloReplay({
    conversationId: workspace.conversationId,
    ...(gatewayUrl ? { gatewayUrl } : {}),
    onStatus: setAudioStatus,
    onTranscript: (segment) => setWorkspace((current) => ({ ...current, transcript: [...current.transcript, segment] })),
  })

  const runDemo = () => {
    setWorkspace((current) => createDemoResult({ ...current, activeSource: current.activeSource }))
  }

  const runAmbiguousDemo = () => {
    setWorkspace((current) => createAmbiguousDemoResult({ ...current, activeSource: current.activeSource }))
  }

  const correctLine = (correction: DemoLineCorrection) => {
    setWorkspace((current) => ({ ...current, draft: correctDemoLine(current.draft, correction) }))
  }

  const approve = () => {
    setWorkspace((current) => ({ ...current, draft: { ...current.draft, status: 'approved', approvedBy: 'Nguyễn Thị Lan', approvedAt: new Date().toISOString() } }))
  }

  const exportDraft = () => {
    setWorkspace((current) => ({ ...current, draft: { ...current.draft, status: 'exported', externalReference: current.draft.externalReference ?? 'ERP-DRAFT-0001' } }))
  }

  const speak = () => {
    if (!('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
      setSpeechStatus('Trình duyệt không hỗ trợ giọng thiết bị. Có thể cấu hình VALSEA/OpenAI TTS ở server.')
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(workspace.reply.text)
    utterance.lang = 'vi-VN'
    window.speechSynthesis.speak(utterance)
    setSpeechStatus('Đang phát giọng thiết bị — nội dung AI chỉ được phát sau thao tác người.')
  }

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setSpeechStatus('Đã dừng phát giọng.')
  }

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:py-8">
      <section className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-sm font-semibold text-[var(--action)]">OrderVoice / Sales operations</p><h1 className="mt-1 text-3xl font-semibold tracking-[-0.045em] text-[var(--ink)] sm:text-[34px]">Một cuộc gọi. Một đơn nháp có bằng chứng.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">VALSEA-first transcription · human approval before ERP · Vietnamese and code-switching safe.</p></div><p className="rounded-full border border-[var(--hairline)] bg-white px-3 py-2 font-mono text-xs text-[var(--muted)]">{workspace.isDemo ? 'DEMO LOCAL · no provider key' : `LIVE · ${workspace.conversationId}`}</p></section>
      <SourceSwitcher activeSource={workspace.activeSource} sourceStates={workspace.sourceStates} onSourceChange={(source: Source) => setWorkspace((current) => ({ ...current, activeSource: source }))} />
      <main className="mt-5 grid gap-5 xl:grid-cols-[minmax(280px,0.9fr)_minmax(360px,1.15fr)_minmax(280px,0.85fr)]"><Panel title="Cuộc hội thoại" eyebrow="01 · âm thanh"><ConversationPanel workspace={workspace} onRunDemo={runDemo} onRunAmbiguousDemo={runAmbiguousDemo} onStartMic={capture.start} micState={capture.state} replayName={replay.fileName} replayUrl={replay.url} replayKind={replay.mediaKind} replayMediaKey={replay.mediaKey} replayState={replay.state} setReplayMediaElement={replay.setMediaElement} onReplayFile={replay.selectFile} onStartReplay={replay.start} onStopReplay={replay.stop} />{audioStatus ? <p className="mt-3 text-xs text-[var(--muted)]" role="status">{audioStatus}</p> : null}</Panel><Panel title="Đơn bán nháp" eyebrow="02 · evidence"><OrderPanel draft={workspace.draft} onCorrect={correctLine} onApprove={approve} onExport={exportDraft} /></Panel><Panel title="ERP & phản hồi" eyebrow="03 · người duyệt"><ReplyPanel reply={workspace.reply} onSpeak={speak} onStop={stopSpeaking} status={speechStatus} /></Panel></main>
    </div>
  )
}

function createDemoResult(workspace: DemoWorkspace): DemoWorkspace {
  const conversationId = workspace.conversationId
  const finalId = 'segment-demo-final-001'
  const draft = readyDraft(workspace.draft, conversationId, finalId)
  return {
    ...workspace,
    step: Math.max(workspace.step, 1),
    sourceStates: { ...workspace.sourceStates, [workspace.activeSource]: 'demo' },
    transcript: [
      { id: 'segment-demo-partial-001', conversationId, kind: 'partial', speaker: 'caller', text: 'Chị Lan lấy mười hai thùng cà phê…', startedAtMs: 0, endedAtMs: 1800, confidence: 0.72, source: workspace.activeSource },
      { id: finalId, conversationId, kind: 'final', speaker: 'caller', text: 'Chị Lan lấy 12 thùng cà phê Arabica, thêm 3 pack Oat Milk 1L.', startedAtMs: 0, endedAtMs: 5100, confidence: 0.96, source: workspace.activeSource, providerEventId: 'demo-final-001' },
    ],
    draft,
  }
}

function createAmbiguousDemoResult(workspace: DemoWorkspace): DemoWorkspace {
  const conversationId = workspace.conversationId
  const final = {
    id: 'segment-demo-house-final-001',
    conversationId,
    kind: 'final' as const,
    speaker: 'caller' as const,
    text: 'Chị Lan lấy 2 thùng cà phê house.',
    startedAtMs: 0,
    endedAtMs: 3200,
    confidence: 0.91,
    source: workspace.activeSource,
    providerEventId: 'demo-house-final-001',
  }

  return {
    ...workspace,
    step: Math.max(workspace.step, 1),
    sourceStates: { ...workspace.sourceStates, [workspace.activeSource]: 'demo' },
    transcript: [
      { id: 'segment-demo-house-partial-001', conversationId, kind: 'partial', speaker: 'caller', text: 'Chị Lan lấy hai thùng cà phê house…', startedAtMs: 0, endedAtMs: 1500, confidence: 0.72, source: workspace.activeSource },
      final,
    ],
    draft: {
      id: `order-${conversationId}`,
      conversationId,
      customerId: 'CUS-LAN-ANH',
      customerName: 'Cửa hàng Lan Anh',
      status: 'review_required',
      lines: [{ id: 'line-demo-house-001', sku: null, productLabel: 'cà phê house', quantity: 2, unit: 'thùng', resolution: 'ambiguous', evidence: [{ segmentId: final.id, quote: '2 thùng cà phê house', startMs: 0, endMs: 3200, confidence: 0.91 }] }],
      exceptions: [{ id: 'line-demo-house-001-sku-ambiguous', code: 'SKU_AMBIGUOUS', message: 'Cần chọn một SKU cho “cà phê house”.', blocking: true, lineId: 'line-demo-house-001' }],
      approvedBy: null,
      approvedAt: null,
      externalReference: null,
    },
  }
}

function correctDemoLine(draft: OrderDraft, correction: DemoLineCorrection): OrderDraft {
  if (!draft.lines.some((line) => line.id === correction.lineId)) return draft
  const lines = draft.lines.map((line) => line.id === correction.lineId ? { ...line, sku: correction.sku, productLabel: correction.productLabel, quantity: correction.quantity, unit: correction.unit, resolution: 'resolved' as const } : line)
  const exceptions = draft.exceptions.filter((exception) => exception.lineId !== correction.lineId)
  return {
    ...draft,
    lines,
    exceptions,
    status: exceptions.some((exception) => exception.blocking) ? 'review_required' : 'ready_for_approval',
    approvedBy: null,
    approvedAt: null,
  }
}

function readyDraft(draft: OrderDraft, conversationId: string, segmentId: string): OrderDraft {
  const evidence = (quote: string) => ({ segmentId, quote, startMs: 0, endMs: 5100, confidence: 0.96 })
  return {
    ...draft,
    id: draft.id || `order-${conversationId}`,
    customerId: 'CUS-LAN-ANH',
    customerName: 'Cửa hàng Lan Anh',
    status: 'ready_for_approval',
    approvedBy: null,
    approvedAt: null,
    externalReference: null,
    exceptions: [],
    lines: [
      { id: 'line-demo-arabica', sku: 'CF-ARABICA-1KG', productLabel: 'Arabica Premium', quantity: 12, unit: 'thùng', resolution: 'resolved', evidence: [evidence('12 thùng cà phê Arabica')] },
      { id: 'line-demo-oat', sku: 'OM-OAT-1L', productLabel: 'Oat Milk 1L', quantity: 3, unit: 'pack', resolution: 'resolved', evidence: [evidence('3 pack Oat Milk 1L')] },
    ],
  }
}

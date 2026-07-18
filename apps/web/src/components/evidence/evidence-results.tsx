import { AlertTriangle, AudioLines, CheckCircle2, FileCheck2, FlaskConical, ShieldCheck } from 'lucide-react'

import { cn } from '@/lib/cn'
import type { EvidenceResults } from '@/lib/evidence/schema'

type EvidenceFixture = EvidenceResults['fixtures'][number]
type EngineKey = keyof EvidenceFixture['engines']
type Engine = EvidenceFixture['engines'][EngineKey]
type EngineResult = Engine['result']
type DiffOperation = NonNullable<EngineResult['metrics']>['wordErrorRate']['diff'][number]

const ENGINE_LABEL: Record<EngineKey, string> = {
  valsea: 'VALSEA',
  whisper: 'Whisper',
}

const STATUS_LABEL = {
  succeeded: 'Đã chạy',
  failed: 'Chạy lỗi',
  unrun: 'Chưa chạy',
} as const

export function EvidenceResultsView({ results }: { results: EvidenceResults }) {
  const completedEngines = results.fixtures.reduce(
    (count, fixture) => count + Object.values(fixture.engines).filter((engine) => engine.result.status === 'succeeded').length,
    0,
  )
  const totalEngines = results.fixtures.length * 2

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pb-24 sm:pt-14">
      <section aria-labelledby="evidence-title" className="overflow-hidden rounded-3xl border border-[var(--hairline)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-end lg:p-10">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.13em] text-[var(--action)]">
              <FlaskConical className="size-4" aria-hidden /> Phòng thử nghiệm công khai
            </p>
            <h1 id="evidence-title" className="mt-4 text-3xl font-bold tracking-[-0.045em] text-[var(--ink)] sm:text-5xl">
              Bằng chứng nhận dạng giọng nói
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--muted)] sm:text-lg">
              So sánh VALSEA và Whisper trên cùng ba mẫu âm thanh tổng hợp, với ground truth, sai khác và chỉ số có thể kiểm tra lại.
            </p>
          </div>
          <RunStatus status={results.status} statusReason={results.statusReason} completed={completedEngines} total={totalEngines} />
        </div>

        <div className="grid border-t border-[var(--divider)] sm:grid-cols-3">
          <SummaryItem label="Mẫu kiểm thử" value={String(results.fixtures.length)} detail="tổng hợp · không PII" />
          <SummaryItem label="Kết quả engine" value={`${completedEngines}/${totalEngines}`} detail="không nội suy lượt chưa chạy" />
          <SummaryItem label="Ngôn ngữ baseline" value="vi" detail="Whisper language=vi" />
        </div>
      </section>

      <section aria-labelledby="scope-title" className="mt-5 grid gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950 sm:grid-cols-[auto_1fr] sm:p-6">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden />
        <div>
          <h2 id="scope-title" className="font-semibold">Giới hạn của bằng chứng</h2>
          <p className="mt-1 text-sm leading-6 text-amber-900">
            Dữ liệu tổng hợp giúp kiểm tra thanh điệu, Việt–Anh và âm thanh điện thoại 8 kHz. Kết quả này <strong>không chứng minh giọng vùng miền</strong>; hạng mục đó cần mẫu giọng thật có đồng thuận và hiện chưa được xác nhận.
          </p>
        </div>
      </section>

      <div className="mt-8 grid gap-8">
        {results.fixtures.map((fixture, index) => (
          <FixtureEvidence key={fixture.id} fixture={fixture} index={index} />
        ))}
      </div>

      <footer className="mt-8 rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-5 text-xs leading-5 text-[var(--muted)]">
        <p className="flex items-center gap-2 font-medium text-[var(--ink)]"><FileCheck2 className="size-4 text-[var(--success)]" aria-hidden /> Artifact đã xác thực · schema {results.schemaVersion}</p>
        <p className="mt-2 break-all font-mono">manifest sha256: {results.fixtureManifestSha256}</p>
        <p className="mt-1">Tạo lúc {formatTimestamp(results.generatedAt)}.</p>
      </footer>
    </div>
  )
}

function RunStatus({ status, statusReason, completed, total }: { status: EvidenceResults['status']; statusReason: string | null; completed: number; total: number }) {
  const isComplete = status === 'complete'
  const isIncomplete = status === 'incomplete'
  return (
    <div
      role="status"
      className={cn(
        'min-w-52 rounded-2xl border px-4 py-3',
        isComplete
          ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
          : isIncomplete
            ? 'border-red-200 bg-red-50 text-red-950'
            : 'border-amber-200 bg-amber-50 text-amber-950',
      )}
    >
      <p className="flex items-center gap-2 text-sm font-semibold">
        {isComplete ? <CheckCircle2 className="size-4 text-emerald-700" aria-hidden /> : <AlertTriangle className={cn('size-4', isIncomplete ? 'text-red-700' : 'text-amber-700')} aria-hidden />}
        {isComplete ? 'Đánh giá hoàn tất' : isIncomplete ? 'Đánh giá chưa đầy đủ' : 'Đánh giá bị chặn'}
      </p>
      <p className="mt-1 text-xs opacity-80">{completed}/{total} kết quả engine đã chạy</p>
      {statusReason ? <p className="mt-2 max-w-xs border-t border-current/15 pt-2 font-mono text-[11px] opacity-80">Lý do: {statusReason}</p> : null}
    </div>
  )
}

function SummaryItem({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="border-b border-[var(--divider)] px-6 py-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 sm:px-8">
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--muted)]">{label}</p>
      <p className="mt-1.5 font-mono text-2xl font-semibold tracking-[-0.03em] text-[var(--ink)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--muted)]">{detail}</p>
    </div>
  )
}

function FixtureEvidence({ fixture, index }: { fixture: EvidenceFixture; index: number }) {
  return (
    <article aria-labelledby={`${fixture.id}-title`} className="overflow-hidden rounded-3xl border border-[var(--hairline)] bg-[var(--surface)] shadow-[var(--shadow-card)]" data-testid="evidence-fixture">
      <header className="border-b border-[var(--divider)] p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--action)]">Mẫu {String(index + 1).padStart(2, '0')}</p>
            <h2 id={`${fixture.id}-title`} className="mt-1.5 text-2xl font-semibold tracking-[-0.035em] text-[var(--ink)]">{fixture.label}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{fixture.description}</p>
          </div>
          <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-800">
            <ShieldCheck className="size-3.5" aria-hidden /> Tổng hợp · Không PII
          </span>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.72fr)]">
          <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--pearl)] p-4">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]"><AudioLines className="size-4" aria-hidden /> Âm thanh kiểm thử</p>
            <audio className="mt-3 h-10 w-full" controls preload="metadata" src={fixture.audio.path} aria-label={`Nghe mẫu ${fixture.label}`}>
              Trình duyệt không hỗ trợ phát âm thanh.
            </audio>
            <p className="mt-3 text-xs leading-5 text-[var(--muted)]">
              {fixture.audio.format.container.toUpperCase()} · {fixture.audio.format.codec} · {formatSampleRate(fixture.audio.format.sampleRateHz)} · {fixture.audio.format.channels} kênh · {fixture.audio.format.bitsPerSample}-bit
            </p>
          </div>
          <dl className="rounded-2xl border border-[var(--hairline)] p-4 text-xs">
            <div className="flex gap-3"><dt className="shrink-0 text-[var(--muted)]">Provenance</dt><dd className="text-right font-mono font-medium text-[var(--ink)]">{fixture.provenance}</dd></div>
            <div className="mt-2 flex gap-3"><dt className="shrink-0 text-[var(--muted)]">Fixture ID</dt><dd className="min-w-0 flex-1 break-all text-right font-mono text-[var(--ink)]">{fixture.id}</dd></div>
            <div className="mt-2 flex gap-3"><dt className="shrink-0 text-[var(--muted)]">SHA-256</dt><dd className="min-w-0 flex-1 break-all text-right font-mono text-[var(--ink)]">{fixture.audio.sha256}</dd></div>
          </dl>
        </div>
      </header>

      <div className="p-5 sm:p-7">
        <section aria-labelledby={`${fixture.id}-truth`} className="rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:p-5">
          <h3 id={`${fixture.id}-truth`} className="text-xs font-semibold uppercase tracking-[0.1em] text-blue-800">Ground truth</h3>
          <p className="mt-2 text-base leading-7 text-blue-950">{fixture.groundTruth}</p>
        </section>

        <ComparisonTable fixture={fixture} />

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {(Object.entries(fixture.engines) as Array<[EngineKey, Engine]>).map(([engineKey, engine]) => (
            <EngineDiff key={engineKey} engineKey={engineKey} engine={engine} />
          ))}
        </div>
      </div>
    </article>
  )
}

function ComparisonTable({ fixture }: { fixture: EvidenceFixture }) {
  return (
    <section aria-labelledby={`${fixture.id}-comparison`} className="mt-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 id={`${fixture.id}-comparison`} className="text-lg font-semibold tracking-[-0.025em] text-[var(--ink)]">So sánh cùng một đầu vào</h3>
          <p className="mt-1 text-xs text-[var(--muted)]">WER càng thấp càng tốt; tỷ lệ giữ token càng cao càng tốt.</p>
        </div>
        <p className="text-xs text-[var(--muted)]">Whisper: <span className="font-mono text-[var(--ink)]">language=vi</span></p>
      </div>
      <div className="mt-3 overflow-x-auto rounded-2xl border border-[var(--hairline)]">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-[var(--pearl)] text-xs uppercase tracking-[0.06em] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-semibold" scope="col">Engine</th>
              <th className="px-4 py-3 font-semibold" scope="col">Trạng thái</th>
              <th className="px-4 py-3 font-semibold" scope="col">Bản chép</th>
              <th className="px-4 py-3 text-right font-semibold" scope="col">WER</th>
              <th className="px-4 py-3 text-right font-semibold" scope="col">Giữ token Anh</th>
              <th className="px-4 py-3 text-right font-semibold" scope="col">Giữ thanh điệu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--divider)]">
            {(Object.entries(fixture.engines) as Array<[EngineKey, Engine]>).map(([engineKey, engine]) => (
              <tr key={engineKey}>
                <th className="px-4 py-4 font-semibold text-[var(--ink)]" scope="row">
                  {ENGINE_LABEL[engineKey]}
                  <span className="mt-0.5 block font-mono text-[10px] font-normal text-[var(--muted)]">{engine.model} · {engine.language}</span>
                </th>
                <td className="px-4 py-4"><EngineStatus status={engine.result.status} /></td>
                <td className="max-w-md px-4 py-4 leading-6 text-[var(--ink)]">{engine.result.transcript ?? <Unavailable />}</td>
                <MetricCell
                  value={engine.result.metrics?.wordErrorRate.value}
                  detail={engine.result.metrics ? `${engine.result.metrics.wordErrorRate.edits}/${engine.result.metrics.wordErrorRate.referenceWords} lỗi/từ` : undefined}
                />
                <MetricCell
                  value={engine.result.metrics?.englishTokenRetention.value}
                  detail={engine.result.metrics ? `${engine.result.metrics.englishTokenRetention.retained}/${engine.result.metrics.englishTokenRetention.total} token` : undefined}
                />
                <MetricCell
                  value={engine.result.metrics?.vietnameseToneRetention.value}
                  detail={engine.result.metrics ? `${engine.result.metrics.vietnameseToneRetention.retained}/${engine.result.metrics.vietnameseToneRetention.total} token` : undefined}
                />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function MetricCell({ value, detail }: { value: number | null | undefined; detail: string | undefined }) {
  return (
    <td className="px-4 py-4 text-right font-mono font-medium tabular-nums text-[var(--ink)]">
      {value == null ? <Unavailable /> : formatPercent(value)}
      {detail ? <span className="mt-0.5 block font-sans text-[10px] font-normal text-[var(--muted)]">{detail}</span> : null}
    </td>
  )
}

function Unavailable() {
  return <span className="font-sans font-normal text-[var(--muted)]">—</span>
}

function EngineStatus({ status }: { status: EngineResult['status'] }) {
  return (
    <span className={cn(
      'inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold',
      status === 'succeeded' && 'bg-emerald-50 text-emerald-700',
      status === 'failed' && 'bg-red-50 text-red-700',
      status === 'unrun' && 'bg-amber-50 text-amber-800',
    )}>
      {STATUS_LABEL[status]}
    </span>
  )
}

function EngineDiff({ engineKey, engine }: { engineKey: EngineKey; engine: Engine }) {
  const title = `Sai khác ${ENGINE_LABEL[engineKey]}`
  const result = engine.result
  return (
    <section aria-label={title} className="rounded-2xl border border-[var(--hairline)] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-[var(--ink)]">{title}</h3>
        <EngineStatus status={result.status} />
      </div>
      {result.status === 'succeeded' && result.metrics ? (
        <>
          <div className="mt-4 flex flex-wrap gap-2 text-xs" aria-label={`Chú giải sai khác ${ENGINE_LABEL[engineKey]}`}>
            <Legend className="bg-red-50 text-red-800 line-through" label="Bỏ sót" />
            <Legend className="bg-emerald-50 text-emerald-800 underline decoration-2" label="Chèn thêm" />
            <Legend className="bg-amber-50 text-amber-900" label="Thay thế" />
          </div>
          <p className="mt-4 flex flex-wrap gap-x-1.5 gap-y-2 text-sm leading-7" data-testid={`diff-${engineKey}`}>
            {result.metrics.wordErrorRate.diff.map((operation, index) => <DiffToken key={`${operation.type}-${index}`} operation={operation} />)}
          </p>
        </>
      ) : (
        <div className="mt-4 rounded-xl bg-[var(--pearl)] p-4 text-sm leading-6 text-[var(--muted)]" role={result.status === 'failed' ? 'alert' : 'status'}>
          {result.error ?? (result.status === 'unrun' ? 'Lượt đánh giá chưa chạy; không có transcript, chỉ số hoặc diff để hiển thị.' : 'Không có số liệu hợp lệ để hiển thị.')}
        </div>
      )}
    </section>
  )
}

function Legend({ className, label }: { className: string; label: string }) {
  return <span className={cn('rounded-md px-2 py-1', className)}>{label}</span>
}

function DiffToken({ operation }: { operation: DiffOperation }) {
  if (operation.type === 'equal') return <span>{operation.reference}</span>
  if (operation.type === 'delete') {
    return <del className="rounded bg-red-50 px-1 text-red-800" title="Bỏ sót trong bản chép">{operation.reference}</del>
  }
  if (operation.type === 'insert') {
    return <ins className="rounded bg-emerald-50 px-1 text-emerald-800 no-underline" title="Chèn thêm trong bản chép">+{operation.hypothesis}</ins>
  }
  return (
    <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1 text-amber-950" title="Token bị thay thế">
      <del className="text-red-800">{operation.reference}</del><span aria-hidden>→</span><ins className="text-emerald-800 no-underline">{operation.hypothesis}</ins>
    </span>
  )
}

function formatPercent(value: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'percent', maximumFractionDigits: 1 }).format(value)
}

function formatSampleRate(sampleRateHz: number) {
  return sampleRateHz % 1_000 === 0 ? `${sampleRateHz / 1_000} kHz` : `${sampleRateHz} Hz`
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(value))
}

'use client'

import { ArrowSquareOutIcon } from '@phosphor-icons/react/dist/icons/ArrowSquareOut'
import { BusIcon } from '@phosphor-icons/react/dist/icons/Bus'
import { CopyIcon } from '@phosphor-icons/react/dist/icons/Copy'
import { MicrophoneSlashIcon } from '@phosphor-icons/react/dist/icons/MicrophoneSlash'
import { PhoneDisconnectIcon } from '@phosphor-icons/react/dist/icons/PhoneDisconnect'
import { RobotIcon } from '@phosphor-icons/react/dist/icons/Robot'
import { UserSoundIcon } from '@phosphor-icons/react/dist/icons/UserSound'
import Link from 'next/link'
import { useState } from 'react'
import type { CallMode, TranscriptDisplayLanguage } from '@ordervoice/contracts'
import type { PublicIntegrationStatus } from '@/lib/livekit/server'
import type { CallSessionState } from '@/lib/call/session-state'
import { StatusPill } from '@/components/ui/status'

type Props = {
  sessionCode: string
  state: CallSessionState
  integrationStatus: PublicIntegrationStatus
  onModeChange: (mode: CallMode) => void
  onLanguageChange: (language: TranscriptDisplayLanguage) => void
  onEndCall: () => void
}

export function CallToolbar({
  sessionCode,
  state,
  integrationStatus,
  onModeChange,
  onLanguageChange,
  onEndCall,
}: Props) {
  const [copied, setCopied] = useState(false)
  const callerPath = `/call?session=${sessionCode}`

  const copyCallerLink = async () => {
    const url = typeof window === 'undefined' ? callerPath : `${window.location.origin}${callerPath}`
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1_500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--divider)] bg-[color-mix(in_srgb,var(--canvas)_88%,transparent)] backdrop-blur-2xl">
      <div className="mx-auto max-w-[1720px] px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" aria-label="Về trang chủ" className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[var(--ink)] text-white">
              <BusIcon size={20} weight="fill" aria-hidden />
            </Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <h1 className="text-[17px] font-semibold tracking-[-0.03em]">Bàn hỗ trợ đặt vé</h1>
                <span className="font-mono text-xs text-[var(--muted)]">{sessionCode}</span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <StatusPill tone={integrationStatus.livekit ? 'success' : 'demo'}>
                  {integrationStatus.livekit ? 'LiveKit sẵn sàng' : 'Mô phỏng cục bộ'}
                </StatusPill>
                <StatusPill tone={integrationStatus.valsea ? 'success' : 'warning'}>
                  {integrationStatus.valsea ? 'VALSEA đã cấu hình' : 'Chưa dùng VALSEA'}
                </StatusPill>
                <StatusPill tone={integrationStatus.voiceAgent ? 'success' : 'neutral'}>
                  {integrationStatus.voiceAgent ? 'Agent sẵn sàng' : 'Agent chưa cấu hình'}
                </StatusPill>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link href={callerPath} target="_blank" className="inline-flex min-h-10 items-center gap-2 rounded-[11px] border border-[var(--hairline)] bg-white px-3 text-sm font-medium transition hover:bg-[var(--pearl)]" aria-label="Mở trang người gọi">
              <ArrowSquareOutIcon size={17} aria-hidden />
              Trang người gọi
            </Link>
            <button type="button" onClick={copyCallerLink} className="inline-flex min-h-10 items-center gap-2 rounded-[11px] border border-[var(--hairline)] bg-white px-3 text-sm font-medium transition hover:bg-[var(--pearl)]" aria-label="Sao chép link người gọi">
              <CopyIcon size={17} aria-hidden />
              {copied ? 'Đã sao chép' : 'Sao chép link'}
            </button>
            <button type="button" disabled={!integrationStatus.livekit} className="grid h-10 w-10 place-items-center rounded-[11px] border border-[var(--hairline)] bg-white text-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-45" aria-label="Mic nhân viên" title={integrationStatus.livekit ? 'Bật mic nhân viên' : 'Mic cần LiveKit'}>
              <MicrophoneSlashIcon size={18} aria-hidden />
            </button>
            <button type="button" onClick={onEndCall} className="grid h-10 w-10 place-items-center rounded-[11px] bg-[var(--danger-soft)] text-[var(--danger)] transition hover:bg-[color-mix(in_srgb,var(--danger-soft),var(--danger)_8%)]" aria-label="Kết thúc cuộc gọi">
              <PhoneDisconnectIcon size={18} weight="fill" aria-hidden />
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--divider)] pt-3">
          <div className="inline-flex rounded-[11px] bg-[var(--divider)] p-0.5" aria-label="Chế độ trả lời">
            <button
              type="button"
              aria-pressed={state.mode === 'human'}
              onClick={() => onModeChange('human')}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-[9px] px-3 text-sm font-medium text-[var(--muted)] transition aria-pressed:bg-white aria-pressed:text-[var(--ink)] aria-pressed:shadow-sm"
            >
              <UserSoundIcon size={17} aria-hidden /> Nhân viên
            </button>
            <button
              type="button"
              aria-pressed={state.mode === 'auto'}
              onClick={() => onModeChange('auto')}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-[9px] px-3 text-sm font-medium text-[var(--muted)] transition aria-pressed:bg-white aria-pressed:text-[var(--ink)] aria-pressed:shadow-sm"
            >
              <RobotIcon size={17} aria-hidden /> Agent tự động
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-[var(--muted)]">
              {state.connection.callerPresent ? 'Người gọi đang trong phiên' : 'Đang chờ người gọi'}
            </span>
            <label className="flex items-center gap-2 text-xs font-medium text-[var(--muted)]">
              Ngôn ngữ transcript
              <select
                aria-label="Ngôn ngữ transcript"
                value={state.transcriptLanguage}
                onChange={(event) => onLanguageChange(event.target.value as TranscriptDisplayLanguage)}
                className="min-h-9 rounded-[9px] border border-[var(--hairline)] bg-white px-2.5 text-sm text-[var(--ink)]"
              >
                <option value="original">Nguyên bản</option>
                <option value="vi">Tiếng Việt</option>
                <option value="en">English</option>
              </select>
            </label>
          </div>
        </div>
      </div>
    </header>
  )
}

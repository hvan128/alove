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
  microphone: boolean
  onMicrophoneChange: (enabled: boolean) => void
  onEndCall: () => void
}

export function CallToolbar({
  sessionCode,
  state,
  integrationStatus,
  onModeChange,
  onLanguageChange,
  microphone,
  onMicrophoneChange,
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
                <StatusPill tone={state.connection.state === 'connected' ? 'success' : integrationStatus.livekit ? 'neutral' : 'demo'}>
                  {transportLabel(state, integrationStatus.livekit)}
                </StatusPill>
                <StatusPill tone={state.connection.valsea === 'live' ? 'success' : state.connection.valsea === 'error' ? 'danger' : 'warning'}>
                  {valseaLabel(state, integrationStatus.valsea)}
                </StatusPill>
                <StatusPill tone={state.connection.agent === 'ready' || state.connection.agent === 'speaking' ? 'success' : state.connection.agent === 'error' ? 'danger' : 'neutral'}>
                  {agentLabel(state, integrationStatus.voiceAgent)}
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
            <button
              type="button"
              disabled={!integrationStatus.livekit}
              onClick={() => onMicrophoneChange(!microphone)}
              className="grid h-10 w-10 place-items-center rounded-[11px] border border-[var(--hairline)] bg-white text-[var(--muted)] disabled:cursor-not-allowed disabled:opacity-45"
              aria-label={microphone ? 'Tắt mic nhân viên' : 'Bật mic nhân viên'}
              aria-pressed={microphone}
              title={integrationStatus.livekit ? (microphone ? 'Tắt mic nhân viên' : 'Bật mic nhân viên') : 'Mic cần LiveKit'}
            >
              {microphone ? <UserSoundIcon size={18} weight="fill" aria-hidden /> : <MicrophoneSlashIcon size={18} aria-hidden />}
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

function transportLabel(state: CallSessionState, configured: boolean): string {
  if (!configured) return 'Mô phỏng cục bộ'
  if (state.connection.state === 'connected') return 'LiveKit đã kết nối'
  if (state.connection.state === 'error') return 'Lỗi LiveKit'
  if (state.connection.state === 'ended') return 'LiveKit đã ngắt'
  return 'LiveKit đang kết nối'
}

function valseaLabel(state: CallSessionState, configured: boolean): string {
  if (!configured) return 'Chưa dùng VALSEA'
  const labels: Record<CallSessionState['connection']['valsea'], string> = {
    unconfigured: 'VALSEA chờ người gọi',
    connecting: 'VALSEA đang kết nối',
    live: 'VALSEA đang nghe',
    error: 'Lỗi VALSEA',
  }
  return labels[state.connection.valsea]
}

function agentLabel(state: CallSessionState, configured: boolean): string {
  if (!configured) return 'Agent chưa cấu hình'
  const labels: Record<CallSessionState['connection']['agent'], string> = {
    unconfigured: 'Agent chờ dispatch',
    dispatching: 'Đang dispatch Agent',
    ready: 'Agent đang nghe',
    speaking: 'Agent đang nói',
    error: 'Lỗi Agent',
  }
  return labels[state.connection.agent]
}

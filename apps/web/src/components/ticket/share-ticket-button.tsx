'use client'

import { Check, Copy, Share2, TriangleAlert } from 'lucide-react'
import { useEffect, useState, useSyncExternalStore } from 'react'

/**
 * "Gửi vào Zalo" without needing Zalo.
 *
 * The OS share sheet already lists every messaging app the passenger has, Zalo
 * included, so handing it the ticket text costs no Official Account, no approved
 * ZNS template and no per-message fee. The passenger sends it to themselves —
 * their own Cloud của tôi — which is the same outcome a notification would have
 * produced, minus the paperwork.
 *
 * Note what this is not: the page cannot push anything anywhere. It only offers
 * the text; a human taps and chooses the recipient. Server-initiated delivery to
 * a phone number is ZNS, and nothing here substitutes for it.
 */

function subscribeNever(): () => void {
  return () => {}
}

function hasShareSheet(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

/**
 * Copy that survives an insecure origin.
 *
 * navigator.clipboard is undefined outside a secure context, and a dev server
 * opened as http://<lan-ip> — the only way to reach it from a real phone — is
 * exactly that. Without the legacy path the button looked alive and did nothing.
 */
async function copyToClipboard(value: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && typeof navigator.clipboard?.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(value)
      return true
    } catch {
      // Permissions policy can block it even where it exists; fall through.
    }
  }
  try {
    const area = document.createElement('textarea')
    area.value = value
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.top = '0'
    area.style.opacity = '0'
    document.body.append(area)
    area.select()
    area.setSelectionRange(0, value.length)
    const copied = document.execCommand('copy')
    area.remove()
    return copied
  } catch {
    return false
  }
}

type Status = 'idle' | 'copied' | 'failed'

export function ShareTicketButton({ text, title }: { text: string; title: string }) {
  const [status, setStatus] = useState<Status>('idle')

  // The server has no navigator, so it must render the copy label and only swap
  // after hydration. useSyncExternalStore gives that a server snapshot without
  // the cascading render an effect-plus-setState would cause. Nothing ever
  // subscribes: share support cannot change mid-session.
  const canShare = useSyncExternalStore(subscribeNever, hasShareSheet, () => false)

  useEffect(() => {
    if (status === 'idle') return
    const timer = setTimeout(() => setStatus('idle'), 4000)
    return () => clearTimeout(timer)
  }, [status])

  async function handleClick() {
    if (canShare) {
      try {
        await navigator.share({ title, text })
        return
      } catch (error) {
        // Dismissing the sheet rejects with AbortError. That is a choice, not a
        // failure, so it must not fall through to copying behind their back.
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }
    setStatus((await copyToClipboard(text)) ? 'copied' : 'failed')
  }

  const label = status === 'copied'
    ? 'Đã sao chép vé'
    : canShare
      ? 'Gửi vé vào Zalo'
      : 'Sao chép thông tin vé'

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--action)] px-5 py-2 text-sm font-medium text-[var(--on-action)] transition hover:bg-[var(--action-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--action-focus)] active:scale-[0.98]"
      >
        {status === 'copied'
          ? <Check size={18} aria-hidden />
          : canShare ? <Share2 size={18} aria-hidden /> : <Copy size={18} aria-hidden />}
        {label}
      </button>

      {status === 'failed' ? (
        <div role="alert" className="grid gap-2 rounded-2xl border border-[color-mix(in_srgb,var(--warning)_45%,var(--hairline))] bg-[color-mix(in_srgb,var(--warning)_8%,transparent)] p-3">
          <p className="flex items-start gap-2 text-xs leading-5 text-[var(--muted)]">
            <TriangleAlert size={15} className="mt-0.5 shrink-0 text-[var(--warning)]" aria-hidden />
            Trình duyệt không cho sao chép tự động. Bạn chọn và sao chép đoạn dưới đây nhé.
          </p>
          {/* Read-only and pre-selected: on a phone a long-press here is the
              fastest route to Zalo when the clipboard API is unavailable. */}
          <textarea
            readOnly
            value={text}
            rows={7}
            onFocus={(event) => event.currentTarget.select()}
            className="w-full resize-none rounded-xl border border-[var(--hairline)] bg-[var(--canvas)] p-2.5 font-mono text-xs leading-5 text-[var(--ink)]"
          />
        </div>
      ) : null}
    </div>
  )
}

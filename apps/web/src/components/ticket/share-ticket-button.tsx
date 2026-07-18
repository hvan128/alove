'use client'

import { Check, Copy, Share2 } from 'lucide-react'
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
 * navigator.share needs a secure context, a user gesture, and simply does not
 * exist on most desktop browsers, so the copy fallback is the common path on
 * desktop rather than an edge case.
 */
function subscribeNever(): () => void {
  return () => {}
}

function hasShareSheet(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

export function ShareTicketButton({ text, title }: { text: string; title: string }) {
  const [copied, setCopied] = useState(false)

  // The server has no navigator, so it must render the copy label and only swap
  // after hydration. useSyncExternalStore gives that a server snapshot without
  // the cascading render an effect-plus-setState would cause. Nothing ever
  // subscribes: share support cannot change mid-session.
  const canShare = useSyncExternalStore(subscribeNever, hasShareSheet, () => false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 2200)
    return () => clearTimeout(timer)
  }, [copied])

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
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      // Clipboard can be blocked by permissions policy; the ticket text is on
      // screen anyway, so this stays silent rather than alarming.
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[var(--action)] px-5 py-2 text-sm font-medium text-[var(--on-action)] transition hover:bg-[var(--action-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--action-focus)] active:scale-[0.98]"
    >
      {copied ? <Check size={18} aria-hidden /> : canShare ? <Share2 size={18} aria-hidden /> : <Copy size={18} aria-hidden />}
      {copied ? 'Đã sao chép vé' : canShare ? 'Gửi vé vào Zalo' : 'Sao chép thông tin vé'}
    </button>
  )
}

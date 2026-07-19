'use client'

import { ArrowRight, Check, LoaderCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'

type SubmissionState = 'idle' | 'submitting' | 'success' | 'error'

export function NewsletterSignup() {
  const [state, setState] = useState<SubmissionState>('idle')
  const [message, setMessage] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setState('submitting')
    setMessage('')

    const form = event.currentTarget
    const email = new FormData(form).get('email')

    try {
      const response = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const payload = await response.json().catch(() => ({})) as { error?: string }

      if (!response.ok) {
        throw new Error(payload.error === 'rate_limited'
          ? 'Bạn đã gửi quá nhiều lần. Vui lòng thử lại sau.'
          : 'Chưa thể lưu đăng ký lúc này. Vui lòng thử lại sau.')
      }

      form.reset()
      setState('success')
      setMessage('Đã đăng ký. Alove sẽ chỉ gửi những cập nhật quan trọng.')
    } catch (error) {
      setState('error')
      setMessage(error instanceof Error ? error.message : 'Chưa thể lưu đăng ký lúc này.')
    }
  }

  return (
    <form onSubmit={submit} className="alove-newsletter-form">
      <label htmlFor="footer-email" className="sr-only">Email nhận cập nhật từ Alove</label>
      <input
        id="footer-email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        required
        maxLength={254}
        disabled={state === 'submitting'}
        placeholder="email@cuaban.vn"
        className="alove-newsletter-input"
      />
      <button type="submit" disabled={state === 'submitting'} className="alove-newsletter-button">
        {state === 'submitting'
          ? <LoaderCircle size={18} className="animate-spin" aria-hidden />
          : state === 'success' ? <Check size={18} aria-hidden /> : <ArrowRight size={18} aria-hidden />}
        {state === 'submitting' ? 'Đang lưu' : state === 'success' ? 'Đã đăng ký' : 'Đăng ký'}
      </button>
      <p className={`alove-newsletter-message ${state === 'error' ? 'text-rose-300' : 'text-slate-300'}`} aria-live="polite">
        {message}
      </p>
    </form>
  )
}

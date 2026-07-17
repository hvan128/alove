import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSpeechRecognition } from './use-speech-recognition'

class FakeRecognition {
  static latest: FakeRecognition | null = null
  lang = ''
  continuous = false
  interimResults = false
  onstart: (() => void) | null = null
  onend: (() => void) | null = null
  onerror: ((event: { error: string }) => void) | null = null
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null = null

  constructor() {
    FakeRecognition.latest = this
  }

  start() {
    this.onstart?.()
  }

  stop() {
    this.onend?.()
  }

  abort() {}

  emitFinal(text: string) {
    const result = Object.assign([{ transcript: text }], { isFinal: true })
    this.onresult?.({ resultIndex: 0, results: [result] })
  }
}

function Harness({ onFinal }: { onFinal: (text: string) => void }) {
  const recognition = useSpeechRecognition({ onFinal })
  return (
    <div>
      <p>{recognition.state}</p>
      <p>{recognition.interimText}</p>
      <button type="button" onClick={recognition.start}>start</button>
      <button type="button" onClick={recognition.stop}>stop</button>
    </div>
  )
}

afterEach(() => {
  Reflect.deleteProperty(window, 'SpeechRecognition')
  Reflect.deleteProperty(window, 'webkitSpeechRecognition')
  FakeRecognition.latest = null
})

describe('browser speech recognition adapter', () => {
  it('reports unsupported without blocking fallback controls', () => {
    render(<Harness onFinal={vi.fn()} />)

    expect(screen.getByText('unsupported')).toBeVisible()
    expect(screen.getByRole('button', { name: 'start' })).toBeEnabled()
  })

  it('emits a final Vietnamese utterance', async () => {
    Object.defineProperty(window, 'webkitSpeechRecognition', { configurable: true, value: FakeRecognition })
    const onFinal = vi.fn()
    const user = userEvent.setup()
    render(<Harness onFinal={onFinal} />)

    await user.click(screen.getByRole('button', { name: 'start' }))
    expect(screen.getByText('listening')).toBeVisible()
    expect(FakeRecognition.latest?.lang).toBe('vi-VN')

    act(() => FakeRecognition.latest?.emitFinal('Tôi muốn đặt hai vé đi Đà Lạt'))

    expect(onFinal).toHaveBeenCalledWith('Tôi muốn đặt hai vé đi Đà Lạt')
  })
})


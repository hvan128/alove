export type DeviceSpeechResult = 'speaking' | 'unsupported'

export type SpeakOptions = {
  /** Called once when the utterance finishes or is cancelled/errors. */
  onEnd?: () => void
}

export function speakVietnamese(text: string, options: SpeakOptions = {}): DeviceSpeechResult {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
    return 'unsupported'
  }

  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'vi-VN'
  if (options.onEnd) {
    utterance.onend = options.onEnd
    utterance.onerror = options.onEnd
  }
  window.speechSynthesis.speak(utterance)
  return 'speaking'
}

export function stopVietnameseSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}

export type DeviceSpeechResult = 'speaking' | 'unsupported'

export function speakVietnamese(text: string): DeviceSpeechResult {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') {
    return 'unsupported'
  }

  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'vi-VN'
  window.speechSynthesis.speak(utterance)
  return 'speaking'
}

export function stopVietnameseSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}


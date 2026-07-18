import { useEffect } from 'react'

// Hồi âm chuông Việt Nam: sóng sin 425 Hz, đổ chuông 1 giây rồi nghỉ 2 giây.
const TONE_HZ = 425
const RING_SECONDS = 1
const CYCLE_SECONDS = 3
const VOLUME = 0.09

/**
 * Phát tiếng "tút... tút..." trong lúc chờ tổng đài viên bắt máy.
 *
 * Sinh bằng Web Audio nên không cần file âm thanh và không đụng tới luồng audio
 * của phòng LiveKit. Người gọi vừa bấm nút gọi nên trình duyệt đã có cử chỉ
 * người dùng, AudioContext chạy được ngay.
 */
export function useRingback(active: boolean): void {
  useEffect(() => {
    if (!active || typeof window === 'undefined') return
    const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtor) return

    let context: AudioContext
    try {
      context = new AudioCtor()
    } catch {
      return
    }

    const gain = context.createGain()
    gain.gain.value = 0.0001
    gain.connect(context.destination)

    const oscillator = context.createOscillator()
    oscillator.type = 'sine'
    oscillator.frequency.value = TONE_HZ
    oscillator.connect(gain)
    oscillator.start()

    // Lên/xuống theo dốc thay vì bật tắt đột ngột, tránh tiếng "cụp" ở hai đầu.
    const ring = () => {
      const now = context.currentTime
      gain.gain.cancelScheduledValues(now)
      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(VOLUME, now + 0.03)
      gain.gain.setValueAtTime(VOLUME, now + RING_SECONDS - 0.05)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + RING_SECONDS)
    }

    ring()
    const timer = window.setInterval(ring, CYCLE_SECONDS * 1000)

    return () => {
      window.clearInterval(timer)
      try {
        oscillator.stop()
        oscillator.disconnect()
        gain.disconnect()
        void context.close()
      } catch {
        // context có thể đã đóng khi component unmount
      }
    }
  }, [active])
}

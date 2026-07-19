import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'

import { AloveProductTour } from './alove-product-tour'

beforeAll(() => {
  class NoopObserver {
    observe() {}
    disconnect() {}
  }
  Object.defineProperty(globalThis, 'IntersectionObserver', { writable: true, value: NoopObserver })
})

/** Caption và câu nói bị chia nhỏ qua nhiều thẻ highlight, nên phải soi textContent. */
function tourText(): string {
  return screen.getByTestId('alove-product-tour-stage').textContent ?? ''
}

async function openStage(name: string, settled: string) {
  fireEvent.click(screen.getByRole('button', { name }))
  await waitFor(() => expect(tourText()).toContain(settled))
}

describe('AloveProductTour', () => {
  it('bấm vào một bước thì hiện trạng thái đã hoàn tất, không phải khung hình nửa chừng', async () => {
    render(<AloveProductTour />)

    // Bước 1 chạy theo nhịp: transcript dài dần rồi mới chốt. Bấm tay phải ra câu đầy đủ.
    await openStage('Bước 1: Nói nhu cầu', 'thanh toán online luôn.')

    // Bước 3 phát lại hội thoại từng câu và điền booking dần; nhịp cuối là đã giữ ghế và đủ danh tính.
    await openStage('Bước 3: Giữ ghế & xác nhận', 'Đúng rồi, đặt giúp mình.')
    expect(tourText()).toContain('Nguyễn Minh Anh')
    expect(tourText()).toContain('A1, A2')
  })

  it('bước tìm chuyến nêu rõ chỗ code-switch và từ địa phương kèm nghĩa chuẩn hoá', async () => {
    render(<AloveProductTour />)
    await openStage('Bước 2: Alove tìm chuyến', 'Code-switch Việt–Anh')

    const text = tourText()
    for (const gloss of ['book → đặt', 'online → trực tuyến', 'vô → vào', 'mô → nào', 'hỉ → nhé']) {
      expect(text).toContain(gloss)
    }
  })

  it('câu nói minh hoạ và transcript phẳng dựng từ cùng một nguồn nên không lệch nhau', async () => {
    render(<AloveProductTour />)

    await openStage('Bước 1: Nói nhu cầu', 'thanh toán online luôn.')
    const spoken = 'Cho mình book hai vé từ Hà Nội vô Vinh, chuyến mô gần nhất hỉ, thanh toán online luôn.'
    expect(tourText()).toContain(spoken)

    await openStage('Bước 2: Alove tìm chuyến', 'Code-switch Việt–Anh')
    expect(tourText()).toContain(spoken)
  })
})

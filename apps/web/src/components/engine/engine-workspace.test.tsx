import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EngineWorkspace } from './engine-workspace'

afterEach(() => vi.unstubAllGlobals())

describe('lõi giọng nói Alove (/engine)', () => {
  it('starts with an empty transcript and a booking still collecting information', () => {
    render(<EngineWorkspace />)

    expect(screen.getByText(/Chưa có transcript/i)).toBeInTheDocument()
    expect(screen.getByText('Đang thu thập')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Chạy nhận diện' })).toBeDisabled()
  })

  it('shows the chosen file and enables the run button once audio is selected', async () => {
    const user = userEvent.setup()
    render(<EngineWorkspace />)

    await user.upload(screen.getByLabelText('Tải file audio'), new File(['audio'], 'giong-mien-trung.wav', { type: 'audio/wav' }))

    expect(screen.getByText('giong-mien-trung.wav')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Chạy nhận diện' })).toBeEnabled()
  })

  it('reports denied microphone access instead of crashing when getUserMedia is unavailable', async () => {
    const user = userEvent.setup()
    render(<EngineWorkspace />)

    await user.click(screen.getByRole('button', { name: 'Ghi âm mic' }))

    expect(await screen.findByText('Chưa có quyền microphone.')).toBeInTheDocument()
  })

  it('sends the selected file to the baseline comparison endpoint when a run starts', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ text: 'bản ghi đối chứng không dấu' }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const user = userEvent.setup()
    render(<EngineWorkspace />)

    await user.upload(screen.getByLabelText('Tải file audio'), new File(['audio'], 'call-noisy.wav', { type: 'audio/wav' }))
    await user.click(screen.getByRole('button', { name: 'Chạy nhận diện' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/engine/baseline', expect.objectContaining({ method: 'POST' })))
    const body = fetchMock.mock.calls[0]?.[1]?.body as FormData
    expect(body.get('audio')).toBeInstanceOf(File)

    expect(await screen.findByText('bản ghi đối chứng không dấu')).toBeInTheDocument()
  })
})

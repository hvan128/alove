'use client'

import { useEffect, useRef, useState } from 'react'
import type { BusDemoWorkspace, CallMessage, CallMessageChannel, CallMode, CallRole } from '@ordervoice/contracts'
import { advanceBookingAgent, confirmBooking } from '@ordervoice/core/bus-booking'
import { useSpeechRecognition } from '@/hooks/use-speech-recognition'
import { speakVietnamese, stopVietnameseSpeech } from '@/lib/device-speech'
import { CallHeader } from './call-header'
import { CustomerCallCard } from './customer-call-card'
import { CareDeskCard } from './care-desk-card'

export function BusCallWorkspace({ initialWorkspace }: { initialWorkspace: BusDemoWorkspace }) {
  const [workspace, setWorkspace] = useState(initialWorkspace)
  const [customerText, setCustomerText] = useState('')
  const [staffReply, setStaffReply] = useState('')
  const [elapsedSec, setElapsedSec] = useState(0)
  const [speechStatus, setSpeechStatus] = useState<string | null>(null)
  const [lastSpoken, setLastSpoken] = useState('')
  const sequence = useRef(0)

  useEffect(() => {
    if (workspace.callStatus !== 'connected' || !workspace.startedAt) return
    const startedAt = new Date(workspace.startedAt).getTime()
    const update = () => setElapsedSec(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)))
    update()
    const interval = window.setInterval(update, 1000)
    return () => window.clearInterval(interval)
  }, [workspace.callStatus, workspace.startedAt])

  const createMessage = (role: CallRole, text: string, channel: CallMessageChannel): CallMessage => {
    sequence.current += 1
    return {
      id: `${role}-${String(sequence.current).padStart(3, '0')}`,
      conversationId: workspace.conversationId,
      role,
      text,
      createdAt: new Date().toISOString(),
      channel,
      final: true,
    }
  }

  const startCall = () => {
    const now = new Date().toISOString()
    const system = createMessage('system', 'Web Call đã kết nối. Demo chạy trong cùng trình duyệt.', 'text')
    setWorkspace({ ...workspace, callStatus: 'connected', startedAt: now, endedAt: null, messages: [...workspace.messages, system] })
  }

  const endCall = () => {
    const ended = createMessage('system', 'Cuộc gọi đã kết thúc. Nội dung và phiếu vé được giữ lại.', 'text')
    setWorkspace({ ...workspace, callStatus: 'ended', endedAt: new Date().toISOString(), messages: [...workspace.messages, ended] })
  }

  const changeMode = (mode: CallMode) => {
    setWorkspace({ ...workspace, mode })
  }

  const submitCustomer = (text: string, channel: CallMessageChannel = 'preset') => {
    if (workspace.callStatus !== 'connected' || workspace.booking.status === 'confirmed') return
    const customer = createMessage('customer', text, channel)
    const turn = advanceBookingAgent(workspace.booking, customer)
    const messages = [...workspace.messages, customer]
    if (workspace.mode === 'auto') {
      messages.push(createMessage('agent', turn.reply, 'text'))
      speakReply(turn.reply)
    }
    setWorkspace({ ...workspace, messages, booking: turn.draft })
  }

  const sendStaffReply = () => {
    const text = staffReply.trim()
    if (!text) return
    if (workspace.callStatus !== 'connected') return
    setWorkspace({ ...workspace, messages: [...workspace.messages, createMessage('staff', text, 'text')] })
    speakReply(text)
    setStaffReply('')
  }

  const confirmByStaff = () => {
    if (workspace.callStatus !== 'connected' || workspace.booking.status === 'confirmed') return
    const booking = confirmBooking(workspace.booking, 'staff')
    const reply = `Em đã xác nhận vé. Mã vé ${booking.bookingCode}, ghế ${booking.seats.join(', ')}.`
    const message = createMessage('staff', reply, 'text')
    setWorkspace({ ...workspace, booking, messages: [...workspace.messages, message] })
    speakReply(reply)
  }

  const recognition = useSpeechRecognition({
    onFinal: (text) => {
      setCustomerText(text)
      submitCustomer(text, 'voice')
    },
  })

  function speakReply(text: string) {
    setLastSpoken(text)
    const result = speakVietnamese(text)
    setSpeechStatus(result === 'speaking' ? 'Đang phát giọng tiếng Việt của thiết bị.' : 'Thiết bị không hỗ trợ giọng đọc. Nội dung text vẫn đầy đủ.')
  }

  const replayLast = () => {
    if (lastSpoken) speakReply(lastSpoken)
  }

  const stopSpeech = () => {
    stopVietnameseSpeech()
    setSpeechStatus('Đã dừng giọng đọc.')
  }

  return (
    <div className="mx-auto min-h-[100dvh] max-w-[1460px] px-4 py-5 sm:px-6 lg:py-7">
      <CallHeader status={workspace.callStatus} mode={workspace.mode} elapsedSec={elapsedSec} onModeChange={changeMode} onStart={startCall} onEnd={endCall} />
      <main className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(380px,0.92fr)]">
        <CustomerCallCard status={workspace.callStatus} messages={workspace.messages} booking={workspace.booking} value={customerText} onValueChange={setCustomerText} onSubmit={submitCustomer} recognitionState={recognition.state} interimText={recognition.interimText} onStartMic={recognition.start} onStopMic={recognition.stop} />
        <CareDeskCard mode={workspace.mode} status={workspace.callStatus} messages={workspace.messages} booking={workspace.booking} reply={staffReply} onReplyChange={setStaffReply} onSendReply={sendStaffReply} onConfirm={confirmByStaff} speechStatus={speechStatus} onReplay={replayLast} onStopSpeech={stopSpeech} />
      </main>
    </div>
  )
}

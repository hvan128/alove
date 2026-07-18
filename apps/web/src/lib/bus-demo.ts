import type { BusDemoWorkspace } from '@ordervoice/contracts'
import { createInitialBooking } from '@ordervoice/core/bus-booking'

export function createInitialBusDemoWorkspace(): BusDemoWorkspace {
  const conversationId = 'alove-call-demo-001'
  return {
    conversationId,
    callStatus: 'idle',
    mode: 'auto',
    isDemo: true,
    startedAt: null,
    endedAt: null,
    messages: [],
    booking: createInitialBooking(conversationId),
  }
}

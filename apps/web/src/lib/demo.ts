import type { DemoWorkspace } from '@ordervoice/contracts'

export function createInitialDemoWorkspace(): DemoWorkspace {
  const conversationId = 'conversation-demo-001'
  return {
    conversationId,
    activeSource: 'browser',
    sourceStates: { browser: 'demo', telephony: 'unavailable', replay: 'ready' },
    isDemo: true,
    transcript: [],
    draft: {
      id: `order-${conversationId}`,
      conversationId,
      customerId: null,
      customerName: null,
      status: 'capturing',
      lines: [],
      exceptions: [],
      approvedBy: null,
      approvedAt: null,
      externalReference: null,
    },
    reply: {
      id: 'reply-demo-001',
      conversationId,
      text: 'Dạ em đang kiểm tra đơn giúp chị. Sau khi người vận hành duyệt, em có thể đọc lại phản hồi xác nhận.',
      approvedForSpeech: true,
    },
    step: 0,
  }
}

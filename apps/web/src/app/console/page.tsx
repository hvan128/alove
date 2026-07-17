import { AppShell } from '@/components/ui/app-shell'
import { BusCallWorkspace } from '@/components/bus-call/bus-call-workspace'
import { createInitialBusDemoWorkspace } from '@/lib/bus-demo'

export default function ConsolePage() {
  return <AppShell><BusCallWorkspace initialWorkspace={createInitialBusDemoWorkspace()} /></AppShell>
}

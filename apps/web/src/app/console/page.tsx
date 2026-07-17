import { AppShell } from '@/components/ui/app-shell'
import { ConsoleWorkspace } from '@/components/console/console-workspace'
import { createInitialDemoWorkspace } from '@/lib/demo'

export default function ConsolePage() {
  return <AppShell><ConsoleWorkspace initialWorkspace={createInitialDemoWorkspace()} /></AppShell>
}

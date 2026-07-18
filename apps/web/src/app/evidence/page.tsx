import type { Metadata } from 'next'

import evidenceArtifact from '../../../public/evidence/hard-case-results.json'
import { EvidenceResultsView } from '@/components/evidence/evidence-results'
import { AppShell } from '@/components/ui/app-shell'
import { parseEvidenceResults } from '@/lib/evidence/schema'

export const metadata: Metadata = {
  title: 'Bằng chứng nhận dạng giọng nói | Alove',
  description: 'Kết quả kiểm thử tổng hợp, không PII, so sánh VALSEA và Whisper trên cùng đầu vào.',
}

export default function EvidencePage() {
  const results = parseEvidenceResults(evidenceArtifact)
  return <AppShell context="review"><main><EvidenceResultsView results={results} /></main></AppShell>
}

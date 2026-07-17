import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'OrderVoice — Voice-to-order copilot',
  description: 'Vietnamese voice-to-order console with evidence and human approval.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi" className={`${geistSans.variable} ${geistMono.variable}`}><body className="antialiased">{children}</body></html>
}

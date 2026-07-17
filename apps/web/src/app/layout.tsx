import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'VéĐi | Trợ lý đặt vé qua cuộc gọi',
  description: 'Demo Web Call đặt vé nhà xe với nhân viên chăm sóc và Agent tự động nói tiếng Việt.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi" className={`${geistSans.variable} ${geistMono.variable}`}><body className="antialiased">{children}</body></html>
}

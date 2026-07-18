import type { Metadata } from 'next'
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google'
import './globals.css'

// IBM Plex có subset Vietnamese đầy đủ cho cả sans lẫn mono nên tên hành khách,
// mã vé và thời lượng không bị trộn glyph fallback.
const plexSans = IBM_Plex_Sans({
  variable: '--font-plex-sans',
  weight: ['400', '500', '600', '700'],
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
})

const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  weight: ['400', '500', '600'],
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Alove | Alo là có vé',
  description: 'Đặt vé nhà xe Mai Anh qua cuộc gọi với nhân viên chăm sóc và Agent tự động nói tiếng Việt.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi" className={`${plexSans.variable} ${plexMono.variable}`}><body className="antialiased">{children}</body></html>
}

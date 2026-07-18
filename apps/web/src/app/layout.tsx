import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'VéĐi | Trợ lý đặt vé qua cuộc gọi',
  description: 'Demo Web Call đặt vé nhà xe với nhân viên chăm sóc và Agent tự động nói tiếng Việt.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>
}

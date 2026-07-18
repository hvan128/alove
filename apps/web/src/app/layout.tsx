import type { Metadata } from 'next'
import { JetBrains_Mono, Lora } from 'next/font/google'
import localFont from 'next/font/local'
import './globals.css'

const beVietnamPro = localFont({
  src: [
    { path: '../../public/fonts/be-vietnam-pro/BeVietnamPro-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/be-vietnam-pro/BeVietnamPro-Italic.woff2', weight: '400', style: 'italic' },
    { path: '../../public/fonts/be-vietnam-pro/BeVietnamPro-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../../public/fonts/be-vietnam-pro/BeVietnamPro-MediumItalic.woff2', weight: '500', style: 'italic' },
    { path: '../../public/fonts/be-vietnam-pro/BeVietnamPro-SemiBold.woff2', weight: '600', style: 'normal' },
    { path: '../../public/fonts/be-vietnam-pro/BeVietnamPro-Bold.woff2', weight: '700', style: 'normal' },
    { path: '../../public/fonts/be-vietnam-pro/BeVietnamPro-ExtraBold.woff2', weight: '800', style: 'normal' },
  ],
  variable: '--font-be-vietnam-pro',
  display: 'swap',
})

const lora = Lora({
  variable: '--font-lora',
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  weight: ['400', '500', '600'],
  subsets: ['latin', 'latin-ext', 'vietnamese'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Alove | Alo là có vé',
  description: 'Đặt vé nhà xe Mai Anh qua cuộc gọi với nhân viên chăm sóc và Agent tự động nói tiếng Việt.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi" className={`${beVietnamPro.variable} ${lora.variable} ${jetbrainsMono.variable}`}><body className="font-sans antialiased bg-surface text-ink">{children}</body></html>
}

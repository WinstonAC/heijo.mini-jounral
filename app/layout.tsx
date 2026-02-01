import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth'
import { VoiceSettingsProvider } from '@/lib/voiceSettings'
import ErrorBoundary from '@/components/ErrorBoundary'

export const metadata: Metadata = {
  title: 'Heijō MiniJournal',
  description: 'A privacy-first, resilient voice journal with Dieter Rams design',
  manifest: '/site.webmanifest?v=8',
  robots: 'noindex, nofollow', // Privacy-first: don't index personal journals
  referrer: 'strict-origin-when-cross-origin',
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon-32.png',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Heijō',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#1A1A1A', // Match graphite-charcoal for consistent icon color
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-inter min-h-screen bg-gradient-to-b from-neutral-100 via-zinc-100/80 to-gray-300 text-heijo-text relative">
        <ErrorBoundary>
          <AuthProvider>
            <VoiceSettingsProvider>
              {children}
            </VoiceSettingsProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}




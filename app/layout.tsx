import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth'
import { VoiceSettingsProvider } from '@/lib/voiceSettings'
import ErrorBoundary from '@/components/ErrorBoundary'

// Get site URL from environment or use default
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://journal.heijo.io'
const ogImageUrl = `${siteUrl}/og-image.png`

export const metadata: Metadata = {
  title: 'Heijō MiniJournal',
  description: 'A privacy-first, resilient voice journal with Dieter Rams design',
  manifest: '/site.webmanifest?v=15',
  robots: 'noindex, nofollow', // Privacy-first: don't index personal journals
  referrer: 'strict-origin-when-cross-origin',
  icons: {
    icon: [
      { url: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { url: '/favicon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
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
  openGraph: {
    type: 'website',
    title: 'Heijō MiniJournal',
    description: 'A privacy-first, resilient voice journal with Dieter Rams design',
    url: siteUrl,
    siteName: 'Heijō',
    images: [
      {
        url: ogImageUrl,
        width: 1200,
        height: 630,
        alt: 'Heijō MiniJournal - Micro-moments. Macro-clarity.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Heijō MiniJournal',
    description: 'A privacy-first, resilient voice journal with Dieter Rams design',
    images: [ogImageUrl],
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




import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth'
import ErrorBoundary from '@/components/ErrorBoundary'

export const metadata: Metadata = {
  title: 'Heijō MiniJournal',
  description: 'A privacy-first, resilient voice journal with Dieter Rams design',
  manifest: '/site.webmanifest',
  robots: 'noindex, nofollow', // Privacy-first: don't index personal journals
  referrer: 'strict-origin-when-cross-origin',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/icon-192.svg',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#F8F8F8',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-inter min-h-screen bg-gradient-to-b from-heijo-bg-top to-heijo-bg-bottom text-heijo-text">
        <ErrorBoundary>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}




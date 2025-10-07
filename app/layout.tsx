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
  maximumScale: 5,
  userScalable: true,
  themeColor: '#F8F8F8',
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
            {children}
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}




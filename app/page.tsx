import { redirect } from "next/navigation";
import type { Metadata } from 'next';

// Get site URL from environment or use default
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://journal.heijo.io';
const ogImageUrl = `${siteUrl}/og-image.png`;

export const metadata: Metadata = {
  title: 'Heijō MiniJournal',
  description: 'A privacy-first, resilient voice journal with Dieter Rams design',
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
};

export default function Home() {
  redirect("/login");
}




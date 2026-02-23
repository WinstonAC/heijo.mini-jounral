import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || '';
  const isSocialCrawler = /facebookexternalhit|twitterbot|linkedinbot|slackbot|whatsapp|meta-externalagent/i.test(userAgent);
  
  // For social media crawlers on root path, serve OG tags
  if (isSocialCrawler && request.nextUrl.pathname === '/') {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://journal.heijo.io';
    const ogImageUrl = `${siteUrl}/og-image.png`;
    
    // Return HTML with OG tags for crawlers
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Heijō MiniJournal</title>
  <meta name="description" content="A privacy-first, resilient voice journal with Dieter Rams design">
  <meta property="og:type" content="website">
  <meta property="og:title" content="Heijō MiniJournal">
  <meta property="og:description" content="A privacy-first, resilient voice journal with Dieter Rams design">
  <meta property="og:url" content="${siteUrl}">
  <meta property="og:site_name" content="Heijō">
  <meta property="og:image" content="${ogImageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="Heijō MiniJournal - Micro-moments. Macro-clarity.">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Heijō MiniJournal">
  <meta name="twitter:description" content="A privacy-first, resilient voice journal with Dieter Rams design">
  <meta name="twitter:image" content="${ogImageUrl}">
</head>
<body>
  <h1>Heijō MiniJournal</h1>
  <p>A privacy-first, resilient voice journal with Dieter Rams design</p>
</body>
</html>`;
    
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/',
};

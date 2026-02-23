'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  
  useEffect(() => {
    // Client-side redirect so crawlers can see OG tags first
    router.push('/login');
  }, [router]);

  // Return minimal HTML so crawlers can read OG tags from root layout
  return (
    <div style={{ display: 'none' }}>
      {/* This page exists only to serve OG tags from root layout */}
      {/* Users are redirected to /login via client-side navigation */}
    </div>
  );
}

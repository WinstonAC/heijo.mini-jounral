'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { trace } from '@/lib/diagnostics/routeTrace';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    trace('HomePage mounted - redirecting to login (intro removed)');
    router.push('/login');
  }, [router]);

  return null;
}




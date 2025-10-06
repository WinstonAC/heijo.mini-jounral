'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import IntroAnimation from '@/components/IntroAnimation';
import { hasSeenIntro, markIntroAsShown } from '@/lib/introUtils';
import { trace } from '@/lib/diagnostics/routeTrace';

export default function HomePage() {
  const [showIntro, setShowIntro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    trace('HomePage mounted', { hasSeenIntro: hasSeenIntro() });
    
    // Check if intro has been shown before
    if (hasSeenIntro()) {
      // Skip intro and go directly to login
      trace('Skipping intro, redirecting to login');
      router.push('/login');
    } else {
      // Show intro animation
      trace('Showing intro animation');
      setShowIntro(true);
      setIsLoading(false);
    }
  }, [router]);

  const handleIntroComplete = () => {
    // Navigate to login (intro component handles localStorage)
    trace('Intro completed, redirecting to login');
    // [Heijo Remediation 2025-01-06] Clear intro guard before navigation
    (window as any).__HEIJO_INTRO_ACTIVE__ = false;
    router.push('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (showIntro) {
    return <IntroAnimation onComplete={handleIntroComplete} />;
  }

  return null;
}




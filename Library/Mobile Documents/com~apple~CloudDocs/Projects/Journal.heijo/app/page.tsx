'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import IntroAnimation from '@/components/IntroAnimation';
import { hasSeenIntro, markIntroAsShown } from '@/lib/introUtils';

export default function HomePage() {
  const [showIntro, setShowIntro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if intro has been shown before
    if (hasSeenIntro()) {
      // Skip intro and go directly to login
      router.push('/login');
    } else {
      // Show intro animation
      setShowIntro(true);
      setIsLoading(false);
    }
  }, [router]);

  const handleIntroComplete = () => {
    // Mark intro as shown
    markIntroAsShown();
    // Navigate to login
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




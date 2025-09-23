'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import IntroAnimation from '@/components/IntroAnimation';
import LoginCard from '@/components/LoginCard';
import IntroDebug from '@/components/IntroDebug';
import { hasSeenIntro } from '@/lib/introUtils';

export default function HomePage() {
  const [currentView, setCurrentView] = useState<'loading' | 'intro' | 'login'>('loading');
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    // If user is already authenticated, go straight to journal
    if (user && !authLoading) {
      router.push('/journal');
      return;
    }

    // If auth is still loading, wait
    if (authLoading) {
      return;
    }

    // Check if intro has been shown before
    if (hasSeenIntro()) {
      // Skip intro and show login directly
      setCurrentView('login');
    } else {
      // Show intro animation
      setCurrentView('intro');
    }
  }, [user, authLoading, router]);

  const handleIntroComplete = () => {
    console.log('Intro completed, showing login card...');
    setCurrentView('login');
  };

  const handleLoginSuccess = () => {
    // Redirect to journal after successful login
    router.push('/journal');
  };

  // Debug logging
  console.log('HomePage render:', { currentView, authLoading, user });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (currentView === 'intro') {
    return <IntroAnimation onComplete={handleIntroComplete} />;
  }

  if (currentView === 'login') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <LoginCard onSuccess={handleLoginSuccess} />
        </div>
        <IntroDebug />
      </div>
    );
  }

  return null;
}




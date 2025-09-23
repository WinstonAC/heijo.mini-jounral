'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import IntroAnimation from '@/components/IntroAnimation';
import LoginCard from '@/components/LoginCard';
import { hasSeenIntro } from '@/lib/introUtils';

export default function HomePage() {
  const [showIntro, setShowIntro] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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
      setShowLogin(true);
      setIsLoading(false);
    } else {
      // Show intro animation
      setShowIntro(true);
      setIsLoading(false);
    }
  }, [user, authLoading, router]);

  const handleIntroComplete = () => {
    // Show login card after intro
    setShowIntro(false);
    setShowLogin(true);
  };

  const handleLoginSuccess = () => {
    // Redirect to journal after successful login
    router.push('/journal');
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (showIntro) {
    return <IntroAnimation onComplete={handleIntroComplete} />;
  }

  if (showLogin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <LoginCard onSuccess={handleLoginSuccess} />
      </div>
    );
  }

  return null;
}




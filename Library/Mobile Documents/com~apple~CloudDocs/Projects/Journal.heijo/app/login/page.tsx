'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState('');
  const [showMagicLink, setShowMagicLink] = useState(false);
  const router = useRouter();
  const { signIn, signUp, signInWithMagicLink } = useAuth();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const { error } = isSignUp 
        ? await signUp(email, password)
        : await signIn(email, password);

      if (error) {
        setMessage(error.message);
      } else if (isSignUp) {
        setMessage('Check your email for a confirmation link!');
      } else {
        router.push('/journal');
      }
    } catch (error) {
      setMessage('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const { error } = await signInWithMagicLink(email);
      if (error) {
        setMessage(error.message);
      } else {
        setMessage('Check your email for the magic link!');
      }
    } catch (error) {
      setMessage('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F3] flex items-center justify-center p-4">
      <div className="max-w-md w-full mx-auto">
        <div className="bg-[#FAFAF8] rounded-lg border-2 border-[#B8B8B8] p-8">
          <div className="text-center space-y-8">
            {/* Logo/Title */}
            <div className="space-y-6">
              {/* H Icon with subtle halo */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-16 h-16 border-2 border-[#8A8A8A] rounded-lg flex items-center justify-center bg-gradient-to-br from-[#F8F8F8] to-[#F0F0F0]">
                    <span className="text-3xl font-bold text-[#2A2A2A]" style={{ fontFamily: 'Neue Haas Grotesk Display, sans-serif' }}>H</span>
                  </div>
                  <div className="absolute inset-0 w-16 h-16 border border-[#8A8A8A] rounded-lg opacity-20 blur-sm"></div>
                </div>
              </div>
              
              <div>
                <h1 className="text-3xl font-bold text-[#1A1A1A] mb-3" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  Welcome to Heijō MiniJournal
                </h1>
                <p className="text-lg font-light text-[#6A6A6A]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  Your ritual space for reflection, reset, and reconnection.
                </p>
              </div>
            </div>

            {/* Auth Forms */}
            <div className="space-y-6">
              {!showMagicLink ? (
                <form onSubmit={handleEmailAuth} className="space-y-5">
                  <div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full px-4 py-4 text-base border border-[#B8B8B8] rounded-lg bg-[#F8F8F8] focus:border-[#8A8A8A] focus:outline-none focus:ring-0 focus:bg-white transition-all duration-300"
                      required
                    />
                  </div>
                  
                  {!isSignUp && (
                    <div>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full px-4 py-4 text-base border border-[#B8B8B8] rounded-lg bg-[#F8F8F8] focus:border-[#8A8A8A] focus:outline-none focus:ring-0 focus:bg-white transition-all duration-300"
                        required
                      />
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || !email || (!isSignUp && !password)}
                    className="w-full px-6 py-4 text-base font-medium bg-[#1A1A1A] text-white rounded-lg hover:bg-[#2A2A2A] hover:shadow-[0_0_20px_rgba(26,26,26,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  >
                    {isLoading ? 'Please wait...' : 'Start Journaling'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleMagicLink} className="space-y-5">
                  <div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full px-4 py-4 text-base border border-[#B8B8B8] rounded-lg bg-[#F8F8F8] focus:border-[#8A8A8A] focus:outline-none focus:ring-0 focus:bg-white transition-all duration-300"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !email}
                    className="w-full px-6 py-4 text-base font-medium bg-[#1A1A1A] text-white rounded-lg hover:bg-[#2A2A2A] hover:shadow-[0_0_20px_rgba(26,26,26,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  >
                    {isLoading ? 'Sending...' : 'Send Magic Link'}
                  </button>
                </form>
              )}

              {/* Message */}
              {message && (
                <div className={`text-sm p-4 rounded-lg border ${
                  message.includes('Check your email') 
                    ? 'bg-[#F0F8F0] text-[#2A5A2A] border-[#B8D8B8]' 
                    : 'bg-[#F8F0F0] text-[#5A2A2A] border-[#D8B8B8]'
                }`}>
                  {message}
                </div>
              )}

              {/* Auth Options */}
              <div className="space-y-3 text-center">
                <button
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-sm text-[#6A6A6A] hover:text-[#1A1A1A] transition-colors duration-200 block w-full"
                >
                  {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
                </button>
                
                <button
                  onClick={() => setShowMagicLink(!showMagicLink)}
                  className="text-sm text-[#6A6A6A] hover:text-[#1A1A1A] transition-colors duration-200 block w-full"
                >
                  {showMagicLink ? 'Use password instead' : 'Use magic link instead'}
                </button>
                
                {!isSignUp && (
                  <button
                    onClick={() => setIsSignUp(true)}
                    className="text-sm text-[#6A6A6A] hover:text-[#1A1A1A] transition-colors duration-200 block w-full"
                  >
                    Sign up with password
                  </button>
                )}
              </div>
            </div>

            {/* Privacy note */}
            <div className="pt-6 border-t border-[#D8D8D8]">
              <p className="text-sm text-[#8A8A8A] leading-relaxed" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                Private by design. Stored on your device. Yours alone.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}




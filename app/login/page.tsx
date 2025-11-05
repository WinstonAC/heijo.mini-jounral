'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { trace } from '@/lib/diagnostics/routeTrace';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState('');
  const [showMagicLink, setShowMagicLink] = useState(false);
  const router = useRouter();
  const { signIn, signUp, signInWithMagicLink } = useAuth();

  useEffect(() => {
    trace('LoginPage mounted');
    
    // Intro removed; guard no longer relevant
    
    return () => trace('LoginPage unmounted');
  }, []);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const { error } = isSignUp 
        ? await signUp(email, password)
        : await signIn(email, password);

      if (error) {
        // Provide helpful guidance for common auth errors
        if (error.message?.includes('Invalid login credentials')) {
          setMessage('❌ Invalid credentials. Try creating an account first or check your email/password.');
        } else if (error.message?.includes('Email not confirmed') || error.message?.includes('email not confirmed')) {
          setMessage('📧 Please check your email and click the confirmation link before signing in.');
        } else {
          setMessage(error.message);
        }
      } else if (isSignUp) {
        setMessage('✅ Account created! Please check your email and click the confirmation link, then come back to sign in.');
        setIsSignUp(false); // Switch to sign in mode
      } else {
        setMessage('✅ Sign in successful! Redirecting...');
        setTimeout(() => router.push('/journal'), 1000);
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
    <div className="min-h-screen bg-gradient-to-b from-neutral-100 via-zinc-100/80 to-gray-300 overflow-y-auto flex flex-col justify-center pb-12 sm:pb-0 p-4">
      <div className="w-[90%] max-w-md mx-auto">
        <div className="bg-gradient-to-b from-white via-gray-50/80 to-gray-100/60 rounded-xl border border-soft-silver p-8 shadow-lg backdrop-blur-sm iridescent">
          <div className="text-center space-y-8">
            {/* Logo/Title */}
            <div className="space-y-6 fade-in-up">
              {/* H Icon with silver finish */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full silver-button flex items-center justify-center breathing-pulse">
                    <span className="text-4xl font-bold text-graphite-charcoal brand-hero">H</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h1 className="text-3xl sm:text-5xl brand-hero text-graphite-charcoal mb-2 leading-tight">
                  <span className="word-by-word" style={{ animationDelay: '0.1s' }}>Welcome</span>{' '}
                  <span className="word-by-word" style={{ animationDelay: '0.3s' }}>to</span>{' '}
                  <span className="word-by-word" style={{ animationDelay: '0.5s' }}>
                    <span className="brand-hero">Heijō</span>
                    <span className="block sm:inline brand-label text-text-secondary sm:ml-2">mini-journal</span>
                  </span>
                </h1>
                <p className="text-lg body-text text-text-secondary leading-relaxed mt-4">
                  Micro-moments. Macro-clarity.
                </p>
              </div>
            </div>

            {/* Auth Forms */}
            <div className="space-y-6">
              {!showMagicLink ? (
                <form onSubmit={handleEmailAuth} className="space-y-6">
                  <div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full px-6 py-4 text-base border border-soft-silver rounded-lg bg-mist-white focus:border-soft-silver focus:outline-none focus:ring-0 focus:bg-white transition-all duration-300 text-graphite-charcoal placeholder-text-caption body-text"
                      required
                    />
                  </div>
                  
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-6 py-4 pr-12 text-base border border-soft-silver rounded-lg bg-mist-white focus:border-soft-silver focus:outline-none focus:ring-0 focus:bg-white transition-all duration-300 text-graphite-charcoal placeholder-text-caption body-text"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-caption hover:text-graphite-charcoal transition-colors duration-200 focus:outline-none"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.736m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !email || !password}
                    className="w-full px-8 py-5 text-lg font-medium silver-button text-graphite-charcoal rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  >
                    {isLoading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleMagicLink} className="space-y-6">
                  <div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full px-6 py-4 text-base border border-soft-silver rounded-lg bg-mist-white focus:border-soft-silver focus:outline-none focus:ring-0 focus:bg-white transition-all duration-300 text-graphite-charcoal placeholder-text-caption body-text"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !email}
                    className="w-full px-8 py-5 text-lg font-medium silver-button text-graphite-charcoal rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  >
                    {isLoading ? 'Sending...' : 'Send Magic Link'}
                  </button>
                  
                  {/* Back to Sign In button */}
                  <div className="text-center mt-4">
                    <button
                      onClick={() => setShowMagicLink(false)}
                      className="text-sm text-text-secondary hover:text-graphite-charcoal transition-colors duration-200 underline"
                    >
                      ← Back to Sign In with Password
                    </button>
                  </div>
                </form>
              )}

              {/* Message */}
              {message && (
                <div className={`text-sm p-6 rounded-lg border ${
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
                  className="text-sm text-text-caption hover:text-graphite-charcoal transition-colors duration-200 block w-full py-2 caption-text"
                >
                  {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
                </button>
                
                <button
                  onClick={() => setShowMagicLink(!showMagicLink)}
                  className="text-sm text-text-caption hover:text-graphite-charcoal transition-colors duration-200 block w-full py-2 caption-text"
                >
                  {showMagicLink ? 'Use password instead' : 'Use magic link instead'}
                </button>
              </div>
            </div>

            {/* Privacy note */}
            <div className="pt-6 border-t border-soft-silver">
              <p className="text-sm text-text-caption leading-relaxed caption-text">
                Private by design. Stored on your device. Yours alone.
              </p>
            </div>

            
          </div>
        </div>
      </div>
    </div>
  );
}




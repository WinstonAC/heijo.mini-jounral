'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

interface LoginCardProps {
  onSuccess?: () => void;
}

export default function LoginCard({ onSuccess }: LoginCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [showMagicLink, setShowMagicLink] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();
  const { signIn, signUp, signInWithMagicLink } = useAuth();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const { error } = isSignUp 
        ? await signUp(email, password)
        : await signIn(email, password);

      if (error) {
        setError(error.message);
      } else if (isSignUp) {
        setSuccessMessage('Check your email for a confirmation link!');
      } else {
        onSuccess?.();
        router.push('/journal');
      }
    } catch (error) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const { error } = await signInWithMagicLink(email);
      if (error) {
        setError('Could not send link, try again.');
      } else {
        setSuccessMessage('Check your email for a login link.');
      }
    } catch (error) {
      setError('Could not send link, try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetMessages = () => {
    setError('');
    setSuccessMessage('');
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-gradient-to-b from-heijo-card-top to-heijo-card-bottom rounded-xl border border-heijo-border p-8 shadow-sm">
        <div className="text-center">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-heijo-border to-soft-silver flex items-center justify-center">
              <span className="text-3xl font-bold text-heijo-text">H</span>
            </div>
          </div>
          
          {/* Title with proper typography */}
          <div className="mb-8">
            <h1 className="text-4xl font-light text-heijo-text mb-2" style={{ fontFamily: 'Futura, URW Geometric, system-ui, sans-serif' }}>
              <span className="text-5xl">Heijō</span>
              <span className="text-2xl font-normal ml-2" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>mini-journal</span>
            </h1>
            <p className="text-lg text-text-secondary" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              micro-moments for macro-clarity.
            </p>
          </div>

          {/* Auth Tabs */}
          <div className="flex border-b border-gray-200 mt-8">
            <button
              onClick={() => {
                setShowMagicLink(false);
                resetMessages();
              }}
              className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                !showMagicLink
                  ? 'border-gray-800 text-gray-800'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Email & Password
            </button>
            <button
              onClick={() => {
                setShowMagicLink(true);
                resetMessages();
              }}
              className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
                showMagicLink
                  ? 'border-gray-800 text-gray-800'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Magic Link
            </button>
          </div>

          {/* Auth Forms */}
          <div className="space-y-6">
            {!showMagicLink ? (
              <form onSubmit={handleEmailAuth} className="space-y-4">
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      resetMessages();
                    }}
                    placeholder="Enter your email"
                    className="w-full px-4 py-3 text-base border border-gray-200 rounded-lg bg-gray-50 focus:border-gray-300 focus:outline-none focus:ring-0 focus:bg-white transition-all duration-300 text-gray-800 placeholder-gray-500"
                    required
                  />
                </div>
                
                <div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      resetMessages();
                    }}
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 text-base border border-gray-200 rounded-lg bg-gray-50 focus:border-gray-300 focus:outline-none focus:ring-0 focus:bg-white transition-all duration-300 text-gray-800 placeholder-gray-500"
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsSignUp(false)}
                    className={`flex-1 px-4 py-3 text-base font-medium rounded-lg transition-all duration-300 ${
                      !isSignUp
                        ? 'bg-gray-800 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSignUp(true)}
                    className={`flex-1 px-4 py-3 text-base font-medium rounded-lg transition-all duration-300 ${
                      isSignUp
                        ? 'bg-gray-800 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Sign Up
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !email || !password}
                  className="w-full px-6 py-3 text-base font-medium bg-gray-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:bg-gray-700"
                >
                  {isLoading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
                </button>
              </form>
            ) : (
              <form onSubmit={handleMagicLink} className="space-y-4">
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      resetMessages();
                    }}
                    placeholder="Enter your email"
                    className="w-full px-4 py-3 text-base border border-gray-200 rounded-lg bg-gray-50 focus:border-gray-300 focus:outline-none focus:ring-0 focus:bg-white transition-all duration-300 text-gray-800 placeholder-gray-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !email}
                  className="w-full px-6 py-3 text-base font-medium bg-gradient-to-b from-heijo-silver-top to-heijo-silver-bottom text-heijo-text rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:from-[#E2E2E2] hover:to-[#CFCFCF] shadow-sm border border-heijo-border-light"
                >
                  {isLoading ? 'Sending...' : 'Send Magic Link'}
                </button>
              </form>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-600">{successMessage}</p>
              </div>
            )}
          </div>

          {/* Privacy note */}
          <div className="pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
              Private by design. Stored on your device. Yours alone.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

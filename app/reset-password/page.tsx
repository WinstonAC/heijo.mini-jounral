'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { trace } from '@/lib/diagnostics/routeTrace';

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [canReset, setCanReset] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    trace('ResetPasswordPage mounted');

    if (!supabase || !isSupabaseConfigured()) {
      setMessage('Supabase is not configured. Please try again later.');
      setCanReset(false);
      return () => trace('ResetPasswordPage unmounted');
    }

    // Supabase sends users here with ?type=recovery&token=...
    // Ensure the recovery session is available before allowing password change.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setCanReset(true);
      } else {
        setMessage('Reset link expired or invalid. Please request a new password reset email.');
        setCanReset(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' && session) {
        setCanReset(true);
        setMessage('');
      }
    });

    return () => {
      trace('ResetPasswordPage unmounted');
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    if (!supabase) {
      setMessage('Supabase is not configured. Please try again later.');
      return;
    }

    if (!canReset) {
      setMessage('Reset link expired or invalid. Please request a new password reset email.');
      return;
    }

    if (password.length < 8) {
      setMessage('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match.');
      return;
    }

    try {
      setIsLoading(true);

      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setMessage(error.message || 'Failed to update password. Please try again.');
        return;
      }

      setShowSuccess(true);
      setMessage('✅ Password updated! You can now sign back in.');
      setPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err: any) {
      setMessage(err?.message || 'Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    if (!supabase || !isSupabaseConfigured()) {
      return (
        <p className="text-center text-sm text-text-caption">
          Supabase configuration missing. Please contact support.
        </p>
      );
    }

    return (
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter new password"
            className="w-full px-6 py-4 text-base border border-soft-silver rounded-lg bg-mist-white focus:border-soft-silver focus:outline-none focus:ring-0 focus:bg-white transition-all duration-300 text-graphite-charcoal placeholder-text-caption body-text"
            required
            minLength={8}
            disabled={!canReset || isLoading}
          />
        </div>

        <div>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="w-full px-6 py-4 text-base border border-soft-silver rounded-lg bg-mist-white focus:border-soft-silver focus:outline-none focus:ring-0 focus:bg-white transition-all duration-300 text-graphite-charcoal placeholder-text-caption body-text"
            required
            minLength={8}
            disabled={!canReset || isLoading}
          />
        </div>

        <button
          type="submit"
          disabled={!canReset || isLoading}
          className="w-full px-8 py-5 text-lg font-medium silver-button text-graphite-charcoal rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
        >
          {isLoading ? 'Updating...' : 'Update Password'}
        </button>

        {!canReset && (
          <p className="text-sm text-center text-[#5A2A2A] bg-[#F8F0F0] border border-[#D8B8B8] rounded-lg p-4">
            Your reset link may have expired. Request a new reset email from the sign-in screen.
          </p>
        )}
      </form>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-100 via-zinc-100/80 to-gray-300 overflow-y-auto flex flex-col justify-center pb-12 sm:pb-0 p-4">
      <div className="w-[90%] max-w-md mx-auto">
        <div className="bg-gradient-to-b from-white via-gray-50/80 to-gray-100/60 rounded-xl border border-soft-silver p-8 shadow-lg backdrop-blur-sm iridescent">
          <div className="text-center space-y-8">
            <div className="space-y-6 fade-in-up">
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full silver-button flex items-center justify-center breathing-pulse">
                    <span className="text-4xl font-bold text-graphite-charcoal brand-hero">H</span>
                  </div>
                </div>
              </div>

              <div>
                <h1 className="text-3xl sm:text-5xl brand-hero text-graphite-charcoal mb-2 leading-tight">
                  <span className="word-by-word" style={{ animationDelay: '0.1s' }}>Reset</span>{' '}
                  <span className="word-by-word" style={{ animationDelay: '0.3s' }}>Password</span>
                </h1>
                <p className="text-lg body-text text-text-secondary leading-relaxed mt-4">
                  Create a new password to get back into your journal.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {renderContent()}

              {message && (
                <div className={`text-sm p-6 rounded-lg border ${message.includes('✅') ? 'bg-[#F0F8F0] text-[#2A5A2A] border-[#B8D8B8]' : 'bg-[#F8F0F0] text-[#5A2A2A] border-[#D8B8B8]'}`}>
                  {message}
                </div>
              )}

              {showSuccess && (
                <p className="text-sm text-center text-text-secondary">
                  Redirecting you to sign in…
                </p>
              )}

              <div className="text-center">
                <button
                  onClick={() => router.push('/login')}
                  className="text-sm text-text-caption hover:text-graphite-charcoal transition-colors duration-200 underline"
                >
                  ← Back to Sign In
                </button>
              </div>
            </div>

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



'use client';

import { useState, useEffect } from 'react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export default function OnboardingModal({ isOpen, onClose, userId }: OnboardingModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [slideIn, setSlideIn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Trigger slide-in animation
      setTimeout(() => setSlideIn(true), 10);
    } else {
      document.body.style.overflow = 'unset';
      setSlideIn(false);
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleGetStarted = async () => {
    setIsSaving(true);
    try {
      // Track analytics event
      try {
        const { analyticsCollector } = await import('@/lib/analytics');
        analyticsCollector.trackEvent('onboarding_completed', {
          timestamp: new Date().toISOString(),
          userId: userId,
        });
      } catch (error) {
        console.error('Error tracking analytics:', error);
      }

      // Mark onboarding as seen
      try {
        const { supabase } = await import('@/lib/supabaseClient');
        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.auth.updateUser({
              data: { has_seen_onboarding: true }
            });
          }
        }
      } catch (error) {
        console.error('Error updating user metadata:', error);
      }

      // Also store in localStorage as fallback
      localStorage.setItem('heijo-has-seen-onboarding', 'true');
    } catch (error) {
      console.error('Error saving onboarding preferences:', error);
    } finally {
      setIsSaving(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-ui-charcoal bg-opacity-90 flex items-center justify-center z-50 p-4">
      <div
        className={`bg-ui-screen rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8 space-y-8 border border-ui-warm-silver shadow-2xl transition-all duration-500 ${
          slideIn ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'
        }`}
      >
        {/* Welcome Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-ui font-semibold text-ui-charcoal">
            Welcome to Heijō
          </h1>
          <p className="text-lg italic text-ui-graphite font-content">
            micro moments for macro clarity
          </p>
        </div>

        {/* Quick Feature List */}
        <div className="bg-ui-warm-silver bg-opacity-30 rounded-lg p-6 space-y-4">
          <h3 className="text-base font-ui font-medium text-ui-charcoal mb-3">
            Getting Started
          </h3>
          <ul className="space-y-3 text-sm text-ui-graphite font-content">
            <li className="flex items-start gap-3">
              <span className="text-ui-press mt-1">•</span>
              <div>
                <span className="font-medium text-ui-charcoal">Voice & Text:</span> Record your thoughts or type them out
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-ui-press mt-1">•</span>
              <div>
                <span className="font-medium text-ui-charcoal">Tags:</span> Organize entries with tags for easy search
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-ui-press mt-1">•</span>
              <div>
                <span className="font-medium text-ui-charcoal">Save:</span> Entries auto-save as you write
              </div>
            </li>
          </ul>
        </div>

        {/* Settings Instructions */}
        <div className="bg-ui-press bg-opacity-10 rounded-lg p-6 border border-ui-press border-opacity-20">
          <div className="text-center space-y-3">
            <h3 className="text-base font-ui font-medium text-ui-charcoal">
              Configure Your App
            </h3>
            <p className="text-sm text-ui-graphite font-content">
              Click the <span className="font-medium text-ui-press">Settings</span> button above to set up reminders, notifications, and customize the app to your needs.
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <svg className="w-5 h-5 text-ui-press" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-xs text-ui-graphite font-medium">Look for the Settings button at the top</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={handleGetStarted}
            disabled={isSaving}
            className="flex-1 px-6 py-3 bg-ui-press text-white rounded-lg font-ui font-medium hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Setting up...' : 'Get Started'}
          </button>
        </div>
      </div>
    </div>
  );
}




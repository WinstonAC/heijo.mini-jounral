'use client';

import { useState, useEffect } from 'react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [tagsEnabled, setTagsEnabled] = useState(true);
  const [aiEnabled, setAiEnabled] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Welcome to Heijō
          </h2>
          <p className="text-sm text-[var(--ui-graphite)]">
            Your personal journaling companion
          </p>
        </div>

        {/* Privacy promise */}
        <div className="bg-[var(--ui-warm-silver)] rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            Privacy Promise
          </h3>
          <p className="text-xs text-[var(--ui-graphite)] leading-relaxed">
            Your journal entries are stored locally on your device. We don&apos;t collect, 
            analyze, or share your personal thoughts. Your data stays private and secure.
          </p>
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-900">Preferences</h3>
          
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-900">Enable Tags</span>
                <p className="text-xs text-[var(--ui-graphite)]">
                  Organize entries with categories
                </p>
              </div>
              <input
                type="checkbox"
                checked={tagsEnabled}
                onChange={(e) => setTagsEnabled(e.target.checked)}
                className="w-4 h-4 text-[var(--ui-press)] border-[var(--ui-silver)] rounded focus:ring-[var(--ui-press)]"
              />
            </label>

            <label className="flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-900">AI Features</span>
                <p className="text-xs text-[var(--ui-graphite)]">
                  Coming soon: Smart prompts and insights
                </p>
              </div>
              <input
                type="checkbox"
                checked={aiEnabled}
                onChange={(e) => setAiEnabled(e.target.checked)}
                disabled
                className="w-4 h-4 text-[var(--ui-press)] border-[var(--ui-silver)] rounded focus:ring-[var(--ui-press)] disabled:opacity-50"
              />
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm border border-[var(--ui-silver)] rounded-lg hover:bg-gray-100 transition-colors"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
}




'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PrivacyPage() {
  const router = useRouter();

  useEffect(() => {
    // Set page title
    document.title = 'Privacy Policy - Heijō';
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-100 via-zinc-100/80 to-gray-300 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-b from-white via-gray-50/80 to-gray-100/60 rounded-xl border border-soft-silver p-4 sm:p-6 lg:p-8 shadow-lg backdrop-blur-sm">
          {/* Back Button */}
          <div className="mb-6">
            <button
              onClick={() => {
                // Try to go back in history, or go to journal if no history
                if (window.history.length > 1) {
                  router.back();
                } else {
                  router.push('/journal');
                }
              }}
              className="flex items-center gap-2 text-sm text-text-caption hover:text-graphite-charcoal transition-colors duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          </div>

          <h1 className="text-2xl sm:text-3xl font-light text-graphite-charcoal mb-6 sm:mb-8 brand-hero">Privacy Policy</h1>
          
          <div className="prose prose-sm max-w-none">
            <p className="text-text-secondary mb-6 body-text">
                <strong>Last updated:</strong> {new Date().toLocaleDateString()}
              </p>
              
            <h2 className="text-lg sm:text-xl font-medium text-graphite-charcoal mb-3 sm:mb-4 subheading">Data Collection & Storage</h2>
            <p className="text-text-secondary mb-4 body-text">
              Heijō is designed with privacy-first principles. All your journal entries, voice recordings, 
              and personal data are stored locally on your device using AES-GCM encryption. We do not 
              collect, store, or transmit your personal content to our servers.
            </p>

            <h2 className="text-lg sm:text-xl font-medium text-graphite-charcoal mb-3 sm:mb-4 subheading">Local Data Storage</h2>
            <ul className="list-disc list-inside text-text-secondary mb-4 space-y-2 body-text">
              <li>All journal entries are encrypted using device-specific keys</li>
              <li>Voice recordings are processed locally and not stored unless you opt-in</li>
              <li>Data is stored in your browser&apos;s IndexedDB with encryption</li>
              <li>No data is transmitted to external servers without your explicit consent</li>
            </ul>

            <h2 className="text-lg sm:text-xl font-medium text-graphite-charcoal mb-3 sm:mb-4 subheading">Microphone Access</h2>
            <p className="text-text-secondary mb-4 body-text">
              Microphone access is requested only when you tap the record button. Voice data is processed 
              locally using your browser&apos;s speech recognition API and is not transmitted to external servers. 
              You can revoke microphone access at any time through your browser settings.
            </p>

            <h2 className="text-lg sm:text-xl font-medium text-graphite-charcoal mb-3 sm:mb-4 subheading">Data Export & Deletion</h2>
            <p className="text-text-secondary mb-4 body-text">
              You have full control over your data. You can export all your journal entries in JSON or CSV 
              format at any time. You can also delete all your data with a single tap. All data deletion 
              is permanent and cannot be undone.
            </p>

            <h2 className="text-lg sm:text-xl font-medium text-graphite-charcoal mb-3 sm:mb-4 subheading">Analytics & Telemetry</h2>
            <p className="text-text-secondary mb-4 body-text">
              Analytics and telemetry are completely optional and disabled by default. If you choose to 
              enable them, only anonymous usage statistics are collected (app performance, feature usage). 
              No personal content or journal entries are ever included in analytics data.
            </p>

            <h2 className="text-lg sm:text-xl font-medium text-graphite-charcoal mb-3 sm:mb-4 subheading">Data Retention</h2>
            <p className="text-text-secondary mb-4 body-text">
              Your data is retained locally on your device indefinitely unless you choose to delete it. 
              We implement automatic cleanup of old entries after 1 year to prevent excessive storage usage, 
              but this can be disabled in settings.
            </p>

            <h2 className="text-lg sm:text-xl font-medium text-graphite-charcoal mb-3 sm:mb-4 subheading">Security</h2>
            <p className="text-text-secondary mb-4 body-text">
              We implement industry-standard security measures including:
            </p>
            <ul className="list-disc list-inside text-text-secondary mb-4 space-y-2 body-text">
              <li>AES-GCM encryption for all stored data</li>
              <li>Device-specific encryption keys</li>
              <li>Content Security Policy (CSP) to prevent XSS attacks</li>
              <li>Rate limiting to prevent abuse</li>
              <li>No external dependencies that could compromise privacy</li>
            </ul>

            <h2 className="text-lg sm:text-xl font-medium text-graphite-charcoal mb-3 sm:mb-4 subheading">Your Rights (GDPR)</h2>
            <p className="text-text-secondary mb-4 body-text">
              Under GDPR, you have the right to:
            </p>
            <ul className="list-disc list-inside text-text-secondary mb-4 space-y-2 body-text">
              <li>Access your personal data (export functionality)</li>
              <li>Rectify inaccurate data (edit entries)</li>
              <li>Erase your data (delete all data)</li>
              <li>Restrict processing (disable features)</li>
              <li>Data portability (export in standard formats)</li>
              <li>Object to processing (disable analytics)</li>
            </ul>

            <h2 className="text-lg sm:text-xl font-medium text-graphite-charcoal mb-3 sm:mb-4 subheading">Contact</h2>
            <p className="text-text-secondary mb-4 body-text">
              If you have any questions about this privacy policy or how we handle your data, contact us at 
              <a href="mailto:support@heijo.io" className="underline hover:text-graphite-charcoal transition-colors">support@heijo.io</a>.
            </p>

            <div className="mt-8 pt-6 border-t border-soft-silver">
              <p className="text-xs text-text-caption caption-text">
                This privacy policy is designed to be transparent and easy to understand. 
                We believe in giving you full control over your personal data.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
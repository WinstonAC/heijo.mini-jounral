'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function TermsPage() {
  const router = useRouter();

  useEffect(() => {
    // Set page title
    document.title = 'Terms of Service - Heijō';
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-100 via-zinc-100/80 to-gray-300 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-b from-white via-gray-50/80 to-gray-100/60 rounded-xl border border-soft-silver p-8 shadow-lg backdrop-blur-sm">
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

          <h1 className="text-3xl font-light text-graphite-charcoal mb-8 brand-hero">Terms of Service</h1>

          <div className="prose prose-sm max-w-none">
            <p className="text-text-secondary mb-6 body-text">
              <strong>Last updated:</strong> {new Date().toLocaleDateString()}
            </p>

            <h2 className="text-xl font-medium text-graphite-charcoal mb-4 subheading">1. Acceptance of Terms</h2>
            <p className="text-text-secondary mb-4 body-text">
              By using Heijō, you agree to these Terms of Service. If you do not agree, do not use the app.
            </p>

            <h2 className="text-xl font-medium text-graphite-charcoal mb-4 subheading">2. Description of Service</h2>
            <p className="text-text-secondary mb-4 body-text">
              Heijō is a privacy-first journaling application with local-first storage and optional cloud sync via Supabase when configured.
            </p>

            <h2 className="text-xl font-medium text-graphite-charcoal mb-4 subheading">3. User Responsibilities</h2>
            <ul className="list-disc list-inside text-text-secondary mb-4 space-y-2 body-text">
              <li>Do not use the app for illegal activities or abuse.</li>
              <li>Maintain the security of your device and data exports.</li>
              <li>Comply with applicable laws in your jurisdiction.</li>
            </ul>

            <h2 className="text-xl font-medium text-graphite-charcoal mb-4 subheading">4. Privacy</h2>
            <p className="text-text-secondary mb-4 body-text">
              Your use is also governed by our <a href="/privacy" className="underline hover:text-graphite-charcoal transition-colors">Privacy Policy</a> describing how data is stored locally and how you can export or delete it.
            </p>

            <h2 className="text-xl font-medium text-graphite-charcoal mb-4 subheading">5. Service Availability</h2>
            <p className="text-text-secondary mb-4 body-text">
              The app is provided on a best-effort, "as-is" basis. Offline functionality is supported; no uptime is guaranteed for optional cloud sync.
            </p>

            <h2 className="text-xl font-medium text-graphite-charcoal mb-4 subheading">6. Intellectual Property</h2>
            <p className="text-text-secondary mb-4 body-text">
              You retain rights to your content. You grant us any limited rights necessary to display and store your content if you enable cloud sync.
            </p>

            <h2 className="text-xl font-medium text-graphite-charcoal mb-4 subheading">7. Limitation of Liability</h2>
            <p className="text-text-secondary mb-4 body-text">
              To the maximum extent permitted by law, Heijō is not liable for indirect, incidental, or consequential damages, including data loss. Use export/backups as needed.
            </p>

            <h2 className="text-xl font-medium text-graphite-charcoal mb-4 subheading">8. Changes to Terms</h2>
            <p className="text-text-secondary mb-4 body-text">
              We may update these Terms from time to time. Continued use after changes constitutes acceptance. The last updated date will be shown at the top of this page.
            </p>

            <h2 className="text-xl font-medium text-graphite-charcoal mb-4 subheading">9. Contact</h2>
            <p className="text-text-secondary mb-4 body-text">
              Questions about these Terms? Contact us at <a href="mailto:support@heijo.io" className="underline hover:text-graphite-charcoal transition-colors">support@heijo.io</a>.
            </p>

            <div className="mt-8 pt-6 border-t border-soft-silver">
              <p className="text-xs text-text-caption caption-text">
                These Terms aim to be clear and practical while reflecting our privacy-first approach.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}



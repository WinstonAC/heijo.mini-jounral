'use client';

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service - Heijō',
  description: 'Terms of Service for Heijō voice journal app',
  robots: 'index, follow',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#F8F8F8] p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white border border-[#C7C7C7] rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-light text-[#1A1A1A] mb-8">Terms of Service</h1>

          <div className="prose prose-sm max-w-none">
            <p className="text-[#6A6A6A] mb-6">
              <strong>Last updated:</strong> {new Date().toLocaleDateString()}
            </p>

            <h2 className="text-xl font-medium text-[#1A1A1A] mb-4">1. Acceptance of Terms</h2>
            <p className="text-[#6A6A6A] mb-4">
              By using Heijō, you agree to these Terms of Service. If you do not agree, do not use the app.
            </p>

            <h2 className="text-xl font-medium text-[#1A1A1A] mb-4">2. Description of Service</h2>
            <p className="text-[#6A6A6A] mb-4">
              Heijō is a privacy-first journaling application with local-first storage and optional cloud sync via Supabase when configured.
            </p>

            <h2 className="text-xl font-medium text-[#1A1A1A] mb-4">3. User Responsibilities</h2>
            <ul className="list-disc list-inside text-[#6A6A6A] mb-4 space-y-2">
              <li>Do not use the app for illegal activities or abuse.</li>
              <li>Maintain the security of your device and data exports.</li>
              <li>Comply with applicable laws in your jurisdiction.</li>
            </ul>

            <h2 className="text-xl font-medium text-[#1A1A1A] mb-4">4. Privacy</h2>
            <p className="text-[#6A6A6A] mb-4">
              Your use is also governed by our <a href="/privacy" className="underline">Privacy Policy</a> describing how data is stored locally and how you can export or delete it.
            </p>

            <h2 className="text-xl font-medium text-[#1A1A1A] mb-4">5. Service Availability</h2>
            <p className="text-[#6A6A6A] mb-4">
              The app is provided on a best-effort, “as-is” basis. Offline functionality is supported; no uptime is guaranteed for optional cloud sync.
            </p>

            <h2 className="text-xl font-medium text-[#1A1A1A] mb-4">6. Intellectual Property</h2>
            <p className="text-[#6A6A6A] mb-4">
              You retain rights to your content. You grant us any limited rights necessary to display and store your content if you enable cloud sync.
            </p>

            <h2 className="text-xl font-medium text-[#1A1A1A] mb-4">7. Limitation of Liability</h2>
            <p className="text-[#6A6A6A] mb-4">
              To the maximum extent permitted by law, Heijō is not liable for indirect, incidental, or consequential damages, including data loss. Use export/backups as needed.
            </p>

            <h2 className="text-xl font-medium text-[#1A1A1A] mb-4">8. Changes to Terms</h2>
            <p className="text-[#6A6A6A] mb-4">
              We may update these Terms from time to time. Continued use after changes constitutes acceptance. The last updated date will be shown at the top of this page.
            </p>

            <h2 className="text-xl font-medium text-[#1A1A1A] mb-4">9. Contact</h2>
            <p className="text-[#6A6A6A] mb-4">
              Questions about these Terms? Contact us at <a href="mailto:support@heijo.io" className="underline">support@heijo.io</a>.
            </p>

            <div className="mt-8 pt-6 border-t border-[#C7C7C7]">
              <p className="text-xs text-[#8A8A8A]">
                These Terms aim to be clear and practical while reflecting our privacy-first approach.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}



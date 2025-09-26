import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy - Heijō',
  description: 'Privacy policy for Heijō voice journal app',
  robots: 'noindex, nofollow',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F8F8F8] p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white border border-[#C7C7C7] rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-light text-[#1A1A1A] mb-8">Privacy Policy</h1>
          
          <div className="prose prose-sm max-w-none">
            <p className="text-[#6A6A6A] mb-6">
                <strong>Last updated:</strong> {new Date().toLocaleDateString()}
              </p>
              
            <h2 className="text-xl font-medium text-[#1A1A1A] mb-4">Data Collection & Storage</h2>
            <p className="text-[#6A6A6A] mb-4">
              Heijō is designed with privacy-first principles. All your journal entries, voice recordings, 
              and personal data are stored locally on your device using AES-GCM encryption. We do not 
              collect, store, or transmit your personal content to our servers.
            </p>

            <h2 className="text-xl font-medium text-[#1A1A1A] mb-4">Local Data Storage</h2>
            <ul className="list-disc list-inside text-[#6A6A6A] mb-4 space-y-2">
              <li>All journal entries are encrypted using device-specific keys</li>
              <li>Voice recordings are processed locally and not stored unless you opt-in</li>
              <li>Data is stored in your browser’s IndexedDB with encryption</li>
              <li>No data is transmitted to external servers without your explicit consent</li>
            </ul>

            <h2 className="text-xl font-medium text-[#1A1A1A] mb-4">Microphone Access</h2>
            <p className="text-[#6A6A6A] mb-4">
              Microphone access is requested only when you tap the record button. Voice data is processed 
              locally using your browser’s speech recognition API and is not transmitted to external servers.
              You can revoke microphone access at any time through your browser settings.
            </p>

            <h2 className="text-xl font-medium text-[#1A1A1A] mb-4">Data Export & Deletion</h2>
            <p className="text-[#6A6A6A] mb-4">
              You have full control over your data. You can export all your journal entries in JSON or CSV 
              format at any time. You can also delete all your data with a single tap. All data deletion 
              is permanent and cannot be undone.
            </p>

            <h2 className="text-xl font-medium text-[#1A1A1A] mb-4">Analytics & Telemetry</h2>
            <p className="text-[#6A6A6A] mb-4">
              Analytics and telemetry are completely optional and disabled by default. If you choose to 
              enable them, only anonymous usage statistics are collected (app performance, feature usage). 
              No personal content or journal entries are ever included in analytics data.
            </p>

            <h2 className="text-xl font-medium text-[#1A1A1A] mb-4">Data Retention</h2>
            <p className="text-[#6A6A6A] mb-4">
              Your data is retained locally on your device indefinitely unless you choose to delete it. 
              We implement automatic cleanup of old entries after 1 year to prevent excessive storage usage, 
              but this can be disabled in settings.
            </p>

            <h2 className="text-xl font-medium text-[#1A1A1A] mb-4">Security</h2>
            <p className="text-[#6A6A6A] mb-4">
              We implement industry-standard security measures including:
            </p>
            <ul className="list-disc list-inside text-[#6A6A6A] mb-4 space-y-2">
              <li>AES-GCM encryption for all stored data</li>
              <li>Device-specific encryption keys</li>
              <li>Content Security Policy (CSP) to prevent XSS attacks</li>
              <li>Rate limiting to prevent abuse</li>
              <li>No external dependencies that could compromise privacy</li>
            </ul>

            <h2 className="text-xl font-medium text-[#1A1A1A] mb-4">Your Rights (GDPR)</h2>
            <p className="text-[#6A6A6A] mb-4">
              Under GDPR, you have the right to:
            </p>
            <ul className="list-disc list-inside text-[#6A6A6A] mb-4 space-y-2">
              <li>Access your personal data (export functionality)</li>
              <li>Rectify inaccurate data (edit entries)</li>
              <li>Erase your data (delete all data)</li>
              <li>Restrict processing (disable features)</li>
              <li>Data portability (export in standard formats)</li>
              <li>Object to processing (disable analytics)</li>
            </ul>

            <h2 className="text-xl font-medium text-[#1A1A1A] mb-4">Contact</h2>
            <p className="text-[#6A6A6A] mb-4">
              If you have any questions about this privacy policy or how we handle your data, 
              please contact us through the app settings or visit our support page.
            </p>

            <div className="mt-8 pt-6 border-t border-[#C7C7C7]">
              <p className="text-xs text-[#8A8A8A]">
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
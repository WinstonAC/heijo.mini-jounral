'use client';

import { useVoiceSettings, SUPPORTED_LANGUAGES } from '@/lib/voiceSettings';

interface LanguageSelectorProps {
  className?: string;
  variant?: 'dropdown' | 'pills';
}

export default function LanguageSelector({ className = '', variant = 'dropdown' }: LanguageSelectorProps) {
  const { selectedLanguage, setLanguage } = useVoiceSettings();

  if (variant === 'pills') {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {SUPPORTED_LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`px-3 py-1.5 text-xs sm:text-sm rounded-full transition-all duration-200 ${
              selectedLanguage === lang.code
                ? 'bg-soft-silver text-graphite-charcoal font-medium'
                : 'bg-tactile-taupe/30 text-text-caption hover:bg-tactile-taupe/50'
            }`}
            title={lang.nativeName || lang.name}
          >
            {lang.code.split('-')[0].toUpperCase()}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <select
        value={selectedLanguage}
        onChange={(e) => setLanguage(e.target.value)}
        className="appearance-none bg-tactile-taupe/30 text-text-caption text-xs sm:text-sm px-3 py-1.5 pr-8 rounded-lg border border-white/10 focus:outline-none focus:ring-2 focus:ring-soft-silver/50 transition-all duration-200 cursor-pointer"
        title="Select voice input language"
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
      <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg
          className="w-4 h-4 text-text-caption"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
    </div>
  );
}


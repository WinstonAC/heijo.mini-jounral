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
    <div className={className}>
      <label htmlFor="language-select" className="sr-only">
        Select voice input language
      </label>
      <select
        id="language-select"
        value={selectedLanguage}
        onChange={(e) => setLanguage(e.target.value)}
        className="w-full bg-tactile-taupe/30 text-text-caption text-xs sm:text-sm px-3 py-1.5 pr-8 rounded-lg border border-white/10 focus:outline-none focus:ring-2 focus:ring-soft-silver/50 transition-all duration-200 cursor-pointer"
        title="Select voice input language"
        style={{
          // Use native select styling on mobile for better compatibility
          WebkitAppearance: 'menulist',
          MozAppearance: 'menulist',
          appearance: 'menulist',
        }}
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
}


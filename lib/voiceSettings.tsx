'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type VoiceProvider = 'webspeech' | 'whisper' | 'google';

export interface VoiceLanguage {
  code: string;
  name: string;
  nativeName?: string;
}

export const SUPPORTED_LANGUAGES: VoiceLanguage[] = [
  { code: 'en-US', name: 'English (US)', nativeName: 'English' },
  { code: 'es-ES', name: 'Spanish', nativeName: 'Español' },
  { code: 'pt-BR', name: 'Portuguese (Brazil)', nativeName: 'Português' },
  { code: 'de-DE', name: 'German', nativeName: 'Deutsch' },
  { code: 'fr-FR', name: 'French', nativeName: 'Français' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ja-JP', name: 'Japanese', nativeName: '日本語' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文' },
];

interface VoiceSettingsContextType {
  selectedLanguage: string;
  availableLanguages: VoiceLanguage[];
  provider: VoiceProvider;
  setLanguage: (langCode: string) => void;
  setProvider: (provider: VoiceProvider) => void;
}

const VoiceSettingsContext = createContext<VoiceSettingsContextType | undefined>(undefined);

const STORAGE_KEY = 'heijo_voice_settings';

function getDefaultLanguage(): string {
  if (typeof window === 'undefined') return 'en-US';
  
  // Try to get from localStorage first
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.language && SUPPORTED_LANGUAGES.some(lang => lang.code === parsed.language)) {
        return parsed.language;
      }
    }
  } catch (e) {
    // Ignore localStorage errors
  }
  
  // Fallback to browser language
  const browserLang = navigator.language || 'en-US';
  const match = SUPPORTED_LANGUAGES.find(lang => 
    browserLang.startsWith(lang.code.split('-')[0])
  );
  
  return match ? match.code : 'en-US';
}

export function VoiceSettingsProvider({ children }: { children: ReactNode }) {
  const [selectedLanguage, setSelectedLanguageState] = useState<string>(() => getDefaultLanguage());
  const [provider, setProviderState] = useState<VoiceProvider>('webspeech');

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.language && SUPPORTED_LANGUAGES.some(lang => lang.code === parsed.language)) {
          setSelectedLanguageState(parsed.language);
        }
        if (parsed.provider && ['webspeech', 'whisper', 'google'].includes(parsed.provider)) {
          setProviderState(parsed.provider as VoiceProvider);
        }
      }
    } catch (e) {
      console.warn('Failed to load voice settings from localStorage:', e);
    }
  }, []);

  const setLanguage = (langCode: string) => {
    if (!SUPPORTED_LANGUAGES.some(lang => lang.code === langCode)) {
      console.warn(`Unsupported language code: ${langCode}`);
      return;
    }
    
    setSelectedLanguageState(langCode);
    
    // Persist to localStorage
    try {
      const current = localStorage.getItem(STORAGE_KEY);
      const parsed = current ? JSON.parse(current) : {};
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...parsed,
        language: langCode
      }));
    } catch (e) {
      console.warn('Failed to save language to localStorage:', e);
    }
  };

  const setProvider = (newProvider: VoiceProvider) => {
    setProviderState(newProvider);
    
    // Persist to localStorage
    try {
      const current = localStorage.getItem(STORAGE_KEY);
      const parsed = current ? JSON.parse(current) : {};
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...parsed,
        provider: newProvider
      }));
    } catch (e) {
      console.warn('Failed to save provider to localStorage:', e);
    }
  };

  return (
    <VoiceSettingsContext.Provider
      value={{
        selectedLanguage,
        availableLanguages: SUPPORTED_LANGUAGES,
        provider,
        setLanguage,
        setProvider,
      }}
    >
      {children}
    </VoiceSettingsContext.Provider>
  );
}

export function useVoiceSettings() {
  const context = useContext(VoiceSettingsContext);
  if (context === undefined) {
    throw new Error('useVoiceSettings must be used within a VoiceSettingsProvider');
  }
  return context;
}


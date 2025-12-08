import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { VoiceSettingsProvider, useVoiceSettings, SUPPORTED_LANGUAGES } from '@/lib/voiceSettings';

describe('VoiceSettings Context', () => {
  beforeEach(() => {
    localStorage.clear();
    // Mock navigator.language
    Object.defineProperty(navigator, 'language', {
      writable: true,
      value: 'en-US',
      configurable: true,
    });
  });

  describe('Language Selection', () => {
    it('should initialize with default language (en-US) when no localStorage', () => {
      const { result } = renderHook(() => useVoiceSettings(), {
        wrapper: VoiceSettingsProvider,
      });

      expect(result.current.selectedLanguage).toBe('en-US');
      expect(result.current.availableLanguages).toEqual(SUPPORTED_LANGUAGES);
    });

    it('should hydrate selectedLanguage from localStorage on mount', () => {
      localStorage.setItem('heijo_voice_settings', JSON.stringify({ language: 'es-ES' }));

      const { result } = renderHook(() => useVoiceSettings(), {
        wrapper: VoiceSettingsProvider,
      });

      expect(result.current.selectedLanguage).toBe('es-ES');
    });

    it('should update selectedLanguage when setLanguage is called', () => {
      const { result } = renderHook(() => useVoiceSettings(), {
        wrapper: VoiceSettingsProvider,
      });

      act(() => {
        result.current.setLanguage('de-DE');
      });

      expect(result.current.selectedLanguage).toBe('de-DE');
    });

    it('should persist language to localStorage when setLanguage is called', () => {
      const { result } = renderHook(() => useVoiceSettings(), {
        wrapper: VoiceSettingsProvider,
      });

      act(() => {
        result.current.setLanguage('pt-BR');
      });

      const stored = JSON.parse(localStorage.getItem('heijo_voice_settings') || '{}');
      expect(stored.language).toBe('pt-BR');
    });

    it('should not update language if invalid language code is provided', () => {
      const { result } = renderHook(() => useVoiceSettings(), {
        wrapper: VoiceSettingsProvider,
      });

      const initialLanguage = result.current.selectedLanguage;

      act(() => {
        result.current.setLanguage('invalid-lang');
      });

      expect(result.current.selectedLanguage).toBe(initialLanguage);
    });

    it('should fallback to browser language if localStorage has invalid language', () => {
      localStorage.setItem('heijo_voice_settings', JSON.stringify({ language: 'invalid-lang' }));
      Object.defineProperty(navigator, 'language', {
        writable: true,
        value: 'fr',
        configurable: true,
      });

      const { result } = renderHook(() => useVoiceSettings(), {
        wrapper: VoiceSettingsProvider,
      });

      // Should match 'fr' to 'fr-FR'
      expect(result.current.selectedLanguage).toBe('fr-FR');
    });
  });

  describe('Provider Selection', () => {
    it('should initialize with webspeech provider by default', () => {
      const { result } = renderHook(() => useVoiceSettings(), {
        wrapper: VoiceSettingsProvider,
      });

      expect(result.current.provider).toBe('webspeech');
    });

    it('should hydrate provider from localStorage on mount', () => {
      localStorage.setItem('heijo_voice_settings', JSON.stringify({ provider: 'whisper' }));

      const { result } = renderHook(() => useVoiceSettings(), {
        wrapper: VoiceSettingsProvider,
      });

      expect(result.current.provider).toBe('whisper');
    });

    it('should update provider when setProvider is called', () => {
      const { result } = renderHook(() => useVoiceSettings(), {
        wrapper: VoiceSettingsProvider,
      });

      act(() => {
        result.current.setProvider('google');
      });

      expect(result.current.provider).toBe('google');
    });

    it('should persist provider to localStorage when setProvider is called', () => {
      const { result } = renderHook(() => useVoiceSettings(), {
        wrapper: VoiceSettingsProvider,
      });

      act(() => {
        result.current.setProvider('whisper');
      });

      const stored = JSON.parse(localStorage.getItem('heijo_voice_settings') || '{}');
      expect(stored.provider).toBe('whisper');
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Mock localStorage to throw on getItem
      const originalGetItem = localStorage.getItem;
      localStorage.getItem = vi.fn(() => {
        throw new Error('localStorage error');
      });

      const { result } = renderHook(() => useVoiceSettings(), {
        wrapper: VoiceSettingsProvider,
      });

      // Should still work with default
      expect(result.current.selectedLanguage).toBe('en-US');

      // Restore
      localStorage.getItem = originalGetItem;
      consoleSpy.mockRestore();
    });

    it('should handle localStorage setItem errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error('localStorage error');
      });

      const { result } = renderHook(() => useVoiceSettings(), {
        wrapper: VoiceSettingsProvider,
      });

      // Should not throw
      act(() => {
        result.current.setLanguage('de-DE');
      });

      // Language should still update in state (just not persisted)
      expect(result.current.selectedLanguage).toBe('de-DE');

      // Restore
      localStorage.setItem = originalSetItem;
      consoleSpy.mockRestore();
    });
  });
});



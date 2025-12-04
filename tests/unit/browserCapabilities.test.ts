import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectVoiceCapabilities, getRecommendedProvider, getVoiceSupportMessage } from '@/lib/browserCapabilities';

describe('browserCapabilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('detectVoiceCapabilities', () => {
    it('should detect iOS Safari correctly', () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
      });
      
      // Mock window APIs
      (window as any).SpeechRecognition = undefined;
      (window as any).webkitSpeechRecognition = undefined;
      (window as any).isSecureContext = true;
      (navigator as any).mediaDevices = { getUserMedia: vi.fn() };

      const caps = detectVoiceCapabilities();
      
      expect(caps.isIOS).toBe(true);
      expect(caps.isSafari).toBe(true);
      expect(caps.hasWebSpeech).toBe(false);
      expect(caps.requiresBackend).toBe(true);
    });

    it('should detect Chrome desktop correctly', () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      });
      
      (window as any).SpeechRecognition = class {};
      (window as any).isSecureContext = true;
      (navigator as any).mediaDevices = { getUserMedia: vi.fn() };

      const caps = detectVoiceCapabilities();
      
      expect(caps.isIOS).toBe(false);
      expect(caps.isSafari).toBe(false);
      expect(caps.hasWebSpeech).toBe(true);
      expect(caps.requiresBackend).toBe(false);
    });

    it('should detect Firefox correctly', () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      });
      
      (window as any).SpeechRecognition = undefined;
      (window as any).webkitSpeechRecognition = undefined;
      (window as any).isSecureContext = true;
      (navigator as any).mediaDevices = { getUserMedia: vi.fn() };

      const caps = detectVoiceCapabilities();
      
      expect(caps.isFirefox).toBe(true);
      expect(caps.hasWebSpeech).toBe(false);
      expect(caps.requiresBackend).toBe(true);
    });
  });

  describe('getRecommendedProvider', () => {
    it('should return backend for iOS Safari', () => {
      const caps = {
        isIOS: true,
        isSafari: true,
        isChromeIOS: false,
        isFirefox: false,
        hasWebSpeech: false,
        requiresBackend: true,
        isSecure: true,
        hasMediaDevices: true,
      };
      
      expect(getRecommendedProvider(caps)).toBe('backend');
    });

    it('should return webspeech for Chrome desktop', () => {
      const caps = {
        isIOS: false,
        isSafari: false,
        isChromeIOS: false,
        isFirefox: false,
        hasWebSpeech: true,
        requiresBackend: false,
        isSecure: true,
        hasMediaDevices: true,
      };
      
      expect(getRecommendedProvider(caps)).toBe('webspeech');
    });

    it('should return unsupported when no media devices', () => {
      const caps = {
        isIOS: false,
        isSafari: false,
        isChromeIOS: false,
        isFirefox: false,
        hasWebSpeech: true,
        requiresBackend: false,
        isSecure: true,
        hasMediaDevices: false,
      };
      
      expect(getRecommendedProvider(caps)).toBe('unsupported');
    });
  });

  describe('getVoiceSupportMessage', () => {
    it('should return message for iOS Safari', () => {
      const caps = {
        isIOS: true,
        isSafari: true,
        isChromeIOS: false,
        isFirefox: false,
        hasWebSpeech: false,
        requiresBackend: true,
        isSecure: true,
        hasMediaDevices: true,
      };
      
      const message = getVoiceSupportMessage(caps);
      expect(message).toContain('iOS Safari');
    });

    it('should return null when WebSpeech is available', () => {
      const caps = {
        isIOS: false,
        isSafari: false,
        isChromeIOS: false,
        isFirefox: false,
        hasWebSpeech: true,
        requiresBackend: false,
        isSecure: true,
        hasMediaDevices: true,
      };
      
      expect(getVoiceSupportMessage(caps)).toBeNull();
    });
  });
});


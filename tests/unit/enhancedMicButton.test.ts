import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createEnhancedMicButton } from '@/lib/voiceToText';
import { setupMockSpeechRecognition, removeMockSpeechRecognition, createMockSpeechRecognition } from '../setup';

describe('EnhancedMicButton Language Updates', () => {
  let MockSpeechRecognition: ReturnType<typeof setupMockSpeechRecognition>;
  let mockRecognition: ReturnType<typeof createMockSpeechRecognition>;

  beforeEach(() => {
    MockSpeechRecognition = setupMockSpeechRecognition();
    mockRecognition = createMockSpeechRecognition();
    MockSpeechRecognition.mockReturnValue(mockRecognition);
  });

  afterEach(() => {
    removeMockSpeechRecognition();
    vi.clearAllMocks();
  });

  describe('Language Updates', () => {
    it('should update language configuration when setLanguage is called', async () => {
      const micButton = createEnhancedMicButton('en-US', 'webspeech');
      await micButton.initialize();

      micButton.setLanguage('es-ES');

      expect(micButton.getLanguage()).toBe('es-ES');
    });

    it('should use updated language on next startListening call', async () => {
      const micButton = createEnhancedMicButton('en-US', 'webspeech');
      await micButton.initialize();

      // Update language
      micButton.setLanguage('de-DE');

      const onTranscript = vi.fn();
      const onError = vi.fn();
      const onStart = vi.fn();
      const onEnd = vi.fn();

      await micButton.startListening(onTranscript, onError, onStart, onEnd);

      // Verify language was set correctly
      expect(mockRecognition.lang).toBe('de-DE');
    });

    it('should stop listening when language changes during recording', async () => {
      const micButton = createEnhancedMicButton('en-US', 'webspeech');
      await micButton.initialize();

      const onTranscript = vi.fn();
      const onError = vi.fn();
      const onStart = vi.fn();
      const onEnd = vi.fn();

      await micButton.startListening(onTranscript, onError, onStart, onEnd);

      // Change language while recording
      micButton.setLanguage('fr-FR');

      // Should have stopped
      expect(mockRecognition.stop).toHaveBeenCalled();
      expect(micButton.getLanguage()).toBe('fr-FR');
    });

    it('should not restart automatically after language change', async () => {
      const micButton = createEnhancedMicButton('en-US', 'webspeech');
      await micButton.initialize();

      const onTranscript = vi.fn();
      const onError = vi.fn();
      const onStart = vi.fn();
      const onEnd = vi.fn();

      await micButton.startListening(onTranscript, onError, onStart, onEnd);

      const startCallCount = mockRecognition.start.mock.calls.length;

      // Change language
      micButton.setLanguage('pt-BR');

      // Should not have started again automatically
      // (we need to wait a bit to ensure no async restart)
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockRecognition.start.mock.calls.length).toBe(startCallCount);
    });
  });

  describe('Provider Updates', () => {
    it('should update provider when setProvider is called', () => {
      const micButton = createEnhancedMicButton('en-US', 'webspeech');

      micButton.setProvider('whisper');

      expect(micButton.getProvider()).toBe('whisper');
    });

    it('should maintain language when provider changes', () => {
      const micButton = createEnhancedMicButton('es-ES', 'webspeech');

      micButton.setProvider('google');

      expect(micButton.getLanguage()).toBe('es-ES');
      expect(micButton.getProvider()).toBe('google');
    });
  });
});



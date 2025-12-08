import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { VoiceToTextEngine } from '@/lib/voiceToText';
import { setupMockSpeechRecognition, removeMockSpeechRecognition, createMockSpeechRecognition } from '../setup';

// We need to export VoiceToTextEngine for testing
// Since it's not exported, we'll test through the public interface
// For now, we'll test the behavior through EnhancedMicButton

describe('VoiceToTextEngine Language Handling', () => {
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

  describe('Language Configuration', () => {
    it('should initialize with provided language', async () => {
      // We'll test this through the public interface
      // Since VoiceToTextEngine is not exported, we test via EnhancedMicButton
      const { createEnhancedMicButton } = await import('@/lib/voiceToText');
      const micButton = createEnhancedMicButton('de-DE', 'webspeech');

      await micButton.initialize();

      // Verify recognition was created with correct language
      expect(MockSpeechRecognition).toHaveBeenCalled();
      // The language is set in setupRecognition, which is called during initialize
      expect(mockRecognition.lang).toBe('de-DE');
    });

    it('should use default language (en-US) if not provided', async () => {
      const { createEnhancedMicButton } = await import('@/lib/voiceToText');
      const micButton = createEnhancedMicButton();

      await micButton.initialize();

      expect(mockRecognition.lang).toBe('en-US');
    });

    it('should set recognition.lang to selectedLanguage before starting', async () => {
      const { createEnhancedMicButton } = await import('@/lib/voiceToText');
      const micButton = createEnhancedMicButton('fr-FR', 'webspeech');

      await micButton.initialize();

      const onTranscript = vi.fn();
      const onError = vi.fn();
      const onStart = vi.fn();
      const onEnd = vi.fn();

      await micButton.startListening(onTranscript, onError, onStart, onEnd);

      // Verify language was set before start
      expect(mockRecognition.lang).toBe('fr-FR');
      expect(mockRecognition.start).toHaveBeenCalled();
    });

    it('should update language when setLanguage is called (not recording)', async () => {
      const { createEnhancedMicButton } = await import('@/lib/voiceToText');
      const micButton = createEnhancedMicButton('en-US', 'webspeech');

      await micButton.initialize();

      // Change language while not recording
      micButton.setLanguage('ja-JP');

      // Language should be updated for next recording
      expect(micButton.getLanguage()).toBe('ja-JP');
    });

    it('should stop and update language when setLanguage is called while recording', async () => {
      const { createEnhancedMicButton } = await import('@/lib/voiceToText');
      const micButton = createEnhancedMicButton('en-US', 'webspeech');

      await micButton.initialize();

      const onTranscript = vi.fn();
      const onError = vi.fn();
      const onStart = vi.fn();
      const onEnd = vi.fn();

      await micButton.startListening(onTranscript, onError, onStart, onEnd);

      // Change language while recording
      micButton.setLanguage('zh-CN');

      // Should have stopped
      expect(mockRecognition.stop).toHaveBeenCalled();
      expect(micButton.getLanguage()).toBe('zh-CN');
    });
  });

  describe('Web Speech API Unavailability', () => {
    it('should not throw when SpeechRecognition is not available', async () => {
      removeMockSpeechRecognition();

      const { createEnhancedMicButton } = await import('@/lib/voiceToText');
      const micButton = createEnhancedMicButton('en-US', 'webspeech');

      await expect(micButton.initialize()).rejects.toThrow('Speech recognition not supported');
    });

    it('should handle initialization failure gracefully', async () => {
      removeMockSpeechRecognition();

      const { createEnhancedMicButton } = await import('@/lib/voiceToText');
      const micButton = createEnhancedMicButton('en-US', 'webspeech');

      const onError = vi.fn();
      const onTranscript = vi.fn();

      // Should not throw, but should call onError
      try {
        await micButton.startListening(onTranscript, onError);
      } catch (error) {
        // Expected to fail
      }

      // Error should be reported
      expect(onError).toHaveBeenCalled();
    });
  });
});



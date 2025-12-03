# TypeScript Signatures: Multilingual Voice Input System

## Voice Hook / MicButton Component

```typescript
// components/MicButton.tsx

interface MicButtonProps {
  onTranscript: (text: string, isFinal?: boolean) => void;
  onError?: (error: string) => void;
  lang?: string; // Deprecated: use voiceSettings context instead
}

export default function MicButton({ onTranscript, onError, lang }: MicButtonProps): JSX.Element

// Internal implementation:
// - Uses useVoiceSettings() hook to get selectedLanguage and provider
// - Creates EnhancedMicButton instance with selectedLanguage from context
// - Re-initializes when selectedLanguage or provider changes
// - Sets recognition.lang before starting recording
```

## Settings Language Selector

```typescript
// components/LanguageSelector.tsx

interface LanguageSelectorProps {
  className?: string;
  variant?: 'dropdown' | 'pills';
}

export default function LanguageSelector({ 
  className = '', 
  variant = 'dropdown' 
}: LanguageSelectorProps): JSX.Element

// Usage in Settings:
// <LanguageSelector className="w-full sm:w-auto" />
// - Renders dropdown by default
// - Uses useVoiceSettings() to get/set selectedLanguage
// - Persists to localStorage automatically
```

## Voice Settings Context

```typescript
// lib/voiceSettings.tsx

interface VoiceSettingsContextType {
  selectedLanguage: string;
  availableLanguages: VoiceLanguage[];
  provider: VoiceProvider;
  setLanguage: (langCode: string) => void;
  setProvider: (provider: VoiceProvider) => void;
}

function useVoiceSettings(): VoiceSettingsContextType

// Flow:
// 1. Settings → setLanguage('de-DE')
// 2. Context updates selectedLanguage state
// 3. Context saves to localStorage
// 4. MicButton receives updated selectedLanguage via hook
// 5. MicButton re-initializes EnhancedMicButton with new language
```

## Enhanced MicButton (Voice Engine Wrapper)

```typescript
// lib/voiceToText.ts

export class EnhancedMicButton {
  constructor(language: string = 'en-US', provider: VoiceProvider = 'webspeech')
  
  setLanguage(language: string): void
  getLanguage(): string
  setProvider(provider: VoiceProvider): void
  getProvider(): VoiceProvider
  
  async initialize(): Promise<boolean>
  async startListening(
    onTranscript: (text: string, isFinal: boolean) => void,
    onError: (error: string) => void,
    onStart?: () => void,
    onEnd?: () => void
  ): Promise<void>
  
  stopListening(): void
  isActive(): boolean
  getMetrics(): VoiceMetrics
  destroy(): void
}

export function createEnhancedMicButton(
  language: string = 'en-US', 
  provider: VoiceProvider = 'webspeech'
): EnhancedMicButton
```

## VoiceToTextEngine (Core Recognition Engine)

```typescript
// lib/voiceToText.ts (internal class, not exported)

class VoiceToTextEngine {
  constructor(config: Partial<VoiceConfig> = {})
  
  async initialize(): Promise<boolean>
  async start(): Promise<void>
  stop(): void
  setLanguage(language: string): void
  getLanguage(): string
  isActive(): boolean
  getMetrics(): VoiceMetrics
  
  // Internal: Sets recognition.lang = config.language
  private setupRecognition(): void
}

// Language Flow:
// 1. Constructor receives language in config
// 2. setupRecognition() sets recognition.lang = config.language
// 3. start() ensures recognition.lang === config.language before starting
// 4. setLanguage() updates config.language and recognition.lang directly
```

## Complete Language Flow

```
Settings Component
  ↓
LanguageSelector.setLanguage('de-DE')
  ↓
VoiceSettingsContext.setLanguage('de-DE')
  ↓
  - Updates selectedLanguage state
  - Saves to localStorage: { language: 'de-DE' }
  ↓
MicButton.useVoiceSettings() receives selectedLanguage = 'de-DE'
  ↓
MicButton useEffect detects selectedLanguage change
  ↓
  - Destroys old EnhancedMicButton
  - Creates new: createEnhancedMicButton('de-DE', 'webspeech')
  ↓
EnhancedMicButton constructor
  ↓
  - Creates VoiceToTextEngine({ language: 'de-DE', ... })
  ↓
VoiceToTextEngine.initialize()
  ↓
  - Creates SpeechRecognition instance
  - Calls setupRecognition()
  - Sets recognition.lang = 'de-DE'
  ↓
User clicks mic button
  ↓
MicButton.toggleListening()
  ↓
EnhancedMicButton.startListening()
  ↓
VoiceToTextEngine.start()
  ↓
  - Checks: if (recognition.lang !== config.language)
  - Sets: recognition.lang = config.language (ensures it's 'de-DE')
  - Calls: recognition.start()
  ↓
Speech Recognition uses 'de-DE' for transcription
```

## Key Points

1. **Language Selector**: Only appears in Settings → Display section
2. **Language Flow**: Settings → Context → MicButton → EnhancedMicButton → VoiceToTextEngine → SpeechRecognition.lang
3. **Persistence**: Language saved to localStorage automatically
4. **Re-initialization**: MicButton re-initializes when language changes
5. **Language Verification**: VoiceToTextEngine.start() double-checks recognition.lang before starting


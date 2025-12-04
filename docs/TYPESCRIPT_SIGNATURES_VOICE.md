# TypeScript Signatures: Multilingual Voice Input System

## Voice Hook / MicButton Component

```typescript
// components/MicButton.tsx

interface MicButtonProps {
  onTranscript: (text: string, isFinal?: boolean) => void;
  onError?: (error: string) => void;
  lang?: string; // Deprecated: use voiceSettings context instead
}

type MicState = 'idle' | 'initializing' | 'ready' | 'recording' | 'error';

export default function MicButton({ onTranscript, onError, lang }: MicButtonProps): JSX.Element

// Internal implementation:
// - Uses browserCapabilities.ts to detect browser support
// - Auto-selects provider: 'webspeech' or 'whisper'/'google' (backend)
// - Uses useVoiceSettings() hook to get selectedLanguage and provider
// - Creates EnhancedMicButton instance with selectedLanguage from context
// - Implements state machine: idle → initializing → ready → recording
// - Re-initializes when selectedLanguage or provider changes
// - iOS Safari/Firefox automatically use backend STT
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
  // Returns false if WebSpeech unavailable (for webspeech provider)
  // Returns true if MediaRecorder available (for backend providers)
  
  async startListening(
    onTranscript: (text: string, isFinal: boolean) => void,
    onError: (error: string) => void,
    onStart?: () => void,
    onEnd?: () => void
  ): Promise<void>
  // For webspeech: streams real-time transcription
  // For backend: records audio, sends to /api/stt, returns transcript
  
  stopListening(): void
  isActive(): boolean
  getMetrics(): VoiceMetrics
  destroy(): void
}

export function createEnhancedMicButton(
  language: string = 'en-US', 
  provider: VoiceProvider = 'webspeech'
): EnhancedMicButton

// Supports three providers:
// - 'webspeech': Browser-native Web Speech API
// - 'whisper': Backend Whisper API (OpenAI)
// - 'google': Backend Google STT API
```

## Browser Capabilities Detection

```typescript
// lib/browserCapabilities.ts

export type VoiceCapabilities = {
  isIOS: boolean;
  isSafari: boolean;
  isChromeIOS: boolean;
  isFirefox: boolean;
  hasWebSpeech: boolean;
  requiresBackend: boolean;
  isSecure: boolean;
  hasMediaDevices: boolean;
};

export function detectVoiceCapabilities(): VoiceCapabilities
export function getRecommendedProvider(capabilities: VoiceCapabilities): 'webspeech' | 'backend' | 'unsupported'
export function getVoiceSupportMessage(capabilities: VoiceCapabilities): string | null
```

## Backend STT Engine

```typescript
// lib/voiceToText.ts (internal class)

class BackendSTTEngine {
  constructor(language: string = 'en-US', provider: 'whisper' | 'google' = 'whisper')
  
  async initialize(): Promise<boolean>
  async start(): Promise<void>
  // Records audio using MediaRecorder
  // Stops after silence or manual stop
  // Sends audio blob to /api/stt
  // Receives transcript and calls onResult callback
  
  stop(): void
  setLanguage(language: string): void
  getLanguage(): string
  isActive(): boolean
  destroy(): void
}
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
  - Saves to localStorage: { language: 'de-DE', provider: 'webspeech' }
  ↓
MicButton.useVoiceSettings() receives selectedLanguage = 'de-DE'
  ↓
MicButton useEffect detects selectedLanguage change
  ↓
  - Calls detectVoiceCapabilities()
  - Determines provider: webspeech or backend (whisper/google)
  - Auto-updates provider if needed (iOS Safari → whisper)
  ↓
  - Destroys old EnhancedMicButton
  - Creates new: createEnhancedMicButton('de-DE', provider)
  ↓
EnhancedMicButton constructor
  ↓
  - If webspeech: Creates VoiceToTextEngine({ language: 'de-DE', ... })
  - If backend: Creates BackendSTTEngine('de-DE', 'whisper'|'google')
  ↓
EnhancedMicButton.initialize()
  ↓
  WebSpeech Path:
    - VoiceToTextEngine.initialize()
    - Creates SpeechRecognition instance
    - Sets recognition.lang = 'de-DE'
  Backend Path:
    - BackendSTTEngine.initialize()
    - Verifies MediaRecorder available
  ↓
User clicks mic button (state must be 'ready')
  ↓
MicButton.toggleListening()
  ↓
EnhancedMicButton.startListening()
  ↓
  WebSpeech Path:
    - VoiceToTextEngine.start()
    - Sets recognition.lang = 'de-DE'
    - Calls recognition.start()
    - Streams real-time transcription
  Backend Path:
    - BackendSTTEngine.start()
    - Records audio using MediaRecorder
    - Stops after silence/manual stop
    - POSTs to /api/stt with language='de-DE'
    - Receives transcript
  ↓
Transcription appears in selected language
```

## Key Points

1. **Language Selector**: Only appears in Settings → Display section, mobile-safe (no overlay)
2. **Browser Detection**: Automatically detects browser capabilities and selects provider
3. **Provider Selection**: 
   - Chrome/Edge Desktop → WebSpeech (no API keys)
   - iOS Safari/Firefox → Backend STT (requires API keys)
4. **Language Flow**: Settings → Context → MicButton → Browser Detection → EnhancedMicButton → Engine
5. **Persistence**: Language and provider saved to localStorage automatically
6. **Re-initialization**: MicButton re-initializes when language or provider changes
7. **State Machine**: MicButton uses state machine (idle → initializing → ready → recording) to prevent race conditions
8. **Backend STT**: Records audio, sends to /api/stt, receives transcript (1-2 second latency)
9. **WebSpeech**: Real-time streaming transcription (lower latency, browser-native)


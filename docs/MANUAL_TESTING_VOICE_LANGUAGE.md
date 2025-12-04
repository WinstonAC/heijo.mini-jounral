# Manual Testing Guide: Multilingual Voice Input

## Overview
This guide explains how to manually test the multilingual voice input feature on real devices. The system now supports both WebSpeech (browser-native) and backend STT (Whisper/Google) for broader browser compatibility.

## Prerequisites
- A device with a microphone
- HTTPS connection (or localhost for development)
- For backend STT: API keys configured (WHISPER_API_KEY or GOOGLE_STT_KEY)

## Testing Language Selection Flow

### 1. Access Language Selector
1. Open the Heijō journal app
2. Click "Settings" button (desktop) or open Settings from mobile menu
3. Scroll to "Display" section
4. Locate "Voice Input Language" dropdown

### 2. Change Language
1. Click the language dropdown
2. Select a different language (e.g., "German (de-DE)" or "Spanish (es-ES)")
3. The selection should save automatically to localStorage
4. Close Settings

### 3. Verify Language Persistence
1. Refresh the page
2. Open Settings again
3. Verify the selected language is still set in the dropdown
4. The language should persist across browser sessions

### 4. Test Voice Recognition with Selected Language
1. Click the microphone button to start recording
2. Speak in the selected language
3. Verify transcription appears in the selected language
4. Check browser console for log: `Starting enhanced microphone listening with language: [selected-language]...`
5. Verify the transcription matches the spoken language

## Testing Language Switching

### While Not Recording
1. Start with language set to "English (US)"
2. Open Settings and change to "Spanish (es-ES)"
3. Close Settings
4. Click mic button to start recording
5. Speak in Spanish
6. Verify transcription is in Spanish

### While Recording (Should Stop)
1. Start recording with "English (US)"
2. While recording, open Settings and change to "German (de-DE)"
3. Recording should stop automatically
4. Close Settings
5. Click mic button again
6. Speak in German
7. Verify transcription is in German

## Browser-Specific Testing

### Chrome/Edge (Desktop)
- ✅ Uses WebSpeech API (no API keys required)
- ✅ Full language support
- ✅ Real-time streaming transcription
- Check DevTools Console for: `Initializing webspeech engine...`

### Safari (Desktop)
- ✅ Uses WebSpeech API (no API keys required)
- ✅ Safari 14.1+ support
- Check for any console warnings

### iOS Safari
- ✅ Automatically uses backend STT (Whisper/Google)
- ✅ Requires API keys configured
- ✅ All languages supported via backend
- Check console for: `iOS Safari detected - using backend STT`
- Check console for: `Initializing backend STT engine...`

### Firefox
- ✅ Automatically uses backend STT (Whisper/Google)
- ✅ Requires API keys configured
- ✅ All languages supported via backend
- Check console for: `Firefox detected - using backend STT`

### Chrome iOS
- ✅ Automatically uses backend STT (uses Safari engine)
- ✅ Requires API keys configured

## Debugging

### Check Console Logs

**WebSpeech (Chrome/Edge Desktop):**
- `Detecting browser capabilities...`
- `WebSpeech available - using webspeech provider`
- `Initializing webspeech engine with language: [lang]...`
- `Starting webspeech voice recognition with language: [lang]...`

**Backend STT (iOS Safari/Firefox):**
- `Detecting browser capabilities...`
- `Backend STT required - using whisper/google provider`
- `Initializing backend STT engine with language: [lang]...`
- `Starting backend STT recording...`
- `Sending audio to /api/stt...`
- `Received transcript: [text]`

### Verify Recognition Language
1. Open DevTools Console
2. Start recording
3. Check for: `recognition.lang = [selected-language]`
4. If language doesn't match, check:
   - VoiceSettings context is loaded
   - MicButton receives correct selectedLanguage
   - EnhancedMicButton.setLanguage() is called
   - VoiceToTextEngine.setLanguage() updates config

### Check localStorage
1. Open DevTools → Application → Local Storage
2. Look for key: `heijo_voice_settings`
3. Value should be: `{"language":"[lang-code]","provider":"webspeech"}` or `{"language":"[lang-code]","provider":"whisper"}`
4. Provider will be auto-selected based on browser capabilities
5. If missing or incorrect, language selector may not be saving

### Check Mic State
The mic button now has a state machine:
- `idle` → Initial state
- `initializing` → Setting up voice engine (button disabled)
- `ready` → Ready to record (button enabled)
- `recording` → Currently recording (button shows recording state)
- `error` → Error occurred (button disabled)

## Common Issues

### Language Not Changing
- **Symptom**: Transcription always in English
- **Check**: Console logs for language value
- **Fix**: Ensure Settings → Voice Input Language is saved, refresh page

### Language Selector Not Visible
- **Symptom**: Can't find language selector
- **Check**: Settings → Display section
- **Fix**: Ensure you're in Settings modal, not main journal screen

### Recording Stops When Changing Language
- **Expected Behavior**: Recording should stop when language changes
- **Action**: Click mic button again to restart with new language

### Language Not Persisting
- **Symptom**: Language resets to English after refresh
- **Check**: localStorage for `heijo_voice_settings`
- **Fix**: Ensure browser allows localStorage, check for errors in console

## Supported Languages
- English (US) - `en-US`
- Spanish - `es-ES`
- Portuguese (Brazil) - `pt-BR`
- German - `de-DE`
- French - `fr-FR`
- Hindi - `hi-IN`
- Japanese - `ja-JP`
- Chinese (Simplified) - `zh-CN`

## Backend STT Configuration

### Environment Variables Required
- `WHISPER_API_KEY` or `OPENAI_API_KEY` - For Whisper transcription
- `GOOGLE_STT_KEY` - For Google STT (optional)

### Testing Backend STT
1. Use iOS Safari or Firefox
2. Ensure API keys are configured in environment
3. Click mic button - should automatically use backend STT
4. Speak and wait for transcription (may take 1-2 seconds)
5. Check Network tab for POST request to `/api/stt`

## Notes
- Language changes take effect on the next recording session
- If recording is active when language changes, it will stop automatically
- Backend STT provides consistent accuracy across all browsers
- WebSpeech provides real-time streaming (lower latency)
- Browser automatically selects the best provider based on capabilities
- Language selector now works reliably on mobile Safari (overlay removed)


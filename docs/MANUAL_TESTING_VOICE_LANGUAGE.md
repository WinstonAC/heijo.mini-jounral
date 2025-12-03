# Manual Testing Guide: Multilingual Voice Input

## Overview
This guide explains how to manually test the multilingual voice input feature on real devices.

## Prerequisites
- A device with a microphone
- Browser that supports Web Speech API (Chrome, Edge, Safari 14.1+)
- HTTPS connection (or localhost for development)

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
- Full Web Speech API support
- All languages should work
- Check DevTools Console for language logs

### Safari (Desktop)
- Web Speech API support (Safari 14.1+)
- May have limitations with some languages
- Check for any console warnings

### iOS Safari
- Limited Web Speech API support
- May show warning: "Voice dictation may not be supported on iOS Safari"
- Test with English first, then try other languages

### Firefox
- Web Speech API not supported
- Should show: "Voice input is not supported on this device"
- Mic button should be disabled

## Debugging

### Check Console Logs
Look for these log messages:
- `Initializing enhanced microphone with language: [lang]...`
- `VoiceToTextEngine: Initializing speech recognition with language: [lang]`
- `VoiceToTextEngine: Language set to [lang] before start`
- `Starting enhanced microphone listening with language: [lang]...`

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
3. Value should be: `{"language":"[lang-code]","provider":"webspeech"}`
4. If missing or incorrect, language selector may not be saving

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

## Notes
- Language changes take effect on the next recording session
- If recording is active when language changes, it will stop automatically
- Some languages may have better accuracy than others depending on browser
- iOS Safari has known limitations with Web Speech API


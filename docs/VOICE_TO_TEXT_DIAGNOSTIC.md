# Voice-to-Text Implementation & UX Diagnostic Report

**Date**: 2025-11-05  
**Mode**: Read-Only Analysis  
**Status**: Complete

---

## Executive Summary

This report analyzes the voice-to-text (mic button) feature in Heijō, covering implementation details, UX flow, privacy guarantees, and integration with the journaling system.

**Key Findings:**
- ✅ **Voice-to-text only** - No audio/video files stored anywhere
- ✅ **Web Speech API** - Uses browser-native speech recognition
- ✅ **Real-time transcription** - Shows interim results live in textarea
- ✅ **Privacy-first** - Only transcribed text is saved, no raw audio
- ⚠️ **Error handling** - Good coverage, but some edge cases could be clearer

---

## 1. Implementation Overview

### 1.1 Components & Files

**Primary Components:**
- **`components/MicButton.tsx`** (310 lines)
  - React component that renders the mic button UI
  - Handles user interaction (click to start/stop)
  - Manages permission states and visual feedback
  - Wraps `enhancedMicButton` from `lib/voiceToText.ts`

- **`lib/voiceToText.ts`** (573 lines)
  - Core voice-to-text engine implementation
  - Contains three main classes:
    - `VoiceToTextEngine` - Web Speech API wrapper
    - `VoiceActivityDetector` - Web Audio API for voice detection
    - `EnhancedMicButton` - Combines both engines

**Integration Point:**
- **`components/Composer.tsx`** (lines 276-336, 544-548)
  - Receives transcriptions via `handleVoiceTranscript()` callback
  - Manages voice state (`isVoiceActive`, `voiceError`, `interimTranscript`)
  - Integrates transcribed text into journal content

### 1.2 API Used

**Primary API: Web Speech API**
- **Location**: `lib/voiceToText.ts:132`
- **Implementation**: `window.SpeechRecognition` or `window.webkitSpeechRecognition`
- **Browser Support**: Chrome, Edge, Safari (webkit prefix)

**Secondary API: Web Audio API (for VAD)**
- **Location**: `lib/voiceToText.ts:362-457`
- **Purpose**: Voice Activity Detection (VAD) to detect when user is speaking
- **Implementation**: `AudioContext`, `AnalyserNode`, `MediaStreamAudioSourceNode`
- **Note**: VAD is used for optimization, not for recording audio files

**No Third-Party Libraries:**
- ✅ Pure browser APIs only
- ✅ No external dependencies for speech recognition

### 1.3 How Mic Feature is Wired into Composer

**Flow:**
1. **MicButton** renders in Composer (line 544)
2. User clicks mic button → `toggleListening()` called
3. `enhancedMicButton.startListening()` called with callbacks
4. **Interim results** → `onTranscript(text, false)` → `handleVoiceTranscript()` → `setInterimTranscript()`
5. **Final results** → `onTranscript(text, true)` → `handleVoiceTranscript()` → `setContent()` (appends to existing)
6. Text appears in textarea (line 494: `content + interimTranscript`)
7. Auto-save triggers after 7 seconds (same as typed text)

**State Management:**
- `isVoiceActive` - Visual indicator that mic is listening
- `interimTranscript` - Live transcription shown in textarea
- `voiceError` - Error messages displayed to user
- `source` - Set to `'voice'` when voice input is used

---

## 2. Voice-to-Text Only Confirmation

### 2.1 Audio/Video Storage Search

**Searched for:**
- `MediaRecorder` - ❌ Not found (except in diagnostic code)
- `getUserMedia` with audio tracks - ✅ Found (but only for VAD, not recording)
- Blob creation for audio/video - ❌ Not found
- Supabase storage uploads - ❌ Not found
- File extensions (.mp3, .wav, .mp4) - ❌ Not found (except in README for intro video)

### 2.2 What `getUserMedia` is Used For

**Location**: `lib/voiceToText.ts:386`, `components/MicButton.tsx:144`

**Purpose**: 
- **NOT for recording audio files**
- Used for:
  1. **Voice Activity Detection (VAD)** - Analyzing audio levels to detect speech
  2. **Microphone permission** - Requesting access to mic for Web Speech API

**Evidence:**
- `getUserMedia({ audio: true })` creates a stream
- Stream is connected to `AnalyserNode` for VAD (line 398)
- Stream is **NOT** connected to `MediaRecorder`
- No blob creation or file storage

### 2.3 Confirmation Statement

**✅ CONFIRMED: Voice-to-text only, no audio storage**

> Heijō currently uses **voice-to-text only**.
> 
> No raw audio or video is stored anywhere — only the transcribed text is saved to localStorage (and Supabase if premium).

**Evidence:**
1. ✅ Uses Web Speech API (`SpeechRecognition`) - browser handles transcription, no audio files
2. ✅ `getUserMedia` only used for VAD and permission, not recording
3. ✅ No `MediaRecorder` usage
4. ✅ No blob creation or file storage
5. ✅ No Supabase storage bucket uploads
6. ✅ Only text content saved: `entry.content` (string) in localStorage

**Privacy Guarantee:**
- ✅ Audio stream is processed in real-time by browser
- ✅ Only transcribed text is captured
- ✅ No audio data persists after transcription
- ✅ Same privacy as typed text entries

---

## 3. Mic UX Flow

### 3.1 Starting Recording

**When user taps mic button:**

1. **Function called**: `toggleListening()` (MicButton.tsx:115)
2. **Checks**:
   - Is mic initialized? (`isInitialized`)
   - Is speech recognition supported? (`isSupported`)
   - Permission state (`permissionState`)

3. **If permission needed**:
   - Calls `navigator.mediaDevices.getUserMedia({ audio: true })` (line 144)
   - Shows browser permission prompt
   - Sets `permissionState = 'granted'` on success

4. **Starts listening**:
   - Calls `enhancedMicButton.startListening()` (line 156)
   - Sets `isListening = true` (line 171)
   - Triggers `onStart` callback

**Visual Feedback:**

**Button State Changes:**
- **Before**: Default state (line 228)
  - Class: `border-soft-silver text-text-secondary hover:border-graphite-charcoal`
  - Tooltip: "Start voice recording"

- **While listening**: (line 222)
  - Class: `border-soft-silver text-soft-silver bg-transparent record-btn is-recording`
  - Tooltip: "Stop recording"
  - **Pulsing animation**: `is-recording` class (likely CSS animation)

**Additional Visual Indicators:**
- **Composer**: `isVoiceActive` state shows "Jump to live" button (line 687)
- **Composer**: Shows "Listening..." indicator with pulsing dot (line 670-676)

**Answer:**
- ✅ **Immediate visual feedback** - Button changes appearance, pulsing animation
- ✅ **Clear state** - Tooltip changes to "Stop recording"
- ✅ **Additional indicators** - "Listening..." badge appears

### 3.2 While Recording

**UI Shows "Listening" State:**

1. **Button**: Pulsing animation, different styling (line 222)
2. **Badge**: "Listening..." with pulsing dot (line 670-676)
   - Shows `interimTranscript` if available
   - Positioned at bottom-right of textarea

**Partial Results Handling:**

**Location**: `components/Composer.tsx:322-326`

**Interim Results:**
- Shown **live in textarea** (line 494: `content + interimTranscript`)
- Displayed with `interimTranscript` state
- Updated in real-time as user speaks
- **Not saved** until final result

**Final Results:**
- Appended to existing content (line 285: `prev + (prev ? ' ' : '') + transcript`)
- Line breaks added on sentence endings (line 288-290)
- `interimTranscript` cleared (line 295)
- **Saved** via auto-save (7 seconds) or manual save

**Auto-Stop on Silence:**

**Location**: `lib/voiceToText.ts:307-314`

**Implementation:**
- **3-second silence timeout** (line 475: `maxSilenceDuration: 3000`)
- Triggered by `onspeechend` event (line 240)
- Automatically stops recognition after 3 seconds of silence
- User can also manually stop by clicking mic button again

**Answer:**
- ✅ **UI shows listening** - Button pulsing, "Listening..." badge
- ✅ **Interim results shown live** - Real-time transcription in textarea
- ✅ **Auto-stop on silence** - 3-second timeout after speech ends

### 3.3 Stopping Recording

**How Recording Stops:**

1. **Manual stop**: User clicks mic button again
   - Calls `enhancedMicButton.stopListening()` (line 136)
   - Sets `isListening = false` (line 137)

2. **Auto-stop**: 3 seconds of silence
   - Triggered by silence timer (line 309-313)
   - Calls `this.stop()` automatically

3. **Error stop**: Recognition error occurs
   - `onError` callback fires (line 164)
   - Sets `isListening = false` (line 166)

**Text Merging:**

**Location**: `components/Composer.tsx:276-294`

**When final transcript received:**
1. **Appended to existing content** (line 285)
   - `prev + (prev ? ' ' : '') + transcript`
   - Adds space if content exists, otherwise just transcript

2. **Line breaks added** (line 288-290)
   - If transcript ends with `.`, `!`, or `?`
   - Adds `\n\n` for paragraph breaks

3. **Source set to 'voice'** (line 292)
   - Marks entry as voice-sourced for analytics

4. **Auto-scroll** (line 317-321)
   - Scrolls to bottom if user hasn't manually scrolled

**Answer:**
- ✅ **Stops on second tap** - Manual stop works
- ✅ **Auto-stops on silence** - 3-second timeout
- ✅ **Text appended** - Merged with existing content, not replaced
- ✅ **Smart formatting** - Line breaks on sentence endings

### 3.4 Permissions & Errors

**Permission Handling:**

**Location**: `components/MicButton.tsx:38-94, 140-153`

**Permission States:**
- `'granted'` - Mic access allowed
- `'denied'` - Mic access blocked
- `'prompt'` - Permission not yet requested
- `'unknown'` - Permission state unknown

**Permission Request:**
- Checks `navigator.permissions.query({ name: 'microphone' })` (line 77)
- If `'prompt'` or `'unknown'`, calls `getUserMedia()` (line 144)
- Browser shows native permission prompt

**Error Handling:**

**Location**: `components/MicButton.tsx:191-207`, `components/Composer.tsx:329-336`

**Error Types Handled:**
1. **NotAllowedError** - Permission denied
   - Message: "Permission denied — enable mic in browser."
   - Button shows denied state (red border, disabled)

2. **NotFoundError** - No input device
   - Message: "No input device detected."

3. **NotReadableError** - Mic in use
   - Message: "Mic already in use by another app."

4. **AbortError** - Access interrupted
   - Message: "Microphone access was interrupted."

5. **SecurityError** - Security policy blocked
   - Message: "Microphone access blocked by security policy."

**User Feedback:**

**Visual States:**
- **Denied**: Red border, red text, disabled button (line 224)
- **Unsupported**: Grayed out, disabled button (line 226)
- **Error notification**: Red notification banner (line 836-844)
  - Shows error message
  - Auto-dismisses after 5 seconds (line 335)

**Answer:**
- ✅ **Permission denials handled** - Clear visual state, error message
- ✅ **Unsupported browsers handled** - Button disabled, tooltip explains
- ✅ **Recognition errors handled** - Error banner shown, auto-dismisses
- ✅ **User sees feedback** - Visual states + error notifications

### 3.5 Mobile vs Desktop

**Special Handling:**

**Location**: `components/Composer.tsx:11-20`

**Mobile Detection:**
- `useIsMobile()` hook checks `window.innerWidth < 768`
- Used for textarea height calculation (line 522-527)
- **Not used for mic functionality**

**Mic Behavior:**
- ✅ **Same behavior** across mobile and desktop
- ✅ **No special mobile handling** for mic button
- ✅ **Web Speech API** works on mobile browsers (Chrome, Safari)

**Answer:**
- ✅ **No special mobile handling** - Behavior is consistent across devices

---

## 4. Integration with Journaling & Storage

### 4.1 How Transcribed Text is Stored

**Flow:**

1. **Transcription received** → `handleVoiceTranscript(text, isFinal)` (line 276)
2. **Text added to content** → `setContent(prev => prev + transcript)` (line 284)
3. **Source set to 'voice'** → `setSource('voice')` (line 292)
4. **Auto-save triggers** → After 7 seconds of inactivity (line 154-172)
5. **Entry saved** → `storage.saveEntry()` (line 84 in journal/page.tsx)
6. **Stored in localStorage** → Key: `'heijo-journal-entries'` (lib/store.ts:320)
7. **Synced to Supabase** → If premium active (lib/store.ts:40-79)

**Entry Structure:**
```typescript
{
  id: string,
  content: string,  // ← Transcribed text stored here
  source: 'voice',  // ← Marked as voice entry
  tags: string[],
  created_at: string,
  sync_status: 'local_only' | 'synced',
  ...
}
```

**Answer:**
- ✅ **Text stored in state** - `content` state variable
- ✅ **Saved to localStorage** - Same key as typed entries
- ✅ **Synced to Supabase** - If premium active, same as typed entries

### 4.2 Treated Like Typed Text

**Auto-Save:**
- ✅ **Same trigger** - 7 seconds of inactivity (line 154-172)
- ✅ **Same condition** - Content length > 10 chars
- ✅ **Same mechanism** - `handleAutoSave()` callback

**Save Trigger:**
- ✅ **Manual save** - Cmd/Ctrl+S or Cmd/Ctrl+Enter works
- ✅ **Same function** - `handleSave()` in journal/page.tsx

**History Display:**
- ✅ **Shows in History** - `RecentEntriesDrawer` displays voice entries
- ✅ **Marked as voice** - Shows "Voice" label (RecentEntriesDrawer.tsx:238)
- ✅ **Same format** - Content, tags, date/time all displayed

**Answer:**
- ✅ **Treated exactly like typed text** - Same autosave, same save trigger, shows in History
- ✅ **Only difference** - `source: 'voice'` field for analytics/tracking

---

## 5. UX Assessment & Notes

### 5.1 Clarity

**Mic On vs Off:**

**Strengths:**
- ✅ **Clear visual distinction** - Button changes appearance when listening
- ✅ **Pulsing animation** - `is-recording` class provides motion feedback
- ✅ **Tooltip updates** - "Start voice recording" → "Stop recording"
- ✅ **Additional indicators** - "Listening..." badge appears

**Gaps:**
- ⚠️ **No explicit "ON" label** - Relies on visual change and tooltip
- ⚠️ **Pulsing animation** - May not be obvious to all users (depends on CSS implementation)

**Assessment**: **Good** - Visual feedback is clear, but could benefit from explicit text label when active.

### 5.2 Feedback

**Confidence Indicators:**

**Strengths:**
- ✅ **Listening badge** - "Listening..." with pulsing dot shows active state
- ✅ **Interim results** - Live transcription shows words are being captured
- ✅ **Final results** - Text appears in textarea confirms capture
- ✅ **Button state** - Visual change confirms recording started

**Gaps:**
- ⚠️ **No confidence score** - User doesn't know transcription accuracy
- ⚠️ **No word-level feedback** - Can't see which words are being recognized in real-time (only full interim transcript)

**Assessment**: **Good** - User gets clear feedback that app is listening and capturing words, but could show more granular recognition feedback.

### 5.3 Failure Handling

**Permission Denials:**

**Strengths:**
- ✅ **Clear error messages** - Specific messages for each error type
- ✅ **Visual state** - Red border, disabled button for denied state
- ✅ **Error notification** - Banner shows error message
- ✅ **Tooltip guidance** - "Permission denied — enable mic in browser."

**Gaps:**
- ⚠️ **No recovery guidance** - Doesn't explain how to enable mic in browser settings
- ⚠️ **No retry mechanism** - User must manually click again after fixing permissions

**Unsupported Browsers:**

**Strengths:**
- ✅ **Graceful degradation** - Button disabled, shows unsupported state
- ✅ **Clear tooltip** - "Microphone not supported in this browser."

**Gaps:**
- ⚠️ **No alternative suggestion** - Doesn't suggest using a supported browser

**Assessment**: **Good** - Errors are handled gracefully with clear messages, but could provide more recovery guidance.

### 5.4 Safety

**Privacy Guarantee:**

**Strengths:**
- ✅ **No audio storage** - Confirmed: only text is saved
- ✅ **Real-time processing** - Audio processed in browser, not stored
- ✅ **Same privacy as typing** - Voice entries treated identically to typed entries
- ✅ **Local-first** - Text stored locally, only synced if premium

**Assessment**: **Excellent** - Privacy-first approach maintained, no audio data persists.

---

## 6. Suggested Improvements (Prose Only)

### 6.1 Clarity Improvements

1. **Explicit "Recording" Label**
   - Add text label "Recording..." next to button when active
   - Makes state unambiguous without relying on visual changes

2. **Word-Level Feedback**
   - Show individual words being recognized (if Web Speech API supports)
   - Helps user see recognition progress more granularly

### 6.2 Feedback Improvements

1. **Confidence Indicator**
   - Show transcription confidence score (if available from API)
   - Helps user know if they need to speak more clearly

2. **Recognition Status**
   - Show "Recognizing..." vs "Listening..." states
   - Distinguishes between active listening and processing

### 6.3 Error Handling Improvements

1. **Recovery Guidance**
   - Add help text explaining how to enable mic in browser settings
   - Link to browser-specific instructions

2. **Retry Mechanism**
   - Auto-retry permission request after user fixes settings
   - Or provide explicit "Retry" button

3. **Browser Support Info**
   - Show which browsers are supported
   - Suggest alternatives if current browser doesn't support

### 6.4 UX Polish

1. **Visual Polish**
   - Ensure pulsing animation is smooth and noticeable
   - Consider adding sound feedback (optional, user-controlled)

2. **Mobile Optimization**
   - Test on mobile browsers for any touch-specific issues
   - Consider larger tap target for mobile

3. **Accessibility**
   - Add ARIA labels for screen readers
   - Ensure keyboard navigation works

---

## 7. Summary

### 7.1 Implementation

- ✅ **Web Speech API** - Browser-native, no external dependencies
- ✅ **Enhanced engine** - Voice Activity Detection for optimization
- ✅ **Real-time transcription** - Interim results shown live
- ✅ **Privacy-first** - No audio storage, only text

### 7.2 UX Flow

- ✅ **Clear start/stop** - Button click toggles recording
- ✅ **Visual feedback** - Pulsing animation, "Listening..." badge
- ✅ **Live transcription** - Interim results shown in textarea
- ✅ **Auto-stop** - 3-second silence timeout
- ✅ **Smart merging** - Text appended with formatting

### 7.3 Error Handling

- ✅ **Permission handling** - Clear states and messages
- ✅ **Error notifications** - Banner shows errors, auto-dismisses
- ✅ **Unsupported browsers** - Graceful degradation
- ⚠️ **Recovery guidance** - Could be more detailed

### 7.4 Integration

- ✅ **Seamless integration** - Voice entries treated like typed entries
- ✅ **Same storage** - localStorage + optional Supabase sync
- ✅ **History support** - Voice entries show in History with "Voice" label
- ✅ **Auto-save** - Same 7-second trigger as typed text

### 7.5 Privacy

- ✅ **No audio storage** - Confirmed: only transcribed text saved
- ✅ **Real-time processing** - Audio processed in browser, not persisted
- ✅ **Privacy-first** - Aligns with Heijō's privacy principles

---

**End of Diagnostic Report**

This report is read-only and does not include any code changes. All findings are based on static code analysis of the current codebase.


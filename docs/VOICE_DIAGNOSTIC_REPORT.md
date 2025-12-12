# Voice Pipeline Diagnostic Report

**Date:** 2025-01-XX  
**Scope:** Voice-only diagnostic and live transcription fix

---

## 1. Voice Architecture Overview

### Providers

**WebSpeech Provider** (`lib/voiceToText.ts:VoiceToTextEngine`)
- Uses browser's native `SpeechRecognition` API
- Configured with `interimResults: true` (line 118)
- Emits both interim (`isFinal: false`) and final (`isFinal: true`) results
- Low-latency streaming with 500ms chunks

**Backend STT Provider** (`lib/voiceToText.ts:BackendSTTEngine`)
- Records audio via `MediaRecorder`
- Sends to `/api/stt` endpoint
- Only emits final results (no interim support)
- Used when WebSpeech unavailable (Safari, etc.)

### Recognition Start/Stop

**Start Flow:**
1. User clicks MicButton (`components/MicButton.tsx:272`)
2. `toggleListening()` called
3. `enhancedMicButtonRef.current.startListening()` (line 415)
4. Voice engine initialized and started

**Stop Flow:**
1. User clicks MicButton again OR
2. Silence timeout reached (WebSpeech only) OR
3. Max duration reached (Backend STT, 90s)

### Transcript Emission

**WebSpeech Engine** (`lib/voiceToText.ts:handleRecognitionResult`)
- Line 441-448: Emits interim results (`isFinal: false`)
- Line 420-425: Emits final results (`isFinal: true`)
- Both call `onResultCallback?.(result)` with `TranscriptionResult`

**Backend STT Engine** (`lib/voiceToText.ts:processRecording`)
- Line 740-745: Only emits final results after API response
- No interim results (backend processes entire recording)

### Transcript Consumption

**MicButton → Composer Chain:**
1. `MicButton.tsx:417` → `onTranscript(text, isFinal)`
2. `Composer.tsx:1020` → `onTranscript={handleVoiceTranscript}`
3. `Composer.tsx:648` → `handleVoiceTranscript(transcript, isFinal)`

**State Updates:**
- **Interim** (line 700-708): `setInterimTranscript(transcript)`, `setSource('voice')`
- **Final** (line 654-699): `setContent(mergedContent)`, `setInterimTranscript('')`, `setSource('voice')`

### UI Rendering

**Textarea Display:**
- Line 1101: `value={content}` ← **ONLY shows `content`, NOT `interimTranscript`**
- This is the root cause: interim transcript is stored but never displayed

**Interim Indicator:**
- Line 1194-1205: Shows "Listening..." indicator when `interimTranscript` exists
- Separate div, not in textarea

---

## 2. Event Flow (Call Graph)

```
User clicks MicButton
  ↓
MicButton.toggleListening() (MicButton.tsx:272)
  ↓
enhancedMicButtonRef.current.startListening() (MicButton.tsx:415)
  ↓
EnhancedMicButton.startListening() (voiceToText.ts:1169)
  ↓
VoiceToTextEngine.start() (voiceToText.ts:197)
  ↓
WebSpeech recognition.start() (voiceToText.ts:225)
  ↓
[User speaks]
  ↓
WebSpeech onresult event (voiceToText.ts:291)
  ↓
handleRecognitionResult() (voiceToText.ts:376)
  ↓
[Interim result] → onResultCallback({ text, isFinal: false }) (voiceToText.ts:442)
  ↓
EnhancedMicButton.onResult callback (voiceToText.ts:1210)
  ↓
MicButton callback (text, isFinal) => onTranscript(text, isFinal) (MicButton.tsx:416)
  ↓
Composer.handleVoiceTranscript(transcript, false) (Composer.tsx:648)
  ↓
setInterimTranscript(transcript) (Composer.tsx:702)
  ↓
[State updates, but textarea value={content} doesn't show it]
  ↓
[Final result] → onResultCallback({ text, isFinal: true }) (voiceToText.ts:420)
  ↓
[Same chain...]
  ↓
Composer.handleVoiceTranscript(transcript, true) (Composer.tsx:648)
  ↓
setContent(mergedContent) (Composer.tsx:669)
  ↓
[Now textarea shows content]
```

---

## 3. Why Live Text is Not Showing

### Root Cause

**File:** `components/Composer.tsx`  
**Line:** 1101

```typescript
<textarea
  value={content}  // ← ONLY shows 'content' state
  ...
/>
```

**Problem:**
- `interimTranscript` state is updated (line 702) when interim results arrive
- But textarea `value` prop only binds to `content`
- `content` is empty until final transcript arrives (line 669)
- Result: User sees blank textarea during speech

### Evidence

1. **Interim results ARE received:**
   - `handleVoiceTranscript` called with `isFinal === false` (line 700)
   - `setInterimTranscript(transcript)` executes (line 702)
   - State updates correctly

2. **Interim results ARE stored:**
   - `interimTranscript` state exists (line 44)
   - Updated on every interim result (line 702)

3. **Interim results are NOT rendered in textarea:**
   - Textarea `value={content}` (line 1101)
   - `content` is empty during interim phase
   - Only final transcript updates `content` (line 669)

4. **Interim indicator exists but doesn't show text:**
   - Line 1194-1205: Shows "Listening..." indicator
   - Does NOT display the actual transcript text
   - Only visual indicator

### Configuration Check

**WebSpeech Config** (`lib/voiceToText.ts:118`):
```typescript
interimResults: true,  // ✅ Enabled
```

**Result:** Interim results ARE being emitted, just not displayed.

---

## 4. Confirm Voice Does NOT Trigger Save

### Search Results

**No calls to `saveEntry()` from voice handlers:**
- `handleVoiceTranscript` (line 648): Only updates state, no save calls
- `handleMicStart` (line 723): Only sets `isVoiceActive`, no save
- `handleMicStop` (line 732): Only sets `isVoiceActive`, no save

**No calls to `onSave()` from voice handlers:**
- Voice handlers only update local state
- `onSave` is only called from `saveEntry('manual')` (line 457)

**No calls to `handleManualSaveRef` from voice handlers:**
- Voice handlers don't reference save functions

### Potential Indirect Trigger

**Race Condition Risk:**
- Final transcript calls `setContent(mergedContent)` (line 669)
- This changes `content` state
- Auto-save useEffect depends on `content` (line 616)
- **BUT:** Effect checks `source === 'voice'` (line 588) and returns early
- **AND:** `setSource('voice')` is called on same line (line 671)
- **RISK:** React state batching might cause effect to see old `source === 'text'` before `setSource('voice')` applies

**However:** `ENABLE_AUTO_SAVE` is `false` by default, so effect returns early anyway (line 569).

**Conclusion:** Voice does NOT directly trigger saves. The only risk is the race condition above, but it's mitigated by `ENABLE_AUTO_SAVE === false`.

---

## 5. Candidate Fix Options

### Option 1: Merge interimTranscript into textarea display (RECOMMENDED)

**Approach:** Create derived `displayValue` that combines `content + interimTranscript`

**Pros:**
- Minimal change (one line)
- No mutation of `content` state
- Preserves existing save logic
- Clear separation: `content` = persisted, `interimTranscript` = live-only

**Cons:**
- None

**Implementation:**
```typescript
const displayValue = isVoiceActive && interimTranscript
  ? content + (content.trim() ? ' ' : '') + interimTranscript
  : content;

<textarea value={displayValue} ... />
```

### Option 2: Update content directly with interim transcript

**Approach:** Call `setContent()` on every interim result

**Pros:**
- Simpler (no derived value)

**Cons:**
- Mutates `content` during speech (could trigger auto-save if enabled)
- Harder to distinguish persisted vs live text
- More state updates

### Option 3: Show interim in separate overlay

**Approach:** Display interim transcript in a floating overlay above textarea

**Pros:**
- Clear visual distinction

**Cons:**
- More complex UI
- User might not see it
- Doesn't match expected behavior

---

## 6. Selected Fix: Option 1

**Rationale:**
- Minimal, surgical change
- No side effects on save logic
- Preserves state separation
- Matches user expectation (text appears in textarea)

**Implementation Location:**
- `components/Composer.tsx` line ~1098 (before textarea render)

---

## 7. Manual Verification Steps

1. **Start voice recording:**
   - Click mic button
   - Speak a sentence

2. **Verify live transcription:**
   - Text should appear in textarea as you speak
   - Text should update in real-time

3. **Verify final transcript:**
   - Stop speaking
   - Final transcript should merge into `content`
   - Text should persist in textarea

4. **Verify no auto-save:**
   - Check browser console for save calls
   - Verify no entries appear in history without clicking Save

5. **Verify manual save:**
   - Click Save button
   - Entry should appear in history
   - Textarea should clear

---

## Summary

**Root Cause:** Textarea `value={content}` doesn't include `interimTranscript`, so live transcription is invisible.

**Fix:** Derive `displayValue` that merges `content + interimTranscript` when voice is active.

**Risk:** Low - only affects display, no save logic changes.


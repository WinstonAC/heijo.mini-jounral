# Heijō — Meditation Playback Spec (Scope Proposal)

## Goals
- Provide lightweight meditation modes inside the journal without external accounts.
- Modes: Silent, Nature Sounds, Guided, Sound Bath, Affirmations.
- Duration presets: 3, 5, 10, 15 minutes; custom input optional.

## UX
- Entry point: button from journal screen → opens modal/sheet.
- Select mode → select duration → start.
- Show countdown, pause/resume, end session → offer to append note to journal.

## Audio Strategy
- Assets hosted locally in `public/audio/*` to avoid network dependency.
- Formats: `mp3` with `preload=metadata` (streamed locally from bundle).
- Guided/Affirmations: short loops or stitched tracks with gapless playback.

## State & Persistence
- `localStorage` keys:
  - `heijo-meditation-preferences`: last mode, last duration, volume.
  - `heijo-meditation-history`: session summaries (timestamp, mode, duration, completed).
- Analytics remain local-only; optional aggregation in dashboard.

## Implementation Outline
- UI components (Shadcn/Tailwind):
  - `MeditationLauncher` (button), `MeditationModal` (selector + player), `Countdown`.
- Player logic:
  - HTMLAudioElement with WebAudio fade in/out.
  - Timer with drift correction (use `performance.now()` + animation frame ticks).
  - Pause/resume, end, auto-stop on timer.
- Assets:
  - `public/audio/nature/*.mp3`, `guided/*.mp3`, `affirmations/*.mp3`, `soundbath/*.mp3`.

## Edge Cases
- Overlapping audio: Stop any existing playback on start.
- Tab background throttling: Timer based on monotonic clock, not `setTimeout` alone.
- Offline: Fully functional from bundled assets.

## Out of Scope (v1)
- Streaming from external providers.
- Premium gating.
- Calendar scheduling and reminder hooks.

## Success Criteria
- Starts in <150ms on modern devices.
- Timer accuracy ±1s over 15 minutes.
- No audible pops at loop boundaries.

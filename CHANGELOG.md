# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
### Changed
- **Mobile Voice Input**: Repurposed mobile hero mic button into hero Save button
  - Mobile users now use device keyboard microphone for voice dictation (no custom STT UI)
  - Round hero Save button centered below journal card on mobile
  - Desktop MicButton behavior unchanged (Web Speech API with custom UI)
  - Added keyboard mic usage hint on mobile
- **UI Polish**: Applied Dieter-Rams/brutalist aesthetic polish across the journal interface
  - Main card: Added subtle 1px borders (#e5e5e5) and soft shadows for elevation
  - Typography: Reduced line-heights (~1.2) and increased letter-spacing for all-caps labels
  - Mic button: Recessed shell design with inner shadows and thin orange recording ring (desktop only)
  - S/H buttons: Minimal ghost chips (border-only, 80% opacity → 100% on hover)
  - Textarea: Subtle radial gradient, breathing focus effect (scale 1.01 + shadow increase)
  - Mobile: Hero Save button + bottom nav with Save/History controls
  - Settings: Full-height mobile sheet with sticky header and consistent dividers
  - Spacing: Implemented 8px spacing system throughout for clean alignment
  - Responsive: Optimized for 320-430px mobile widths with proper safe-area handling

## [1.0.0] - 2025-10-29
### Added
- Initial stable release (privacy-first local journal)
- AES-GCM encryption, GDPR export/delete, offline-first
- Streaming voice transcription and analytics dashboard (local-only)

### Docs
- Testing Readiness, Architecture overview, Deployment, Extension packaging

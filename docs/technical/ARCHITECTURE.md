# Heijō — Architecture Overview

This document provides a high‑level view of the system and pointers to detailed docs.

## System Context
- Client‑only web app (Next.js App Router) with optional Supabase sync.
- Local‑first data model with AES‑GCM encryption (IndexedDB + localStorage indices).
- Voice transcription via Web Speech API.

## Major Modules
- Auth/session: `lib/auth.tsx` (Supabase optional)
- Storage: `lib/secureStorage.ts`, `lib/store.ts`
- Encryption: `lib/encryption.ts`
- Voice: `lib/voiceToText.ts`
- GDPR & Analytics: `lib/gdpr.ts`, `lib/analytics.ts`

## Data Flows
- Entry create → encrypt → persist locally → optional background sync to Supabase when configured.
- Session changes → persisted to `localStorage` for resilience.
- Analytics (local‑only) → `localStorage` for dashboard rendering.

## Diagram Notes
- Place diagrams under `docs/technical/diagrams/` (PNG/SVG) and keep them source‑controlled.
- Recommended views:
  - Context: Browser, Optional Supabase, No third‑party APIs (v1)
  - Container: App (Next.js), Storage (IndexedDB/localStorage), Optional Sync Worker
  - Component: `Composer`, `MicButton`, `EntryList`, `PrivacySettings`

## References
- Database: `docs/technical/DATABASE.md`
- Security: `docs/technical/SECURITY.md`
- Frontend: `docs/technical/FRONTEND.md`
- API & Integrations: `docs/technical/API.md` (calendar/OAuth: not implemented in v1)

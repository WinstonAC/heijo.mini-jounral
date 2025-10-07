#!/usr/bin/env bash

set -euo pipefail

# HEIJŌ JOURNAL – Vercel Environment Reset Script
# Purpose: Fix the "references Secret … does not exist" error by removing stale
# secrets/envs and redeploying cleanly, non-interactively.

# Requirements:
# - Vercel CLI installed (npm i -g vercel)
# - Environment variables set:
#     VERCEL_TOKEN           (required)
#     SUPABASE_ANON_KEY      (required)
#     SUPABASE_URL           (optional; defaults to the heijo Supabase URL)
#     VERCEL_PROJECT         (optional; defaults to "heijo-journal")
#     VERCEL_SCOPE           (optional; your Vercel team/org slug)

echo "🧘‍♂️ HEIJŌ JOURNAL – Vercel Environment Reset"

if ! command -v vercel >/dev/null 2>&1; then
  echo "❌ vercel CLI not found. Install with: npm i -g vercel" >&2
  exit 1
fi

if [[ -z "${VERCEL_TOKEN:-}" ]]; then
  echo "❌ VERCEL_TOKEN is required in the environment." >&2
  exit 1
fi

if [[ -z "${SUPABASE_ANON_KEY:-}" ]]; then
  echo "❌ SUPABASE_ANON_KEY is required in the environment." >&2
  exit 1
fi

SUPABASE_URL_DEFAULT="https://lzeuvaankbnngfjxpycn.supabase.co"
SUPABASE_URL="${SUPABASE_URL:-$SUPABASE_URL_DEFAULT}"
VERCEL_PROJECT="${VERCEL_PROJECT:-heijo-journal}"
# Build optional scope flag lazily to avoid unbound array issues under set -u
SCOPE_FLAG=${VERCEL_SCOPE:+--scope "${VERCEL_SCOPE}"}

# Move to repo root (script lives in scripts/)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "${SCRIPT_DIR}/.."

echo "\nSTEP 1: Authenticate and link project"
# Use token for non-interactive auth; no need to run `vercel login` separately
vercel link --project "${VERCEL_PROJECT}" --yes --token "${VERCEL_TOKEN}" ${SCOPE_FLAG:-} || true

echo "\nSTEP 2: Remove any account-level secrets shadowing envs (safe if missing)"
vercel secrets rm next_public_supabase_url --token "${VERCEL_TOKEN}" ${SCOPE_FLAG:-} || true
vercel secrets rm next_public_supabase_anon_key --token "${VERCEL_TOKEN}" ${SCOPE_FLAG:-} || true
vercel secrets rm next_public_debug --token "${VERCEL_TOKEN}" ${SCOPE_FLAG:-} || true

echo "\nSTEP 3: Remove any project-level env vars that might be corrupted (production)"
vercel env rm NEXT_PUBLIC_SUPABASE_URL production --yes --token "${VERCEL_TOKEN}" ${SCOPE_FLAG:-} || true
vercel env rm NEXT_PUBLIC_SUPABASE_ANON_KEY production --yes --token "${VERCEL_TOKEN}" ${SCOPE_FLAG:-} || true
vercel env rm NEXT_PUBLIC_DEBUG production --yes --token "${VERCEL_TOKEN}" ${SCOPE_FLAG:-} || true

echo "\nSTEP 4: Re-add clean plaintext environment variables (production)"
printf "%s" "${SUPABASE_URL}" | vercel env add NEXT_PUBLIC_SUPABASE_URL production --token "${VERCEL_TOKEN}" ${SCOPE_FLAG:-}
printf "%s" "${SUPABASE_ANON_KEY}" | vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production --token "${VERCEL_TOKEN}" ${SCOPE_FLAG:-}
printf "%s" "0" | vercel env add NEXT_PUBLIC_DEBUG production --token "${VERCEL_TOKEN}" ${SCOPE_FLAG:-}

echo "\nSTEP 5: Verify everything is clean (no aliases, all plaintext)"
vercel env ls --token "${VERCEL_TOKEN}" ${SCOPE_FLAG:-}

echo "\nSTEP 6: Deploy clean production build"
vercel --prod --yes --token "${VERCEL_TOKEN}" ${SCOPE_FLAG:-}

echo "\n✅ Completed: Vercel environment reset and production deploy triggered."



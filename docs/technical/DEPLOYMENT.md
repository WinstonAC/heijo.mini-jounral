# Heijō — Deployment & CI/CD

## Manual Deployment (Vercel)
1. Ensure environment variables are set in Vercel project (`NEXT_PUBLIC_*` as needed).
2. Connect GitHub repo and import into Vercel.
3. Set build command: `npm run build` and output as per Next.js defaults.
4. Assign custom domain (optional) and verify HTTPS.

## CI Suggestions
- GitHub Actions workflow:
  - `node@18` setup
  - `npm ci && npm run lint && npm run build`
  - Optionally run type checks: `tsc --noEmit`
- Protect `main` with required checks.

## Release Management
- Use semantic versioning.
- Tag releases `vX.Y.Z`.
- Maintain `CHANGELOG.md` for notable changes.

## Environment Strategy
- Local: `.env.local` (optional; app runs offline without keys)
- Preview: Vercel preview env with optional Supabase keys
- Production: Strict env management in Vercel dashboard

## Rollback
- Vercel supports instant rollback by promoting a previous deployment.

## Security
- Do not expose service role keys to the client.
- Review CSP and headers prior to production.

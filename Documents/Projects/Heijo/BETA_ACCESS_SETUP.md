# Beta Access Setup Guide

## Quick Start

This guide will help you set up the invite-only beta access system for Heijō Mini-Journal.

## Prerequisites

1. Supabase project with Auth enabled
2. Environment variables configured
3. Database access (via Supabase dashboard or CLI)

## Setup Steps

### 1. Run Database Migration

Apply the beta access migration:

```bash
# Via Supabase CLI
supabase db push

# Or via Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Copy contents of: heijo-landing/supabase/migrations/20250120_beta_access.sql
# 3. Run the SQL
```

This creates:
- `beta_testers` table for allowlist
- `status` column on `waitlist` table

### 2. Enable Supabase Auth

1. Go to Supabase Dashboard → Authentication → Settings
2. Enable Email provider
3. Configure email templates (optional)
4. Set site URL to your domain

### 3. Add Beta Testers

Add emails to the `beta_testers` table:

```sql
INSERT INTO public.beta_testers (email, invited_by, notes)
VALUES 
  ('tester1@example.com', 'admin@heijo.io', 'Early access tester'),
  ('tester2@example.com', 'admin@heijo.io', 'Product team member');
```

### 4. Configure Environment Variables

Ensure these are set in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 5. Test the Flow

1. **Landing Page** (`/journal`)
   - Visit the journal landing page
   - Submit email via waitlist form
   - Should see "invite-only beta" message

2. **Login Page** (`/app`)
   - Try to sign up with non-approved email
   - Should see error: "not on beta access list"
   - Try with approved email - should work

3. **Journal App** (`/app/journal`)
   - Sign in with approved email
   - Should access journal interface
   - Sign out should work

## Routes

- `/journal` - Public landing page (marketing)
- `/app` - Login/signup (invite-only)
- `/app/journal` - Private journal app (requires auth)

## Adding New Beta Testers

### Via SQL
```sql
INSERT INTO public.beta_testers (email, invited_by, notes)
VALUES ('newuser@example.com', 'admin@heijo.io', 'New beta tester');
```

### Via Supabase Dashboard
1. Go to Table Editor → `beta_testers`
2. Click "Insert row"
3. Enter email and optional metadata
4. Save

## Troubleshooting

### "not_on_beta_list" Error
- Check email is in `beta_testers` table
- Verify email is lowercase and trimmed
- Check RLS policies allow service role access

### Authentication Not Working
- Verify `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set
- Check Supabase Auth is enabled
- Verify site URL matches in Supabase settings

### Session Not Persisting
- Check middleware is running
- Verify cookies are being set
- Check browser allows cookies

## Next Steps

- Implement full journal interface at `/app/journal`
- Add admin dashboard for managing beta testers
- Set up automated email invitations
- Create waitlist approval workflow

For detailed API documentation, see [BETA_ACCESS.md](docs/technical/BETA_ACCESS.md).


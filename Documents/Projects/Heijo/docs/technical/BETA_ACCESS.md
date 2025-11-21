# Beta Access Control Documentation

## Overview
Heijō Mini-Journal uses an invite-only beta access system. Only emails on the `beta_testers` allowlist can create accounts or sign in.

## Architecture

### Database Schema

#### beta_testers Table
```sql
CREATE TABLE public.beta_testers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE CHECK (email ~* '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'),
  invited_at timestamptz NOT NULL DEFAULT now(),
  invited_by text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

#### waitlist Table (Updated)
The `waitlist` table now includes a `status` field:
- `pending` - Default status for new signups
- `approved` - Approved for beta access
- `rejected` - Not approved

### Access Flow

1. **Landing Page** (`/journal`)
   - Public marketing page with hero + CTA
   - Email capture form writes to `waitlist` with `status='pending'`
   - Shows "invite-only beta" message

2. **Login/Signup** (`/app`)
   - Checks if email is in `beta_testers` table
   - Only allows signup/login if email is on allowlist
   - Shows clear error message if not approved

3. **Journal App** (`/app/journal`)
   - Protected route requiring authentication
   - Redirects to `/app` if not authenticated
   - Full journal interface (to be implemented)

## API Endpoints

### POST /api/auth/check-beta
Check if an email is on the beta allowlist.

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "allowed": true,
  "email": "user@example.com"
}
```

### POST /api/auth/signup
Create a new account (requires beta access).

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "ok": true,
  "user": { ... }
}
```

**Errors:**
- `not_on_beta_list` - Email not on allowlist
- `invalid_email` - Invalid email format
- `invalid_password` - Password too short

### POST /api/auth/signin
Sign in to existing account (requires beta access).

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "ok": true,
  "user": { ... }
}
```

### GET /api/auth/session
Check current authentication status.

**Response:**
```json
{
  "authenticated": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

### POST /api/auth/signout
Sign out current user.

**Response:**
```json
{
  "ok": true
}
```

## Adding Beta Testers

To add a beta tester, insert their email into the `beta_testers` table:

```sql
INSERT INTO public.beta_testers (email, invited_by, notes)
VALUES ('user@example.com', 'admin@heijo.io', 'Early access tester');
```

## Environment Variables

Required for authentication:
```env
# Supabase URL (either SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL)
SUPABASE_URL=your_supabase_project_url
# OR
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Security

- **Row Level Security (RLS)**: Enabled on `beta_testers` table
- **Service Role Only**: Database operations use service role key
- **Email Validation**: Server-side validation for all email inputs
- **Password Requirements**: Minimum 6 characters (configurable)
- **Session Management**: HTTP-only cookies via Supabase SSR

## User Experience

### Non-Approved Users
- See "invite-only beta" message on landing page
- Can request access via waitlist form
- Cannot create accounts or sign in
- Clear error messages explaining access requirements

### Approved Beta Testers
- Can sign up with email/password
- Can sign in to existing accounts
- Full access to journal app at `/app/journal`
- Session persists across page refreshes

## Migration

Run the migration to set up beta access:
```bash
# Apply migration
psql -h your-db-host -U postgres -d your-db -f supabase/migrations/20250120_beta_access.sql
```

Or via Supabase dashboard:
1. Go to SQL Editor
2. Run the migration SQL

## Future Enhancements

- Admin dashboard for managing beta testers
- Automated email invitations
- Waitlist approval workflow
- Beta tester analytics


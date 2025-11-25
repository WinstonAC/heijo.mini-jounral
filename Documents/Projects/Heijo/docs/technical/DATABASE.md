# Database Documentation

## Overview
Heijō uses Supabase (PostgreSQL) as its primary database. This document outlines the database schema, data management patterns, and database operations.

## Database Provider
- **Provider**: Supabase (PostgreSQL 15+)
- **Connection**: Via Supabase JavaScript client
- **Authentication**: Service role key for admin operations
- **Security**: Row Level Security (RLS) enabled

## Schema

### Waitlist Table
```sql
CREATE TABLE public.waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL CHECK (email ~* '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'),
  source text,
  ua text,
  ip inet,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email)
);
```

#### Fields
- **id**: Primary key (UUID, auto-generated)
- **email**: User email address (validated with regex)
- **source**: Referral source (optional)
- **ua**: User agent string (optional)
- **ip**: IP address (optional)
- **created_at**: Timestamp (auto-generated)

#### Constraints
- **Email Validation**: Regex pattern for valid email format
- **Unique Constraint**: Prevents duplicate email addresses
- **NOT NULL**: Email is required

### Future Tables (Planned)
```sql
-- User accounts
CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User sessions
CREATE TABLE public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- User preferences
CREATE TABLE public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  theme text DEFAULT 'light',
  notifications boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

## Security

### Row Level Security (RLS)
```sql
-- Enable RLS on all tables
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Deny all operations by default
CREATE POLICY deny_all_waitlist ON public.waitlist
  FOR ALL USING (false) WITH CHECK (false);
```

### Access Control
- **Service Role**: Full access to all tables
- **Anonymous**: No direct database access
- **API Layer**: All operations go through API endpoints

## Data Management Patterns

### Email Collection
```typescript
// Insert new email
const { error } = await supabaseAdmin()
  .from('waitlist')
  .insert({ email });

// Handle duplicate emails
if (error) {
  const isDup = /duplicate key|unique/i.test(error.message);
  return { ok: isDup, error: isDup ? null : error.message };
}
```

### Error Handling
- **Duplicate Emails**: Graceful handling with success response
- **Validation Errors**: Clear error messages
- **Database Errors**: Proper error logging and user feedback

## Database Operations

### Connection Management
```typescript
// Supabase client configuration
export const sb = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, { 
      auth: { persistSession: false } 
    })
  : null;
```

### Admin Operations
```typescript
// Service role client for admin operations
export const supabaseAdmin = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
};
```

## Data Privacy

### GDPR Compliance
- **Data Export**: Users can request their data
- **Data Deletion**: Users can request data removal
- **Data Minimization**: Only collect necessary information
- **Transparency**: Clear privacy policies

### Data Retention
- **Email Addresses**: Retained until user unsubscribes
- **Analytics Data**: Aggregated and anonymized
- **Logs**: Retained for security purposes (30 days)

## Performance Optimization

### Indexing
```sql
-- Email index for fast lookups
CREATE INDEX idx_waitlist_email ON public.waitlist(email);

-- Created_at index for time-based queries
CREATE INDEX idx_waitlist_created_at ON public.waitlist(created_at);
```

### Connection Pooling
- **Supabase**: Built-in connection pooling
- **API Layer**: Reuses database connections
- **Error Handling**: Graceful connection failure handling

## Backup and Recovery

### Automated Backups
- **Supabase**: Daily automated backups
- **Point-in-Time Recovery**: Available for 7 days
- **Geographic Redundancy**: Multi-region backups

### Manual Backups
```sql
-- Export waitlist data
COPY (SELECT * FROM public.waitlist) TO '/tmp/waitlist_backup.csv' WITH CSV HEADER;
```

## Monitoring and Logging

### Database Metrics
- **Connection Count**: Monitor active connections
- **Query Performance**: Track slow queries
- **Error Rates**: Monitor database errors
- **Storage Usage**: Track database growth

### Logging
- **Query Logs**: All database operations logged
- **Error Logs**: Detailed error information
- **Access Logs**: API endpoint access tracking

## Migration Management

### Supabase Migrations
- **Location**: `/supabase/migrations/`
- **Format**: SQL files with timestamps
- **Version Control**: Git-tracked migration files

### Migration Example
```sql
-- 20250819_waitlist.sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS public.waitlist (
  -- table definition
);
```

## Environment Configuration

### Required Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Optional Variables
```env
NEXT_PUBLIC_SUPABASE_BUCKET=public
NEXT_PUBLIC_SUPABASE_PREFIX=audio/flow
```

## Best Practices

### Security
- Always use parameterized queries
- Enable RLS on all tables
- Regular security audits
- Monitor for suspicious activity

### Performance
- Create appropriate indexes
- Use connection pooling
- Monitor query performance
- Regular database maintenance

### Data Integrity
- Use foreign key constraints
- Implement data validation
- Regular backup testing
- Data consistency checks


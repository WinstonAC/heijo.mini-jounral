# Authentication Documentation

## Overview
Heijō currently uses a simple email-based waitlist system without user authentication. This document outlines the current authentication approach and future authentication plans.

## Current Authentication Model

### No User Authentication
- **Current State**: No user accounts or authentication required
- **Data Collection**: Email addresses only via waitlist signup
- **Access Control**: Public access to all content and features

### Email Collection
- **Method**: Simple form submission to `/api/join`
- **Validation**: Server-side email format validation
- **Storage**: Supabase `waitlist` table
- **Purpose**: Newsletter and product updates

## Database Security

### Row Level Security (RLS)
```sql
-- Enable RLS on waitlist table
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Deny all operations by default
CREATE POLICY deny_all_waitlist ON public.waitlist
  FOR ALL USING (false) WITH CHECK (false);
```

### Service Role Access
- All database operations use Supabase service role key
- No anonymous database access allowed
- API endpoints handle all database interactions

## Future Authentication Plans

### Planned Features
1. **User Accounts**: Full user registration and login
2. **Social Login**: Google, Apple, GitHub integration
3. **Session Management**: Secure session handling
4. **Profile Management**: User preferences and settings
5. **Data Privacy**: User data export and deletion

### Technical Implementation
- **Authentication Provider**: Supabase Auth
- **Session Storage**: HTTP-only cookies
- **Password Security**: bcrypt hashing
- **Token Management**: JWT tokens with refresh

## Security Considerations

### Current Security Measures
- **Email Validation**: Regex pattern validation
- **SQL Injection Prevention**: Parameterized queries
- **CORS Protection**: Configurable origin restrictions
- **Environment Security**: Sensitive keys in environment variables

### Data Privacy
- **Minimal Data Collection**: Only email addresses
- **No Tracking**: No user behavior tracking
- **GDPR Compliance**: Ready for data export/deletion
- **Transparent Policies**: Clear privacy policy

## API Security

### CORS Configuration
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_SITE_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
```

### Input Validation
- **Email Format**: Regex validation for email addresses
- **Type Checking**: TypeScript for compile-time validation
- **Server Validation**: Runtime validation in API endpoints

## Environment Variables

### Required for Authentication
```env
# Supabase URL (either SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL)
SUPABASE_URL=your_supabase_project_url
# OR
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Future Authentication Variables
```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_JWT_SECRET=your_jwt_secret
```

## Migration Strategy

### Phase 1: Current State
- ✅ Email collection system
- ✅ Basic security measures
- ✅ Database protection

### Phase 2: User Accounts
- 🔄 User registration
- 🔄 Login/logout functionality
- 🔄 Profile management

### Phase 3: Advanced Features
- 🔄 Social authentication
- 🔄 Two-factor authentication
- 🔄 Advanced privacy controls

## Best Practices

### Security
- Never expose service role keys in client code
- Validate all inputs on both client and server
- Use HTTPS for all communications
- Implement proper error handling

### Privacy
- Collect only necessary data
- Provide clear data usage policies
- Enable user data export/deletion
- Regular security audits

### Development
- Use TypeScript for type safety
- Implement comprehensive error handling
- Write security-focused tests
- Regular dependency updates


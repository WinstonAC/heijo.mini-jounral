# API Documentation

## Overview
Heijō uses a combination of external APIs and internal endpoints to provide its core functionality. This document outlines all API integrations and internal endpoints.

## External API Integrations

### Supabase
**Purpose**: Database and authentication backend
**Base URL**: `NEXT_PUBLIC_SUPABASE_URL`
**Authentication**: Service role key for admin operations, anon key for client operations

#### Database Schema
```sql
-- Waitlist table for email collection
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

#### Row Level Security
- All operations require service role key
- No anonymous access allowed
- Policies deny all operations by default

### EmailJS
**Purpose**: Welcome email automation
**Service ID**: `EMAILJS_SERVICE_ID`
**Template ID**: `EMAILJS_TEMPLATE_ID`
**Public Key**: `EMAILJS_PUBLIC_KEY`

#### Email Templates
- Welcome email for new waitlist signups
- Automated follow-up sequences
- Newsletter distribution

## Internal API Endpoints

### POST /api/join
**Purpose**: Add email to waitlist
**Method**: POST
**Content-Type**: application/json

#### Request Body
```json
{
  "email": "user@example.com"
}
```

#### Response
```json
{
  "ok": true
}
```

#### Error Responses
```json
{
  "ok": false,
  "error": "invalid_email" | "missing_env_vars" | "duplicate_email"
}
```

#### CORS Headers
- `Access-Control-Allow-Origin`: Configurable via `NEXT_PUBLIC_SITE_ORIGIN`
- `Access-Control-Allow-Methods`: GET, POST, OPTIONS
- `Access-Control-Allow-Headers`: Content-Type, Authorization

### GET /api/healthcheck
**Purpose**: Health monitoring
**Method**: GET
**Response**: 200 OK with status information

### GET /api/flow-audio
**Purpose**: Audio file management
**Method**: GET
**Response**: Audio file URLs and metadata

### GET /rss.xml
**Purpose**: RSS feed for blog content
**Method**: GET
**Content-Type**: application/rss+xml
**Response**: RSS 2.0 formatted XML feed

## Environment Variables

### Required
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
EMAILJS_PUBLIC_KEY=your_emailjs_public_key
EMAILJS_SERVICE_ID=your_emailjs_service_id
EMAILJS_TEMPLATE_ID=your_emailjs_template_id
```

### Optional
```env
NEXT_PUBLIC_SITE_ORIGIN=https://heijo.io
NEXT_PUBLIC_SUPABASE_BUCKET=public
NEXT_PUBLIC_SUPABASE_PREFIX=audio/flow
```

## Error Handling

### Client-Side
- Graceful degradation when environment variables are missing
- User-friendly error messages for form validation
- Retry logic for network failures

### Server-Side
- Comprehensive error logging
- Proper HTTP status codes
- CORS error handling
- Input validation and sanitization

## Rate Limiting
- No explicit rate limiting implemented
- Relies on Vercel's built-in protection
- Supabase connection pooling for database operations

## Security Considerations
- All database operations use service role key
- Email validation with regex patterns
- CORS configuration for cross-origin requests
- No sensitive data in client-side code
- Environment variables properly secured


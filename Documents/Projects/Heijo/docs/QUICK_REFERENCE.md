# Heijō Quick Reference Guide

A quick reference for common tasks, commands, and information.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint
```

## 📁 Project Structure

```
heijo-landing/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   └── lib/              # Utility libraries
├── public/               # Static assets
├── supabase/             # Database migrations
└── docs/                 # Documentation
```

## 🔑 Environment Variables

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

## 🌐 API Endpoints

### POST /api/join
Add email to waitlist
```typescript
POST /api/join
Content-Type: application/json

{
  "email": "user@example.com"
}
```

### GET /api/healthcheck
Health monitoring endpoint

### GET /api/flow-audio
Audio file management

### GET /rss.xml
RSS feed for blog content

## 🗄️ Database

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

### Supabase Client
```typescript
// Admin client (server-side only)
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const { data, error } = await supabaseAdmin()
  .from('waitlist')
  .insert({ email });
```

## 🎨 Design Tokens

### Colors
- Primary: `#4A90E2`
- Text: `#1A1A1A`
- Background: `#FFFFFF`
- Success: `#52C41A`
- Error: `#F5222D`

### Spacing
- Small: `0.5rem` (8px)
- Medium: `1rem` (16px)
- Large: `1.5rem` (24px)
- XL: `2rem` (32px)

## 🔒 Security Headers

```typescript
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
];
```

## 📝 Common Tasks

### Add a New Blog Post
1. Create markdown file in blog directory
2. Add metadata to `blogMetadata.ts`
3. Update RSS feed if needed

### Add a New API Endpoint
1. Create file in `src/app/api/[route]/route.ts`
2. Implement handler function
3. Add CORS headers
4. Update API documentation

### Add a New Component
1. Create component in `src/components/`
2. Use TypeScript interfaces
3. Follow design system guidelines
4. Add to component documentation

## 🐛 Debugging

### Check Environment Variables
```bash
# Verify .env.local exists
cat .env.local

# Check specific variable
echo $NEXT_PUBLIC_SUPABASE_URL
```

### Database Connection
```typescript
// Test Supabase connection
import { supabaseAdmin } from '@/lib/supabaseAdmin';

const { data, error } = await supabaseAdmin()
  .from('waitlist')
  .select('count');
```

### API Testing
```bash
# Test healthcheck
curl http://localhost:3000/api/healthcheck

# Test join endpoint
curl -X POST http://localhost:3000/api/join \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

## 📚 Documentation Links

- [Documentation Index](README.md)
- [API Documentation](technical/API.md)
- [Frontend Guide](technical/FRONTEND.md)
- [Database Guide](technical/DATABASE.md)
- [Design System](product/DESIGN.md)

## 🔗 External Services

- **Supabase**: Database and backend
- **EmailJS**: Email automation
- **Vercel**: Hosting and deployment
- **GitHub**: Version control

## 📦 Key Dependencies

- Next.js 15
- TypeScript
- Tailwind CSS
- Supabase Client
- EmailJS

## 🚢 Deployment

### Vercel
1. Connect GitHub repository
2. Configure environment variables
3. Deploy automatically on push

### Manual Build
```bash
npm run build
npm start
```

## 📞 Support

- Check [Documentation Index](README.md) for detailed guides
- Review [Implementation Summary](../IMPLEMENTATION_SUMMARY.md) for architecture
- See [Security Checklist](../SECURITY_CHECKLIST.md) for security info

---

*Quick reference - For detailed information, see the full documentation.*


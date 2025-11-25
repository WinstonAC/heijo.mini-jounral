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
# Supabase (URL can be SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL)
SUPABASE_URL=your_supabase_project_url
# OR
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Email (EmailJS)
EMAILJS_PUBLIC_KEY=your_emailjs_public_key
EMAILJS_SERVICE_ID=your_emailjs_service_id
EMAILJS_TEMPLATE_ID=your_emailjs_template_id
```

### Optional
```env
# Site config
NEXT_PUBLIC_SITE_ORIGIN=https://heijo.io
NEXT_PUBLIC_SITE_NAME=Heijō

# Supabase storage
NEXT_PUBLIC_SUPABASE_BUCKET=public
NEXT_PUBLIC_SUPABASE_PREFIX=audio/flow

# Analytics + social
NEXT_PUBLIC_GA_ID=your_google_analytics_id
NEXT_PUBLIC_GTM_ID=your_google_tag_manager_id
NEXT_PUBLIC_TWITTER_HANDLE=@heijo
NEXT_PUBLIC_GITHUB_URL=https://github.com/heijo

# Runtime
NODE_ENV=development
NEXT_PUBLIC_VERCEL_ENV=development
```

## 🌐 API Endpoints

### Waitlist
- `POST /api/join` — add email to the waitlist (stores UA + source metadata)

### Auth & Beta Access
- `POST /api/auth/check-beta` — verify an email is allowlisted before signup
- `POST /api/auth/signup` — create an account (enforces beta allowlist + password rules)
- `POST /api/auth/signin` — email/password login gated by beta allowlist
- `GET /api/auth/session` — lightweight session probe used by the app shell
- `POST /api/auth/signout` — clear Supabase session cookies

> See `docs/technical/BETA_ACCESS.md` for full beta flow details.

### Platform
- `GET /api/healthcheck` — uptime probes / status dashboards
- `GET /api/flow-audio` — serve audio assets referenced by the landing pages
- `GET /rss.xml` — public RSS feed for Field Notes blog

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
echo $SUPABASE_URL
# OR
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
- [Beta Access Control](technical/BETA_ACCESS.md)

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


# Heijō Mini-Journal v1.0.0

A **privacy-first journaling application** that combines the nostalgic charm of 1985 PalmPilot aesthetics with modern voice recognition technology. Built with Next.js 14, TypeScript, and enterprise-grade security.

> **v1.0.0 Stable Release** - Production-ready with bulletproof authentication, data persistence, and preserved UI/UX experience.

## Overview

Heijō Mini-Journal is designed with **privacy-first principles**, offering a complete offline journaling experience with voice recognition, daily prompts, and secure data storage. The app features an authentic PalmPilot 1985 design aesthetic while providing modern functionality and security.

## Key Features

### Privacy & Security
- **AES-GCM Encryption**: All data encrypted with device-specific keys
- **Local-First Storage**: Complete offline functionality with optional Supabase sync
- **GDPR Compliance**: Full data export and deletion capabilities
- **Zero-Network Mode**: Voice recognition and data storage work without internet
- **Rate Limiting**: 100 requests/hour per device with anti-automation protection

### Premium Features (Optional)
- **Free Tier**: Complete local storage, all features included
- **Premium Tier**: $5/year for cloud sync across all devices
- **Testing**: Premium currently free for testing (manual activation)
- See [Premium Features Documentation](docs/PREMIUM_FEATURES.md) for details

### Voice & Text Input
- **Streaming Voice Recognition**: Real-time transcription with <300ms latency
- **Web Speech API**: Browser-native voice recognition for privacy
- **Visual Feedback**: Animated recording button with pulse effects
- **Offline Support**: Voice recognition works without internet connection

### Journaling Features
- **Daily Prompts**: 90-day rotating prompt system with Y/N chip interface
- **Tag System**: Organize entries with customizable tags
- **Search & Filter**: Find entries by content, tags, or date
- **Export Functionality**: Download entries as JSON or CSV
- **PWA Support**: Installable as a standalone app

### Design System
- **PalmPilot 1985 Aesthetic**: Authentic retro design with modern usability
- **Dieter Rams / Brutalist Principles**: Clean, functional, and unobtrusive design with subtle elevation
- **8px Spacing System**: Consistent spacing with all elements aligned to a single vertical axis
- **Mobile-First**: Responsive design optimized for 320-430px widths with proper safe-area handling
- **Accessibility**: WCAG 2.1 AA compliance with keyboard navigation and 44px+ tap targets

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Modern web browser with Web Speech API support

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/WinstonAC/heijo.mini-jounral.git
   cd heijo.mini-jounral
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables** (optional for local-only mode)
   ```bash
   cp env.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

**📖 For detailed development setup, see [Development Environment Guide](docs/DEV_SETUP.md)**

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm run start

# Run linting
npm run lint
```

## ⚙️ Configuration

### Environment Variables

Create a `.env.local` file for Supabase integration (or copy from `.env.example`):

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://lzeuvaankbnngfjxpycn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Site Configuration
NEXT_PUBLIC_SITE_URL=https://journal.heijo.io

# Server-side keys (for seeding)
SUPABASE_URL=https://lzeuvaankbnngfjxpycn.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Note**: The app works completely offline without these variables. Supabase is used for cloud sync (Premium tier) and authentication.

### Premium Features (Testing)

For testing premium features:
1. Sign in to the app
2. Go to **Settings** → **Consent Settings**
3. Toggle **"Premium Cloud Sync"** ON
4. Click **"Activate Premium"** (free for testing)
5. Premium status is saved to `user_metadata.premium`

See [Premium Features Documentation](docs/PREMIUM_FEATURES.md) for complete details.

#### Environment Validation
- If `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are omitted, the app runs in local‑only mode (no cloud sync/auth).
- When provided, the app will attempt background sync to Supabase and persist sessions; failures surface non‑blocking toasts.
- `SUPABASE_SERVICE_ROLE_KEY` is only used for local seeding/scripts and must never be exposed in client bundles.

### Supabase Setup (Optional)

If using Supabase, create the following tables:

```sql
-- Journal entries table
CREATE TABLE journal_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  content TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('text', 'voice')),
  tags TEXT[] DEFAULT '{}'::text[],
  sync_status TEXT DEFAULT 'synced' CHECK (sync_status IN ('synced', 'syncing', 'failed')),
  last_synced TIMESTAMP WITH TIME ZONE,
  encrypted_data TEXT,
  created_at_local TIMESTAMP WITH TIME ZONE
);

-- Prompts table
CREATE TABLE prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL,
  category TEXT NOT NULL,
  day_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  is_active BOOLEAN DEFAULT true
);

-- Enable Row Level Security
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can access own entries" ON journal_entries
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Prompts are public" ON prompts
  FOR SELECT USING (is_active = true);
```

## Architecture

### Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS with custom PalmPilot 1985 design system
- **Database**: Supabase (PostgreSQL) with local storage fallback
- **Authentication**: Supabase Auth with magic link support
- **Voice Recognition**: Web Speech API (browser-native)
- **Encryption**: Web Crypto API (AES-GCM)
- **Animations**: Subtle CSS-based transitions

### Project Structure
```
heijo-mini-journal/
├── app/                    # Next.js App Router pages
│   ├── journal/           # Main journal interface
│   ├── login/             # Authentication page
│   └── privacy/           # Privacy settings
├── components/            # React components
│   ├── Composer.tsx       # Entry creation interface
│   ├── MicButton.tsx      # Voice recording button
│   ├── EntryList.tsx      # Entry display and management
│   └── AnalyticsDashboard.tsx # Analytics tracking (v1.0.0)
├── lib/                   # Utility libraries
│   ├── auth.tsx           # Authentication management
│   ├── encryption.ts      # AES-GCM encryption
│   ├── voiceToText.ts     # Voice recognition
│   ├── store.ts           # Data storage management
│   └── analytics.ts       # Analytics tracking (v1.0.0)
├── docs/                  # Comprehensive documentation
│   ├── technical/         # Technical documentation
│   └── product/           # Product documentation
└── public/                # Static assets
```

## Documentation

### Main Documentation
- **[README.md](README.md)** - Complete project overview and setup
- **[Implementation Summary](IMPLEMENTATION_SUMMARY.md)** - Security and performance implementation details
- **[Tester Onboarding](docs/TESTER_ONBOARDING.md)** - How to join and what to expect
- **[Testing Readiness](docs/TESTING_READINESS.md)** - Complete testing guide and QA matrix
- **[Test Accounts](docs/TEST_ACCOUNTS.md)** - Shared test credentials and management
- **[Extension Packaging](docs/technical/EXTENSION_PACKAGING.md)** - Build and load instructions for Chrome and O365 (add‑in)

### Technical Documentation
- **[Database Architecture](docs/technical/DATABASE.md)** - Database schema and data management patterns
- **[Authentication](docs/technical/AUTHENTICATION.md)** - Auth flow and user management
- **[Security](docs/technical/SECURITY.md)** - Security features and privacy implementation
- **[Frontend Architecture](docs/technical/FRONTEND.md)** - React components and UI architecture
- **[API & Integrations](docs/technical/API.md)** - External service integrations
 - **[Architecture Overview](docs/technical/ARCHITECTURE.md)** - System context and diagram notes
 - **[Deployment & CI/CD](docs/technical/DEPLOYMENT.md)** - Deployment paths and CI notes

### Product Documentation
- **[Features](docs/product/FEATURES.md)** - Comprehensive feature overview
- **[Design System](docs/product/DESIGN.md)** - PalmPilot 1985 design system and guidelines

## Security Features

### Data Protection
- **AES-GCM Encryption**: 256-bit encryption with device-specific keys
- **Local-First Storage**: All data stored locally by default
- **Zero-Network Mode**: Complete offline functionality
- **Data Minimization**: Auto-delete after 1 year, 50MB storage limit

### Security Measures
- **Content Security Policy**: Strict CSP with no unsafe-inline/eval
- **Security Headers**: X-Frame-Options, X-Content-Type-Options, etc.
- **Rate Limiting**: 100 requests/hour per device with exponential backoff
- **Input Validation**: XSS and injection prevention
- **GDPR Compliance**: Full data export and deletion capabilities

### Privacy Protection
- **Opt-In Analytics**: Local-only analytics dashboard (user can opt-in/opt-out)
- **No External Tracking**: No third-party analytics or user tracking
- **Minimal Data Collection**: Only essential data collected
- **Transparent Privacy**: Clear privacy policy and data usage
- **User Control**: Complete control over personal data

## Design System

### PalmPilot 1985 Aesthetic
- **Color Palette**: Authentic 1985 PalmPilot colors
- **Typography**: Orbitron font for UI, Inter for content
- **Layout**: 8-point grid system with consistent spacing
- **Animations**: Subtle, purposeful animations (no intro animation)

### Design Principles
- **Dieter Rams Inspired**: Clean, functional, unobtrusive
- **Mobile-First**: Responsive design starting from mobile
- **Accessibility**: WCAG 2.1 AA compliance
- **Consistency**: Unified design language throughout

## Performance

### Performance Metrics
- **Cold Start**: <1.5 seconds app initialization
- **Voice Recognition**: <300ms first partial result, <800ms final
- **Bundle Size**: <500KB total bundle size
- **CPU Usage**: <5% idle, <35% during recording
- **Memory**: Efficient with rolling buffers

### Optimization Features
- **Code Splitting**: Lazy loading of components
- **Image Optimization**: Next.js Image component
- **Caching Strategy**: Intelligent data caching
- **Bundle Optimization**: Tree shaking and minification

## v1.0.0 Release Notes

### New Features
- **Analytics Dashboard**: Usage tracking and insights (opt-in, local-only)
- **Notification Settings**: Comprehensive reminder and notification configuration
- **Enhanced Session Persistence**: Bulletproof authentication with localStorage backup
- **CORS Configuration**: Production-ready security headers
 
- **Improved Data Sync**: Enhanced user_id linking and sync status tracking

### Stability Improvements
- **Session Persistence**: Sessions survive page refreshes and redirects
- **Data Integrity**: All journal entries properly linked to authenticated users
- **CORS Resolution**: No more cross-origin authentication issues
- **Magic Link Flow**: Reliable authentication with proper redirect handling
- **Offline Support**: Complete functionality without internet connection

### Production Ready
- **Environment Configuration**: Proper production environment variables
- **Security Headers**: Comprehensive security configuration
- **Error Handling**: Robust error handling and fallback mechanisms
- **Performance**: Optimized for production deployment

## Browser Support

### Supported Browsers
- **Chrome**: 88+ (full support)
- **Firefox**: 85+ (full support)
- **Safari**: 14+ (full support)
- **Edge**: 88+ (full support)

### Required Features
- **Web Speech API**: For voice recognition
- **Web Crypto API**: For encryption
- **IndexedDB**: For local storage
- **Service Workers**: For PWA functionality

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Troubleshooting

- **CORS Authentication Errors**
  - **Error**: "Access to fetch at '...supabase.co/auth/v1/token' has been blocked by CORS policy"
  - **Cause**: Supabase Site URL doesn't match your production domain
  - **Fix**: 
    1. Go to Supabase Dashboard → Authentication → URL Configuration
    2. Set Site URL to your production domain (e.g., `https://journal.heijo.io`)
    3. Add Redirect URLs: `https://journal.heijo.io/**` and `https://journal.heijo.io/*`
    4. Click "Save changes" and wait 1-2 minutes for propagation
    5. Clear browser cache and try again
  - The app now shows clear error messages with specific instructions if CORS issues occur

- Build error: Unsupported Server Component type on `/debug/mic`
  - Cause: Static prerender of a diagnostics page.
  - Fix: Already resolved by marking `/debug/mic` as dynamic. If you still see it, ensure you're on latest main and rebuild.

- Voice recognition not working
  - Ensure your browser supports Web Speech API (Chrome, Edge, Safari 14+).
  - Grant microphone permission; reload the page after granting.
  - If using HTTPS locally, use `http://localhost:3000` or a trusted certificate.

- Supabase sync not working
  - Fill `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.
  - Confirm RLS policies and `journal_entries` schema match `docs/technical/DATABASE.md`.
  - The app works offline without these; only cloud sync depends on them.

- Build errors (TypeScript/linting)
  - All TypeScript type errors have been resolved
  - Server-side rendering issues fixed (localStorage access properly guarded)
  - ESLint warnings resolved (useCallback for hooks, apostrophe escaping)
  - Run `npm run build` locally before pushing to verify

- Clear local data (reset app state)
  - Use the Privacy page export/delete controls (`/privacy`) or clear browser Site Data.

- iCloud duplicate files in repo
  - `Library/` is ignored. If tracked earlier, run the cleanup steps committed in main.

- Extension build issues (Chrome)
  - Ensure `manifest.json` matches your build output paths and CSP. See `docs/technical/EXTENSION_PACKAGING.md`.
  - Service workers require HTTPS or `localhost`; use Chrome’s extension dev mode.

- Outlook (O365) add‑in load issues
  - Validate `manifest.xml` against Office Add‑in validator.
  - If blocked by CSP, ensure resources are bundled or allowed by add‑in policies.

## QA Resources

- Testing Readiness Report: `docs/TESTING_READINESS.md`
- Testing & QA: `docs/TESTING_READINESS.md`
 - Extension Packaging Guide: `docs/technical/EXTENSION_PACKAGING.md`

### End-to-end Tests (Playwright)
1. Install Playwright (first time):
   ```bash
   npm i -D @playwright/test
   npx playwright install --with-deps
   ```
2. Set environment variables:
   ```bash
   export BASE_URL=https://journal.heijo.io
   export TEST_EMAIL=testrunner+01@heijo.io
   export TEST_PASSWORD=Heijo-Test-2025!
   ```
3. Run tests:
   ```bash
   npx playwright test
   ```
4. Open HTML report:
   ```bash
   npx playwright show-report
   ```

## Versioning & Changelog

- Semantic versioning is used for releases.
- See `CHANGELOG.md` for notable changes.

## Acknowledgments

- **PalmPilot 1985**: Design inspiration from the original PalmPilot
- **Dieter Rams**: Design principles and philosophy
- **Supabase**: Authentication and database services
- **Next.js Team**: Amazing React framework
- **Tailwind CSS**: Utility-first CSS framework

## Support

- **Documentation**: [Full Documentation](docs/)
- **Issues (Report a bug)**: https://github.com/WinstonAC/heijo.mini-jounral/issues
- **Email**: [support@heijo.io](mailto:support@heijo.io)
- **Discussions**: https://github.com/WinstonAC/heijo.mini-jounral/discussions

---

**Heijō Mini-Journal v1.0.0** - *Privacy-first journaling with PalmPilot 1985 charm* 🚀

> **Production Ready**: Stable build with bulletproof authentication, data persistence, and preserved UI/UX experience.




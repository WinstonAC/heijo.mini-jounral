# Development Environment Setup

This guide will help you set up a local development environment for Heijō Mini-Journal.

## Prerequisites

- **Node.js**: 18+ (check with `node --version`)
- **npm**: 8+ (comes with Node.js, check with `npm --version`)
- **Git**: For cloning and version control
- **Modern Browser**: Chrome, Firefox, Safari, or Edge with Web Speech API support

## Quick Start

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/WinstonAC/heijo.mini-jounral.git
cd heijo.mini-jounral

# Install dependencies
npm install
```

### 2. Environment Configuration

Create a `.env.local` file in the root directory (copy from `env.example`):

```bash
cp env.example .env.local
```

Then edit `.env.local` with your Supabase credentials:

```env
# Supabase Configuration (Required for auth and cloud sync)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Site Configuration (Required for password reset and magic links)
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Server-side keys (Optional - only needed for seeding prompts)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**Note**: The app works in **local-only mode** without Supabase credentials, but you'll need them for:
- User authentication
- Password reset functionality
- Premium cloud sync features
- Testing full feature set

### 3. Start Development Server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

## Development Scripts

### Available Commands

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server (after build)
npm run start

# Run linting
npm run lint

# Run end-to-end tests
npm run test:e2e

# View test reports
npm run test:e2e:report

# Seed prompts to Supabase (requires service role key)
npm run seed:prompts
```

## Development Features

### Hot Reload
- Next.js automatically reloads on file changes
- React Fast Refresh preserves component state during development
- CSS changes apply instantly without page reload

### Local Storage
- All journal entries are stored in browser `localStorage`
- User-scoped keys: `heijo-journal-entries:${userId}`
- Guest entries: `heijo-journal-entries` (legacy)
- Session data: `heijo_session`

### Debugging

#### Browser DevTools
- **Application Tab**: View localStorage, sessionStorage, IndexedDB
- **Console**: View logs and errors
- **Network Tab**: Monitor Supabase API calls

#### Console Logs
The app includes diagnostic logging:
- `[Supabase]` prefix for Supabase-related logs
- `[Storage]` prefix for storage operations
- `[Auth]` prefix for authentication events

#### React DevTools
Install [React Developer Tools](https://react.dev/learn/react-developer-tools) browser extension for component inspection.

## Supabase Setup (Optional)

### For Full Feature Testing

1. **Create a Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note your project URL and anon key

2. **Configure Authentication**
   - Go to Authentication → URL Configuration
   - Add `http://localhost:3000` to Redirect URLs
   - Add `http://localhost:3000/*` for wildcard support
   - Set Site URL to `http://localhost:3000`

3. **Set Up Database**
   - Run SQL scripts from `sql/` directory:
     - `sql/setup-rls-policies.sql` - Enable RLS and create policies
     - `sql/create-prompts-table.sql` - Create prompts table (if needed)
   - Or use the simple setup guide: `docs/SIMPLE_RLS_SETUP.md`

4. **Seed Prompts (Optional)**
   ```bash
   # Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
   npm run seed:prompts
   ```

## Development Workflow

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Edit files in `app/`, `components/`, `lib/`
   - The dev server will hot-reload automatically

3. **Test your changes**
   ```bash
   # Run linting
   npm run lint
   
   # Run tests
   npm run test:e2e
   ```

4. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   git push origin feature/your-feature-name
   ```

### Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Next.js recommended rules
- **Formatting**: Follow existing code style
- **Components**: Use functional components with hooks

## Common Development Tasks

### Testing Authentication
1. Start dev server: `npm run dev`
2. Navigate to `/login`
3. Sign up with a test email
4. Check email for confirmation link
5. Sign in and test features

### Testing Password Reset
1. Click "Forgot password?" on login page
2. Enter your email
3. Check email for reset link
4. Click link → should redirect to `/reset-password`
5. Enter new password
6. Should redirect to `/login`

### Testing Local Storage
1. Open DevTools → Application → Local Storage
2. Create a journal entry
3. Verify entry appears in `heijo-journal-entries:${userId}`
4. Sign out and sign back in
5. Verify entry persists (rehydrates)

### Testing Guest Mode
1. Don't sign in (or sign out)
2. Create entries as guest
3. Verify entries stored in `heijo-journal-entries` (legacy key)
4. Sign in
5. Verify guest entries migrate to user-scoped key

### Testing Premium Features
1. Sign in
2. Go to Settings → Consent Settings
3. Toggle "Premium Cloud Sync" ON
4. Click "Activate Premium" (free for testing)
5. Create entries
6. Verify entries sync to Supabase

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 npm run dev
```

### Supabase Connection Issues
- Check `.env.local` has correct credentials
- Verify Supabase project is active
- Check CORS settings in Supabase dashboard
- Ensure `http://localhost:3000` is in Redirect URLs

### localStorage Quota Exceeded
- Clear browser localStorage
- Or use DevTools → Application → Clear storage

### Hot Reload Not Working
- Restart dev server: `Ctrl+C` then `npm run dev`
- Clear `.next` folder: `rm -rf .next`
- Check for syntax errors in console

### TypeScript Errors
```bash
# Check for type errors
npm run lint

# Or use TypeScript directly
npx tsc --noEmit
```

## Development Tips

1. **Use Browser DevTools**: Inspect localStorage, network requests, and React components
2. **Check Console**: Look for `[Supabase]`, `[Storage]`, `[Auth]` prefixed logs
3. **Test on Multiple Browsers**: Chrome, Safari, Firefox for compatibility
4. **Test Mobile View**: Use browser DevTools device emulation
5. **Clear Storage**: Use DevTools → Application → Clear storage when testing auth flows

## Next Steps

- Read [Architecture Documentation](docs/technical/ARCHITECTURE.md)
- Review [Testing Readiness](docs/TESTING_READINESS.md)
- Check [Security Best Practices](docs/technical/SECURITY.md)
- See [API Documentation](docs/technical/API.md)

## Getting Help

- **GitHub Issues**: [Create an issue](https://github.com/WinstonAC/heijo.mini-jounral/issues)
- **Documentation**: Check `docs/` directory
- **Code Comments**: Inline documentation in source files

---

**Happy Coding! 🚀**


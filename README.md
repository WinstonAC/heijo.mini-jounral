# Heijō Mini-Journal

A **privacy-first journaling application** that combines the nostalgic charm of 1985 PalmPilot aesthetics with modern voice recognition technology. Built with Next.js 14, TypeScript, and enterprise-grade security.

## 🎯 Overview

Heijō Mini-Journal is designed with **privacy-first principles**, offering a complete offline journaling experience with voice recognition, daily prompts, and secure data storage. The app features an authentic PalmPilot 1985 design aesthetic while providing modern functionality and security.

## ✨ Key Features

### 🔒 Privacy & Security
- **AES-GCM Encryption**: All data encrypted with device-specific keys
- **Local-First Storage**: Complete offline functionality with optional Supabase sync
- **GDPR Compliance**: Full data export and deletion capabilities
- **Zero-Network Mode**: Voice recognition and data storage work without internet
- **Rate Limiting**: 100 requests/hour per device with anti-automation protection

### 🎤 Voice & Text Input
- **Streaming Voice Recognition**: Real-time transcription with <300ms latency
- **Web Speech API**: Browser-native voice recognition for privacy
- **Visual Feedback**: Animated recording button with pulse effects
- **Offline Support**: Voice recognition works without internet connection

### 📝 Journaling Features
- **Daily Prompts**: 90-day rotating prompt system with Y/N chip interface
- **Tag System**: Organize entries with customizable tags
- **Search & Filter**: Find entries by content, tags, or date
- **Export Functionality**: Download entries as JSON or CSV
- **PWA Support**: Installable as a standalone app

### 🎨 Design System
- **PalmPilot 1985 Aesthetic**: Authentic retro design with modern usability
- **Dieter Rams Principles**: Clean, functional, and unobtrusive design
- **Mobile-First**: Responsive design starting from mobile devices
- **Accessibility**: WCAG 2.1 AA compliance with keyboard navigation

## 🚀 Quick Start

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

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

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

Create a `.env.local` file for optional Supabase integration:

```env
# Supabase Configuration (Optional)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Authentication Settings
NEXT_PUBLIC_AUTH_REDIRECT_URL=http://localhost:3000/journal
NEXT_PUBLIC_AUTH_MAGIC_LINK_ENABLED=true
```

**Note**: The app works completely offline without these variables. Supabase is only used for optional cloud sync.

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

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS with custom PalmPilot 1985 design system
- **Database**: Supabase (PostgreSQL) with local storage fallback
- **Authentication**: Supabase Auth with magic link support
- **Voice Recognition**: Web Speech API (browser-native)
- **Encryption**: Web Crypto API (AES-GCM)
- **Animations**: GSAP for smooth transitions

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
│   └── EntryList.tsx      # Entry display and management
├── lib/                   # Utility libraries
│   ├── auth.tsx           # Authentication management
│   ├── encryption.ts      # AES-GCM encryption
│   ├── voiceToText.ts     # Voice recognition
│   └── store.ts           # Data storage management
├── docs/                  # Comprehensive documentation
│   ├── technical/         # Technical documentation
│   └── product/           # Product documentation
└── public/                # Static assets
```

## 📚 Documentation

### Main Documentation
- **[README.md](README.md)** - Complete project overview and setup
- **[Implementation Summary](IMPLEMENTATION_SUMMARY.md)** - Security and performance implementation details

### Technical Documentation
- **[Database Architecture](docs/technical/DATABASE.md)** - Database schema and data management patterns
- **[Authentication](docs/technical/AUTHENTICATION.md)** - Auth flow and user management
- **[Security](docs/technical/SECURITY.md)** - Security features and privacy implementation
- **[Frontend Architecture](docs/technical/FRONTEND.md)** - React components and UI architecture
- **[API & Integrations](docs/technical/API.md)** - External service integrations

### Product Documentation
- **[Features](docs/product/FEATURES.md)** - Comprehensive feature overview
- **[Design System](docs/product/DESIGN.md)** - PalmPilot 1985 design system and guidelines

## 🔒 Security Features

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
- **No Tracking**: No analytics or user tracking
- **Minimal Data Collection**: Only essential data collected
- **Transparent Privacy**: Clear privacy policy and data usage
- **User Control**: Complete control over personal data

## 🎨 Design System

### PalmPilot 1985 Aesthetic
- **Color Palette**: Authentic 1985 PalmPilot colors
- **Typography**: Orbitron font for UI, Inter for content
- **Layout**: 8-point grid system with consistent spacing
- **Animations**: Subtle, purposeful animations

### Design Principles
- **Dieter Rams Inspired**: Clean, functional, unobtrusive
- **Mobile-First**: Responsive design starting from mobile
- **Accessibility**: WCAG 2.1 AA compliance
- **Consistency**: Unified design language throughout

## 🚀 Performance

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

## 🌐 Browser Support

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

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **PalmPilot 1985**: Design inspiration from the original PalmPilot
- **Dieter Rams**: Design principles and philosophy
- **Supabase**: Authentication and database services
- **Next.js Team**: Amazing React framework
- **Tailwind CSS**: Utility-first CSS framework

## 📞 Support

- **Documentation**: [Full Documentation](docs/)
- **Issues**: [GitHub Issues](https://github.com/WinstonAC/heijo.mini-jounral/issues)
- **Discussions**: [GitHub Discussions](https://github.com/WinstonAC/heijo.mini-jounral/discussions)

---

**Heijō Mini-Journal** - *Privacy-first journaling with PalmPilot 1985 charm* 🚀




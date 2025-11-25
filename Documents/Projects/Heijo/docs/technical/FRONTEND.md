# Frontend Documentation

## Overview
Heijō's frontend is built with Next.js 15, TypeScript, and Tailwind CSS. This document outlines the component architecture, styling system, and frontend patterns.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom components (no external UI library)
- **Icons**: SVG icons
- **Fonts**: System fonts with fallbacks

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── blog/              # Blog pages
│   ├── flow/              # Audio flow page
│   ├── learn/             # Learning resources
│   ├── products/          # Product showcase
│   ├── give-back/         # Community page
│   ├── privacy/           # Privacy policy
│   ├── terms/             # Terms of service
│   ├── globals.css        # Global styles
│   └── layout.tsx         # Root layout
├── components/            # Reusable components
│   ├── BlogCard.tsx       # Blog post cards
│   ├── EmailForm.tsx      # Email collection form
│   ├── EmailFormWrapper.tsx # Form wrapper with state
│   ├── FlowAudio.tsx      # Audio player component
│   ├── Footer.tsx         # Site footer
│   └── Navigation.tsx     # Site navigation
└── lib/                   # Utility libraries
    ├── blogMetadata.ts    # Blog post metadata
    ├── getFlowTracks.ts   # Audio track management
    ├── metadata.ts        # SEO metadata utilities
    ├── schema.ts          # TypeScript schemas
    ├── supabase.ts        # Supabase client
    └── supabaseAdmin.ts   # Admin Supabase client
```

## Component Architecture

### Page Components
All pages follow Next.js App Router conventions:
- **Server Components**: Default for static content
- **Client Components**: For interactive elements
- **Metadata**: SEO optimization with `generateMetadata`

### Reusable Components

#### BlogCard
```typescript
interface BlogCardProps {
  title: string;
  description: string;
  slug: string;
  publishedAt: string;
  coverImage?: string;
}
```
- Displays blog post previews
- Responsive design
- SEO-optimized links

#### EmailForm
```typescript
interface EmailFormProps {
  onSubmit: (email: string) => Promise<void>;
  isLoading?: boolean;
  success?: boolean;
}
```
- Email collection form
- Validation and error handling
- Loading and success states

#### FlowAudio
```typescript
interface FlowAudioProps {
  tracks: AudioTrack[];
  onTrackChange?: (track: AudioTrack) => void;
}
```
- Audio player component
- Track management
- Playback controls

## Styling System

### Tailwind CSS Configuration
```typescript
// tailwind.config.ts
export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Custom theme extensions
    },
  },
  plugins: [],
}
```

### Design System
- **Colors**: Calming, minimalist palette
- **Typography**: System fonts with proper fallbacks
- **Spacing**: Consistent spacing scale
- **Responsive**: Mobile-first approach

### CSS Architecture
- **Global Styles**: `globals.css` for base styles
- **Component Styles**: Tailwind classes
- **No CSS Modules**: Pure Tailwind approach
- **Custom Properties**: CSS variables for theming

## State Management

### Local State
- **React Hooks**: useState, useEffect for local state
- **Form State**: Controlled components for forms
- **Loading States**: Loading indicators for async operations

### Global State
- **No State Management Library**: Simple prop drilling
- **Context API**: For theme and user preferences (future)
- **URL State**: Next.js router for navigation state

## Data Fetching

### Server-Side Rendering
```typescript
// Static generation for blog posts
export async function generateStaticParams() {
  return blogPosts.map((post) => ({
    slug: post.slug,
  }));
}
```

### Client-Side Data
```typescript
// API calls for dynamic content
const response = await fetch('/api/join', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email }),
});
```

## SEO Optimization

### Metadata System
```typescript
// Comprehensive metadata for all pages
export function generatePageMetadata({
  title,
  description,
  url,
  type = 'website',
  coverImage,
  // ... other metadata
}: PageMetadata): Metadata
```

### Features
- **Open Graph**: Social media optimization
- **Twitter Cards**: Twitter-specific metadata
- **JSON-LD**: Structured data for search engines
- **RSS Feed**: Blog content syndication

## Performance Optimization

### Next.js Features
- **Image Optimization**: Automatic image optimization
- **Font Optimization**: System font loading
- **Code Splitting**: Automatic code splitting
- **Static Generation**: Pre-rendered pages

### Bundle Optimization
- **Tree Shaking**: Unused code elimination
- **Dynamic Imports**: Lazy loading for heavy components
- **Bundle Analysis**: Regular bundle size monitoring

## Accessibility

### Standards Compliance
- **WCAG 2.1**: Level AA compliance
- **Semantic HTML**: Proper HTML structure
- **ARIA Labels**: Screen reader support
- **Keyboard Navigation**: Full keyboard accessibility

### Testing
- **Automated Testing**: Jest and React Testing Library
- **Manual Testing**: Screen reader testing
- **Accessibility Audits**: Regular accessibility reviews

## Browser Support

### Supported Browsers
- **Chrome**: 90+
- **Firefox**: 88+
- **Safari**: 14+
- **Edge**: 90+

### Progressive Enhancement
- **Core Functionality**: Works without JavaScript
- **Enhanced Features**: JavaScript-dependent features
- **Graceful Degradation**: Fallbacks for unsupported features

## Development Workflow

### Local Development
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

### Code Quality
- **TypeScript**: Strict type checking
- **ESLint**: Code quality rules
- **Prettier**: Code formatting
- **Husky**: Git hooks for quality checks

## Deployment

### Vercel Integration
- **Automatic Deployments**: Git-based deployments
- **Preview Deployments**: Branch-based previews
- **Environment Variables**: Secure configuration
- **Performance Monitoring**: Built-in analytics

### Build Process
- **Static Generation**: Pre-rendered pages
- **API Routes**: Serverless functions
- **Asset Optimization**: Automatic optimization
- **CDN Distribution**: Global content delivery

## Future Enhancements

### Planned Features
- **Dark Mode**: Theme switching
- **PWA Support**: Progressive Web App features
- **Offline Support**: Service worker implementation
- **Advanced Analytics**: User behavior tracking

### Technical Improvements
- **Component Library**: Reusable component system
- **Storybook**: Component documentation
- **Testing Suite**: Comprehensive test coverage
- **Performance Monitoring**: Real-time performance tracking


# Heijō - Micro-Moments. Macro-Clarity.

**Live Site:** [https://heijo.io](https://heijo.io)

## Description
A calming focus tool built as a browser-based widget. Captures user emails through a smooth `/api/join` flow using Supabase and EmailJS.

![Heijo Hero Section](public/landing-hero.png)
![Heijo Feature Highlights](public/landing-features.png)

Heijō is a minimalist meditation and focus tool designed to help modern workers reclaim presence in their digital environments. By combining ancient wisdom with modern technology, we help you cultivate focus, clarity, and presence in your daily work. Our mission is to transform how you interact with technology, making mindfulness an effortless part of your digital experience.

## Tech Stack
- Next.js 15
- TypeScript
- Tailwind CSS
- Supabase (email storage)
- EmailJS (welcome emails)
- Vercel (deployment)

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- EmailJS account

### Installation
1. Clone the repository
2. Copy `env.example` to `.env.local`
3. Fill in your environment variables
4. Install dependencies: `npm install`
5. Run development server: `npm run dev`

### Environment Variables
Copy `env.example` to `.env.local` and configure:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
EMAILJS_PUBLIC_KEY=your_emailjs_public_key
EMAILJS_SERVICE_ID=your_emailjs_service_id
EMAILJS_TEMPLATE_ID=your_emailjs_template_id
```

## 📚 Documentation

### Getting Started
- **[Quick Reference](docs/QUICK_REFERENCE.md)** - Quick reference guide for common tasks and commands
- **[Implementation Summary](docs/IMPLEMENTATION_SUMMARY.md)** - Comprehensive technical implementation details
- **[Security Checklist](docs/SECURITY_CHECKLIST.md)** - Security audit checklist and best practices

### Technical Documentation

#### Core Technical Docs
- **[API Documentation](docs/technical/API.md)** - External service integrations and API endpoints
- **[Authentication](docs/technical/AUTHENTICATION.md)** - Auth flow and user management
- **[Beta Access Control](docs/technical/BETA_ACCESS.md)** - Invite-only beta system for Mini-Journal
- **[Database](docs/technical/DATABASE.md)** - Database schema, data management, and operations
- **[Frontend](docs/technical/FRONTEND.md)** - React components, UI architecture, and styling system
- **[SEO](docs/technical/SEO.md)** - SEO optimization and social media integration
- **[Security](docs/technical/SECURITY.md)** - Security measures, privacy protections, and best practices

### Product Documentation

#### Design & Features
- **[Design System](docs/product/DESIGN.md)** - PalmPilot 1985 design system, visual guidelines, and UX principles
- **[Features](docs/product/FEATURES.md)** - Comprehensive feature overview, roadmap, and success metrics

### 🚀 Quick Links by Role

**For Developers**
- [Quick Start Guide](#quick-start)
- [API Reference](docs/technical/API.md)
- [Frontend Architecture](docs/technical/FRONTEND.md)
- [Database Schema](docs/technical/DATABASE.md)

**For Designers**
- [Design System](docs/product/DESIGN.md)
- [Component Guidelines](docs/product/DESIGN.md#component-design)
- [Color Palette](docs/product/DESIGN.md#color-palette)

**For Product Managers**
- [Feature Overview](docs/product/FEATURES.md)
- [Product Roadmap](docs/product/FEATURES.md#future-roadmap)
- [Success Metrics](docs/product/FEATURES.md#success-metrics)

**For Security**
- [Security Documentation](docs/technical/SECURITY.md)
- [Security Checklist](docs/SECURITY_CHECKLIST.md)
- [Authentication Security](docs/technical/AUTHENTICATION.md#security-considerations)

### 🔍 Finding Information

**By Topic:**
- **API & Integrations**: [API Documentation](docs/technical/API.md) | [Database](docs/technical/DATABASE.md) | [Authentication](docs/technical/AUTHENTICATION.md)
- **Frontend Development**: [Frontend Architecture](docs/technical/FRONTEND.md) | [Design System](docs/product/DESIGN.md)
- **SEO & Social Media**: [SEO Optimization](docs/technical/SEO.md) | [Frontend Architecture](docs/technical/FRONTEND.md#seo-optimization)
- **Security & Privacy**: [Security Implementation](docs/technical/SECURITY.md) | [Security Checklist](docs/SECURITY_CHECKLIST.md)
- **Design & UX**: [Design System](docs/product/DESIGN.md) | [Features](docs/product/FEATURES.md)

### Documentation Structure

```
docs/
├── QUICK_REFERENCE.md          # Quick reference guide
├── IMPLEMENTATION_SUMMARY.md   # Technical implementation overview
├── SECURITY_CHECKLIST.md       # Security audit checklist
├── technical/                  # Technical documentation
│   ├── API.md                  # API endpoints and integrations
│   ├── AUTHENTICATION.md       # Authentication and user management
│   ├── DATABASE.md             # Database schema and operations
│   ├── FRONTEND.md             # Frontend architecture and components
│   ├── SEO.md                  # SEO optimization and social media
│   └── SECURITY.md             # Security implementation
└── product/                    # Product documentation
    ├── DESIGN.md               # Design system and guidelines
    └── FEATURES.md             # Feature documentation and roadmap
```

## Project Structure

```
Heijo/                         # Project root
├── heijo-landing/             # Main Next.js application
│   ├── src/
│   │   ├── app/              # Next.js App Router pages
│   │   ├── components/       # Reusable React components
│   │   └── lib/              # Utility libraries
│   ├── public/               # Static assets
│   ├── scripts/              # Utility scripts
│   └── supabase/             # Database migrations
├── docs/                      # Documentation
│   ├── technical/            # Technical documentation
│   └── product/              # Product documentation
├── README.md                  # This file
├── env.example                # Environment variables template
└── vercel.json                # Vercel deployment configuration
```

## Features

### Current Features
- **Landing Page**: Compelling value proposition and email collection
- **Blog System**: SEO-optimized blog with RSS feed
- **Audio Flow**: Frequency-based calming audio tracks
- **Learning Resources**: Science-backed wellness content
- **Product Showcase**: Browser extension and voice journal features
- **Community**: Give back program and social features

### Technical Features
- **Performance**: Static generation, image optimization, code splitting
- **SEO**: Complete metadata system, Open Graph, Twitter Cards
- **Accessibility**: WCAG 2.1 Level AA compliance
- **Security**: HTTPS, input validation, CORS protection
- **Mobile**: Mobile-first responsive design

## Development

### Scripts
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Code Quality
- TypeScript for type safety
- ESLint for code quality
- Prettier for code formatting
- Husky for git hooks

## Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Configure environment variables
3. Deploy automatically on push to main

### Manual Deployment
1. Build the project: `npm run build`
2. Deploy the `.next` folder to your hosting provider
3. Configure environment variables

## Contributing
We welcome contributions from both the wellness and developer communities. Whether you're passionate about mindfulness, user experience, or technical implementation, your insights can help shape Heijō's future. Feel free to:
- Submit feature requests
- Report bugs
- Suggest improvements
- Share your experience with mindfulness in digital spaces

## Security
- See [SECURITY.md](docs/technical/SECURITY.md) for security implementation details
- See [SECURITY_CHECKLIST.md](SECURITY_CHECKLIST.md) for security audit checklist
- Report security issues privately to security@heijo.io

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
*Heijō: Where mindfulness meets modern productivity.* 
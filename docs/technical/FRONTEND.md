# Frontend Architecture

## Overview

Heijō Mini-Journal features a **modern React architecture** built with Next.js 14, TypeScript, and Tailwind CSS. The frontend implements a **PalmPilot 1985-inspired design system** with **mobile-first responsive design** and **privacy-first user experience**.

## Technology Stack

### Core Technologies

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe JavaScript development
- **Tailwind CSS**: Utility-first CSS framework
- **React 18**: Modern React with hooks and concurrent features
- **GSAP**: Animation library for smooth transitions

### Design System

- **PalmPilot 1985 Aesthetic**: Retro-inspired UI design
- **Mobile-First**: Responsive design starting from mobile
- **Dieter Rams Principles**: Clean, functional design
- **Accessibility**: WCAG 2.1 AA compliance

## Component Architecture

### Component Hierarchy

```
App Layout
├── Header
│   ├── HeaderClock
│   └── Settings (Desktop)
│       ├── NotificationSettings
│       ├── LanguageSelector
│       └── AnalyticsDashboard
├── Main Content
│   ├── Journal Page
│   │   ├── Composer
│   │   │   ├── MicButton
│   │   │   └── PromptChip
│   │   ├── EntryList
│   │   │   └── EntryDetail
│   │   ├── RecentEntriesDrawer
│   │   └── Mobile Navigation (Mobile)
│   │       ├── Save Button
│   │       ├── History Button
│   │       ├── Settings Button
│   │       └── Sign Out Button
│   ├── Login Page
│   │   └── LoginCard
│   └── Privacy Page
│       └── PrivacySettings
└── Modals
    ├── OnboardingModal
    └── TagPicker
```

### Core Components

#### 1. Composer Component

The main journal entry creation interface with mobile-first responsive design:

```typescript
// components/Composer.tsx
export default function Composer({ 
  onSave, 
  selectedPrompt, 
  onPromptSelect 
}: ComposerProps) {
  const [content, setContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const { startRecording, stopRecording, isSupported } = useVoiceToText();
  const isMobile = useIsMobile();

  const handleVoiceRecording = async () => {
    if (isRecording) {
      const result = await stopRecording();
      setContent(prev => prev + result.transcript);
    } else {
      await startRecording();
    }
    setIsRecording(!isRecording);
  };

  return (
    <div className="composer-container">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Type or speak your thoughts..."
        className="journal-input rounded-[14px]"
        style={{
          background: 'var(--panel-gradient)',
          border: '1px solid var(--panel-border)',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.28), 0 6px 20px rgba(0,0,0,0.2)'
        }}
      />
      {/* Mobile Toolbar - sticky below textarea */}
      {isMobile && (
        <div className="mobile-toolbar">
          <MicButton
            isRecording={isRecording}
            onToggle={handleVoiceRecording}
            disabled={!isSupported}
          />
          <button onClick={() => onSave({ content, source: 'text' })} className="ghost-chip">
            Save
          </button>
          <button onClick={openHistory} className="ghost-chip">
            History
          </button>
        </div>
      )}
      {/* Desktop controls - bottom-right */}
      {!isMobile && (
        <div className="desktop-controls">
          <MicButton
            isRecording={isRecording}
            onToggle={handleVoiceRecording}
            disabled={!isSupported}
          />
          <button className="ghost-chip">S</button>
          <button className="ghost-chip">H</button>
        </div>
      )}
    </div>
  );
}
```

**Design Notes**: 
- Textarea features subtle radial gradient background, 14px border radius, and breathing focus effect (scale 1.01 + shadow increase)
- Mobile: Sticky toolbar with mic + Save/History controls above vibe tags
- Desktop: Minimal ghost chips (S/H) in bottom-right with 80% opacity → 100% on hover

#### 2. LanguageSelector Component

Voice input language selection interface:

```typescript
// components/LanguageSelector.tsx
export default function LanguageSelector({ className }: LanguageSelectorProps) {
  const { language, setLanguage } = useVoiceSettings();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={className}>
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="language-select"
      >
        <option value="en-US">English (US)</option>
        <option value="en-GB">English (UK)</option>
        <option value="es-ES">Spanish</option>
        <option value="fr-FR">French</option>
        {/* More language options */}
      </select>
    </div>
  );
}
```

**Features**:
- Language selection for Web Speech API
- Persistent settings via VoiceSettingsProvider
- Accessible from Settings → Display → Voice Input Language
- Supports multiple language codes

#### 3. MicButton Component

Voice recording interface with recessed shell design and visual feedback:

```typescript
// components/MicButton.tsx
export default function MicButton({ 
  isRecording, 
  onToggle, 
  disabled 
}: MicButtonProps) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`
        mic-shell
        ${isRecording ? 'recording' : ''}
        ${disabled ? 'disabled' : ''}
      `}
      aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      aria-pressed={isRecording}
    >
      <svg className="mic-icon" viewBox="0 0 24 24">
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
      </svg>
      {isRecording && (
        <div className="recording-ring">
          <div className="absolute inset-[-6px] rounded-full border border-orange-400/60"></div>
        </div>
      )}
    </button>
  );
}
```

**Design Notes**: The mic button features a recessed shell with inner shadows for tactile depth. When recording, a thin orange ring (#fc7b3e) appears around the circle (no aggressive glow) for subtle visual feedback. The button respects the selected voice language from VoiceSettingsProvider.

#### 4. NotificationSettings Component

Comprehensive notification and reminder configuration interface:

```typescript
// components/NotificationSettings.tsx
export default function NotificationSettings({ onClose }: NotificationSettingsProps) {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<'default' | 'granted' | 'denied'>('default');
  const [isSupported, setIsSupported] = useState(false);

  const handleToggle = (key: keyof NotificationPreferences, value: boolean) => {
    // Update preferences
  };

  const handleSaveReminderSettings = async () => {
    // Request permission if enabling push
    // Save preferences to Supabase or localStorage
  };

  return (
    <div className="space-y-6">
      {/* Push Notifications */}
      {/* Email Notifications */}
      {/* Reminder Settings */}
      {/* Quiet Hours */}
      {/* Test Button */}
    </div>
  );
}
```

**Features**:
- Push notification permission handling
- Email notification toggle
- Reminder frequency selection (daily/weekly/off)
- Custom reminder time picker
- Smart skip functionality
- Quiet hours configuration
- Browser support detection
- Test notification button
- Unsaved changes tracking

#### 5. AnalyticsDashboard Component

Usage analytics dashboard with comprehensive metrics:

```typescript
// components/AnalyticsDashboard.tsx
export default function AnalyticsDashboard({ isVisible }: AnalyticsDashboardProps) {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);

  useEffect(() => {
    if (isVisible) {
      const data = analyticsCollector.getAnalyticsData();
      setAnalyticsData(data);
    }
  }, [isVisible]);

  return (
    <div className="analytics-dashboard">
      {/* Overview Stats */}
      {/* Entry Types */}
      {/* Performance Metrics */}
      {/* Writing Patterns */}
      {/* Feature Usage */}
      {/* Usage Timeline */}
    </div>
  );
}
```

**Features**:
- Conditional visibility based on analytics consent
- Overview metrics (sessions, entries)
- Entry type breakdown (voice vs text)
- Performance metrics (latency, start time, memory)
- Writing pattern analysis
- Feature usage tracking
- Usage timeline (first/last used)
- Privacy-first local storage

#### 6. EntryList Component

Display and management of journal entries:

```typescript
// components/EntryList.tsx
export default function EntryList({ 
  entries, 
  onEntryClick, 
  onEntryDelete 
}: EntryListProps) {
  const [filteredEntries, setFilteredEntries] = useState(entries);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const filtered = entries.filter(entry =>
      entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.tags.some(tag => 
        tag.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
    setFilteredEntries(filtered);
  }, [entries, searchQuery]);

  return (
    <div className="entry-list">
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search entries..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>
      <div className="entries-grid">
        {filteredEntries.map(entry => (
          <EntryCard
            key={entry.id}
            entry={entry}
            onClick={() => onEntryClick(entry)}
            onDelete={() => onEntryDelete(entry.id)}
          />
        ))}
      </div>
    </div>
  );
}
```

## State Management

### React Context Pattern

The app uses React Context for global state management:

```typescript
// lib/auth.tsx
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Auth state management logic
  return (
    <AuthContext.Provider value={{ user, session, loading, ...authMethods }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// lib/voiceSettings.tsx
const VoiceSettingsContext = createContext<VoiceSettingsContextType | undefined>(undefined);

export function VoiceSettingsProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<string>('en-US');

  useEffect(() => {
    // Load persisted language from localStorage
    const saved = localStorage.getItem('heijo-voice-language');
    if (saved) setLanguage(saved);
  }, []);

  const updateLanguage = (lang: string) => {
    setLanguage(lang);
    localStorage.setItem('heijo-voice-language', lang);
  };

  return (
    <VoiceSettingsContext.Provider value={{ language, setLanguage: updateLanguage }}>
      {children}
    </VoiceSettingsContext.Provider>
  );
}

export function useVoiceSettings() {
  const context = useContext(VoiceSettingsContext);
  if (context === undefined) {
    throw new Error('useVoiceSettings must be used within a VoiceSettingsProvider');
  }
  return context;
}
```

### Local State Management

Component-level state using React hooks:

```typescript
// components/Composer.tsx
export default function Composer() {
  const [content, setContent] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State management logic
  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    
    try {
      await onSave({ content, source: 'text' });
      setContent('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };
}
```

## Design System

### Color Palette

Inspired by 1985 PalmPilot aesthetics:

```css
:root {
  /* PalmPilot 1985 Color Palette */
  --ui-charcoal: #181819;
  --ui-graphite: #616162;
  --ui-silver: #9E9E9E;
  --ui-warm-silver: #C1C0BD;
  --ui-screen: #E8E9EB;
  --ui-press: #3AA6FF;
  
  /* Modern Design System */
  --background: #F8F8F8;
  --foreground: #1A1A1A;
  --accent: #C7C7C7;
  --error: #DC2626;
  --success: #16A34A;
  --warning: #D97706;
}
```

### Typography

Clean, readable typography hierarchy:

```css
/* Typography System */
.text-xs { font-size: 0.75rem; line-height: 1rem; }
.text-sm { font-size: 0.875rem; line-height: 1.25rem; }
.text-base { font-size: 1rem; line-height: 1.5rem; }
.text-lg { font-size: 1.125rem; line-height: 1.75rem; }
.text-xl { font-size: 1.25rem; line-height: 1.75rem; }

/* Font Weights */
.font-light { font-weight: 300; }
.font-normal { font-weight: 400; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }

/* Font Families */
.font-ui { font-family: 'Orbitron', monospace; }
.font-content { font-family: 'Inter', system-ui, sans-serif; }
```

### Spacing System

8-point grid system for consistent spacing:

```css
/* Spacing Scale */
.space-1 { margin: 0.25rem; } /* 4px */
.space-2 { margin: 0.5rem; }  /* 8px */
.space-3 { margin: 0.75rem; } /* 12px */
.space-4 { margin: 1rem; }    /* 16px */
.space-6 { margin: 1.5rem; }  /* 24px */
.space-8 { margin: 2rem; }    /* 32px */
```

### Component Styling

Consistent component styling with Tailwind:

```css
/* Button Components */
.btn-primary {
  @apply bg-ui-press text-white px-4 py-2 rounded-lg font-medium;
  @apply hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500;
  @apply transition-colors duration-200;
}

.btn-secondary {
  @apply bg-ui-silver text-ui-charcoal px-4 py-2 rounded-lg font-medium;
  @apply hover:bg-ui-graphite hover:text-white focus:outline-none focus:ring-2;
  @apply transition-colors duration-200;
}

/* Input Components */
.input-field {
  @apply w-full px-3 py-2 border border-ui-silver rounded-lg;
  @apply focus:outline-none focus:ring-2 focus:ring-ui-press focus:border-transparent;
  @apply placeholder-ui-graphite text-ui-charcoal;
}
```

## Animation System

### GSAP Animations

Smooth, performant animations using GSAP:

```typescript
// lib/animations.ts
import { gsap } from 'gsap';

export const fadeIn = (element: HTMLElement) => {
  gsap.fromTo(element, 
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
  );
};

export const slideIn = (element: HTMLElement, direction: 'left' | 'right' = 'left') => {
  const x = direction === 'left' ? -100 : 100;
  gsap.fromTo(element,
    { x, opacity: 0 },
    { x: 0, opacity: 1, duration: 0.4, ease: 'power2.out' }
  );
};

export const pulse = (element: HTMLElement) => {
  gsap.to(element, {
    scale: 1.1,
    duration: 0.5,
    yoyo: true,
    repeat: -1,
    ease: 'power2.inOut'
  });
};
```

### CSS Transitions

Lightweight CSS transitions for micro-interactions:

```css
/* Transition Classes */
.transition-all {
  transition: all 0.2s ease-in-out;
}

.transition-colors {
  transition: color 0.2s ease-in-out, background-color 0.2s ease-in-out;
}

.transition-transform {
  transition: transform 0.2s ease-in-out;
}

/* Hover Effects */
.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.hover-scale:hover {
  transform: scale(1.05);
}
```

## Responsive Design

### Mobile-First Approach

Design starts from mobile and scales up:

```css
/* Mobile First (default) */
.container {
  @apply px-4 py-2;
}

/* Tablet */
@media (min-width: 768px) {
  .container {
    @apply px-6 py-4;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .container {
    @apply px-8 py-6;
  }
}
```

### Breakpoint System

Consistent breakpoints using Tailwind:

```typescript
// tailwind.config.js
module.exports = {
  theme: {
    screens: {
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    }
  }
}
```

## Performance Optimization

### Code Splitting

Automatic code splitting with Next.js:

```typescript
// Dynamic imports for code splitting
const OnboardingModal = dynamic(() => import('@/components/OnboardingModal'), {
  loading: () => <div>Loading...</div>,
  ssr: false
});

const PrivacySettings = dynamic(() => import('@/components/PrivacySettings'), {
  loading: () => <div>Loading...</div>
});
```

### Image Optimization

Next.js Image component for optimized images:

```typescript
import Image from 'next/image';

export default function Header() {
  return (
    <header className="header">
      <Image
        src="/logo.svg"
        alt="Heijō Logo"
        width={32}
        height={32}
        priority
        className="logo"
      />
    </header>
  );
}
```

### Bundle Optimization

- **Tree Shaking**: Remove unused code
- **Minification**: Compress JavaScript and CSS
- **Gzip Compression**: Server-side compression
- **CDN**: Content delivery network for static assets

## Accessibility

### WCAG 2.1 AA Compliance

```typescript
// Accessible button component
export default function AccessibleButton({ 
  children, 
  onClick, 
  disabled,
  ariaLabel 
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`
        button
        ${disabled ? 'disabled' : ''}
      `}
      role="button"
      tabIndex={0}
    >
      {children}
    </button>
  );
}
```

### Keyboard Navigation

```css
/* Focus styles */
.focus-visible:focus {
  outline: 2px solid var(--ui-press);
  outline-offset: 2px;
}

/* Skip links */
.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  background: var(--ui-charcoal);
  color: white;
  padding: 8px;
  text-decoration: none;
  z-index: 1000;
}

.skip-link:focus {
  top: 6px;
}
```

## Error Handling

### Error Boundaries

React Error Boundaries for graceful error handling:

```typescript
// components/ErrorBoundary.tsx
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong.</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### User-Friendly Error Messages

```typescript
// lib/errorHandling.ts
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  return 'An unexpected error occurred. Please try again.';
}

export function handleAsyncError<T>(
  asyncFn: () => Promise<T>,
  fallback: T
): Promise<T> {
  return asyncFn().catch(error => {
    console.error('Async error:', error);
    return fallback;
  });
}
```

## Testing Strategy

### Component Testing

```typescript
// __tests__/Composer.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import Composer from '@/components/Composer';

describe('Composer', () => {
  it('renders textarea and save button', () => {
    render(<Composer onSave={jest.fn()} />);
    
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('calls onSave when save button is clicked', () => {
    const mockSave = jest.fn();
    render(<Composer onSave={mockSave} />);
    
    fireEvent.change(screen.getByRole('textbox'), { 
      target: { value: 'Test entry' } 
    });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    
    expect(mockSave).toHaveBeenCalledWith({
      content: 'Test entry',
      source: 'text'
    });
  });
});
```

### Integration Testing

```typescript
// __tests__/JournalPage.test.tsx
import { render, screen } from '@testing-library/react';
import JournalPage from '@/app/journal/page';

describe('JournalPage', () => {
  it('renders journal interface when authenticated', () => {
    render(<JournalPage />);
    
    expect(screen.getByText('Journal')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
});
```

This frontend architecture provides a **modern**, **accessible**, and **performant** user interface that maintains the **PalmPilot 1985 aesthetic** while delivering an **excellent user experience** across all devices.

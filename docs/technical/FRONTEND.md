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
│   └── Settings
├── Main Content
│   ├── Journal Page
│   │   ├── Composer
│   │   │   ├── MicButton
│   │   │   └── PromptChip
│   │   ├── EntryList
│   │   │   └── EntryDetail
│   │   └── RecentEntriesDrawer
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

The main journal entry creation interface:

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
        placeholder="What's on your mind?"
        className="composer-textarea"
      />
      <div className="composer-controls">
        <MicButton
          isRecording={isRecording}
          onToggle={handleVoiceRecording}
          disabled={!isSupported}
        />
        <button
          onClick={() => onSave({ content, source: 'text' })}
          className="save-button"
        >
          Save Entry
        </button>
      </div>
    </div>
  );
}
```

#### 2. MicButton Component

Voice recording interface with visual feedback:

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
        mic-button
        ${isRecording ? 'recording' : ''}
        ${disabled ? 'disabled' : ''}
      `}
      aria-label={isRecording ? 'Stop recording' : 'Start recording'}
    >
      <svg className="mic-icon" viewBox="0 0 24 24">
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
      </svg>
      {isRecording && (
        <div className="recording-indicator">
          <div className="pulse-ring"></div>
        </div>
      )}
    </button>
  );
}
```

#### 3. EntryList Component

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

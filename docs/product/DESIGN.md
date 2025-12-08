# Design System & PalmPilot 1985 Aesthetic

## Overview

Heijō Mini-Journal embraces the **PalmPilot 1985 aesthetic** while incorporating modern design principles. The design system follows **Dieter Rams' principles** of good design: honest, unobtrusive, and long-lasting.

## Design Philosophy

### Core Principles

1. **Privacy-First**: Design that protects and respects user privacy
2. **Minimalist**: Clean, uncluttered interface focusing on content
3. **Functional**: Every element serves a purpose
4. **Accessible**: Inclusive design for all users
5. **Nostalgic**: Authentic 1985 PalmPilot experience

### Dieter Rams Design Principles

- **Good design is innovative**: Modern voice recognition with retro aesthetics
- **Good design makes a product useful**: Focus on journaling functionality
- **Good design is aesthetic**: Beautiful PalmPilot-inspired interface with brutalist polish
- **Good design makes a product understandable**: Intuitive user experience
- **Good design is unobtrusive**: Design supports, doesn't distract
- **Good design is honest**: Transparent about privacy and data usage
- **Good design is long-lasting**: Timeless design that ages well
- **Good design is thorough down to the last detail**: Attention to every pixel

### Brutalist Aesthetic Elements

The UI incorporates brutalist design principles for a clean, elevated aesthetic:

- **Subtle Elevation**: 1px borders (#e5e5e5) and soft shadows (0 4px 12px rgba(0,0,0,0.06)) for depth
- **Increased Border Radius**: ~14px for cards and textarea (increased from ~12px)
- **Recessed Elements**: Mic button features inner shadows for tactile depth
- **Minimal Ghost Chips**: S/H buttons use border-only styling with 80% opacity → 100% on hover
- **Breathing Focus States**: Textarea scales to 1.01 with shadow increase on focus
- **Monochrome Palette**: Greyscale with single accent color (orange for recording state)
- **8px Spacing System**: All elements align to a single vertical axis

## Color System

### PalmPilot 1985 Color Palette

The authentic color palette from the original PalmPilot:

```css
:root {
  /* PalmPilot 1985 Colors */
  --ui-charcoal: #181819;      /* Primary text, borders */
  --ui-graphite: #616162;      /* Secondary text, icons */
  --ui-silver: #9E9E9E;        /* Disabled states, placeholders */
  --ui-warm-silver: #C1C0BD;   /* Background elements */
  --ui-screen: #E8E9EB;        /* Main background */
  --ui-press: #3AA6FF;         /* Primary action color */
  
  /* Modern Design System */
  --background: #F8F8F8;       /* App background */
  --foreground: #1A1A1A;       /* Primary text */
  --accent: #C7C7C7;           /* Accent color */
  --error: #DC2626;            /* Error states */
  --success: #16A34A;          /* Success states */
  --warning: #D97706;          /* Warning states */
}
```

### Color Usage Guidelines

#### Primary Colors
- **Charcoal (#181819)**: Headers, primary text, important UI elements
- **Graphite (#616162)**: Secondary text, icons, subtle elements
- **Press (#3AA6FF)**: Buttons, links, active states, progress indicators

#### Background Colors
- **Screen (#E8E9EB)**: Card backgrounds, input fields
- **Warm Silver (#C1C0BD)**: Subtle backgrounds, dividers
- **Background (#F8F8F8)**: Main app background

#### Semantic Colors
- **Error (#DC2626)**: Error messages, validation errors
- **Success (#16A34A)**: Success messages, completed states
- **Warning (#D97706)**: Warning messages, attention states

## Typography

### Font System

#### Primary Fonts
- **Orbitron**: UI elements, headers, buttons (PalmPilot-inspired)
- **Inter**: Body text, content, readable text (modern, accessible)

```css
/* Font Families */
.font-ui {
  font-family: 'Orbitron', 'Courier New', monospace;
}

.font-content {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
```

#### Typography Scale

```css
/* Font Sizes */
.text-xs { font-size: 0.75rem; line-height: 1rem; }      /* 12px */
.text-sm { font-size: 0.875rem; line-height: 1.25rem; }   /* 14px */
.text-base { font-size: 1rem; line-height: 1.5rem; }      /* 16px */
.text-lg { font-size: 1.125rem; line-height: 1.75rem; }   /* 18px */
.text-xl { font-size: 1.25rem; line-height: 1.75rem; }    /* 20px */
.text-2xl { font-size: 1.5rem; line-height: 2rem; }       /* 24px */
.text-3xl { font-size: 1.875rem; line-height: 2.25rem; }  /* 30px */

/* Font Weights */
.font-light { font-weight: 300; }
.font-normal { font-weight: 400; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }
```

### Typography Hierarchy

#### Headers
```css
h1 {
  font-family: 'Orbitron', monospace;
  font-size: 1.875rem;
  font-weight: 600;
  color: var(--ui-charcoal);
  line-height: 1.2;
}

h2 {
  font-family: 'Orbitron', monospace;
  font-size: 1.5rem;
  font-weight: 500;
  color: var(--ui-charcoal);
  line-height: 1.3;
}

h3 {
  font-family: 'Orbitron', monospace;
  font-size: 1.25rem;
  font-weight: 500;
  color: var(--ui-graphite);
  line-height: 1.4;
}
```

#### Body Text
```css
p {
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  font-weight: 400;
  color: var(--foreground);
  line-height: 1.6;
}

.small-text {
  font-family: 'Inter', sans-serif;
  font-size: 0.875rem;
  font-weight: 400;
  color: var(--ui-graphite);
  line-height: 1.5;
}
```

## Spacing System

### 8-Point Grid

Consistent spacing using 8px base unit for clean alignment to a single vertical axis:

```css
/* Spacing Scale */
.space-1 { margin: 0.25rem; }  /* 4px */
.space-2 { margin: 0.5rem; }   /* 8px */
.space-3 { margin: 0.75rem; }  /* 12px */
.space-4 { margin: 1rem; }     /* 16px */
.space-6 { margin: 1.5rem; }   /* 24px */
.space-8 { margin: 2rem; }     /* 32px */
.space-12 { margin: 3rem; }    /* 48px */
.space-16 { margin: 4rem; }    /* 64px */

/* Padding Scale */
.p-1 { padding: 0.25rem; }     /* 4px */
.p-2 { padding: 0.5rem; }      /* 8px */
.p-3 { padding: 0.75rem; }     /* 12px */
.p-4 { padding: 1rem; }        /* 16px */
.p-6 { padding: 1.5rem; }      /* 24px */
.p-8 { padding: 2rem; }        /* 32px */
```

**Note**: All elements align cleanly to a single vertical axis on both desktop and mobile, ensuring visual consistency and the brutalist aesthetic.

### Component Spacing

```css
/* Component Spacing */
.component-spacing {
  margin-bottom: 1.5rem; /* 24px between components */
}

.section-spacing {
  margin-bottom: 3rem; /* 48px between sections */
}

.card-padding {
  padding: 1.5rem; /* 24px inside cards */
}

.button-padding {
  padding: 0.75rem 1.5rem; /* 12px vertical, 24px horizontal */
}
```

## Component Design

### Buttons

#### Primary Button
```css
.btn-primary {
  background-color: var(--ui-press);
  color: white;
  border: none;
  border-radius: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-family: 'Orbitron', monospace;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.btn-primary:hover {
  background-color: #2B8CE6;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(58, 166, 255, 0.3);
}

.btn-primary:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(58, 166, 255, 0.3);
}
```

#### Secondary Button
```css
.btn-secondary {
  background-color: var(--ui-silver);
  color: var(--ui-charcoal);
  border: 1px solid var(--ui-graphite);
  border-radius: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-family: 'Orbitron', monospace;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}

.btn-secondary:hover {
  background-color: var(--ui-graphite);
  color: white;
  transform: translateY(-1px);
}
```

#### Icon Button
```css
.btn-icon {
  background-color: transparent;
  color: var(--ui-graphite);
  border: none;
  border-radius: 0.375rem;
  padding: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background-color: var(--ui-warm-silver);
  color: var(--ui-charcoal);
}
```

### Input Fields

#### Text Input
```css
.input-field {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--ui-silver);
  border-radius: 0.5rem;
  background-color: var(--ui-screen);
  color: var(--ui-charcoal);
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  transition: all 0.2s ease-in-out;
}

.input-field:focus {
  outline: none;
  border-color: var(--ui-press);
  box-shadow: 0 0 0 3px rgba(58, 166, 255, 0.1);
}

.input-field::placeholder {
  color: var(--ui-graphite);
}
```

#### Textarea
```css
.textarea-field {
  width: 100%;
  min-height: 8rem;
  padding: 0.75rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.875rem; /* 14px for subtle elevation */
  background: linear-gradient(180deg, rgba(26, 26, 26, 0.98) 0%, rgba(26, 26, 26, 0.95) 100%);
  color: var(--text-inverse);
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  line-height: 1.6;
  resize: vertical;
  transition: all 0.3s ease-in-out;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.28), 0 6px 20px rgba(0, 0, 0, 0.2);
}

.textarea-field:focus {
  outline: none;
  transform: scale(1.01);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.28), 0 8px 24px rgba(0, 0, 0, 0.25);
}
```

**Note**: The textarea features a subtle radial gradient background, breathing focus effect (scale 1.01 + shadow increase), and increased border radius (14px) for the brutalist aesthetic.

### Cards

#### Entry Card
```css
.entry-card {
  background-color: rgba(255, 255, 255, 0.95);
  border: 1px solid #e5e5e5;
  border-radius: 0.875rem; /* 14px for subtle elevation */
  padding: 1.5rem;
  margin-bottom: 1rem;
  transition: all 0.2s ease-in-out;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
}

.entry-card:hover {
  border-color: #d0d0d0;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.entry-card:active {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}
```

**Note**: Main cards feature subtle 1px borders (#e5e5e5) and soft shadows (0 4px 12px rgba(0,0,0,0.06)) for elevation, with increased border radius (~14px) for the brutalist aesthetic.

#### Settings Card
```css
.settings-card {
  background-color: var(--ui-screen);
  border: 1px solid var(--ui-warm-silver);
  border-radius: 0.75rem;
  padding: 2rem;
  margin-bottom: 2rem;
}

.settings-card h3 {
  margin-bottom: 1rem;
  color: var(--ui-charcoal);
}

.settings-card p {
  margin-bottom: 1.5rem;
  color: var(--ui-graphite);
}
```

## Layout System

### Grid System

```css
/* Grid Layout */
.grid {
  display: grid;
  gap: 1.5rem;
}

.grid-cols-1 { grid-template-columns: repeat(1, 1fr); }
.grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
.grid-cols-3 { grid-template-columns: repeat(3, 1fr); }

/* Responsive Grid */
@media (min-width: 768px) {
  .grid-cols-1 { grid-template-columns: repeat(2, 1fr); }
  .grid-cols-2 { grid-template-columns: repeat(3, 1fr); }
}

@media (min-width: 1024px) {
  .grid-cols-1 { grid-template-columns: repeat(3, 1fr); }
  .grid-cols-2 { grid-template-columns: repeat(4, 1fr); }
}
```

### Flexbox Layout

```css
/* Flexbox Utilities */
.flex { display: flex; }
.flex-col { flex-direction: column; }
.flex-row { flex-direction: row; }
.items-center { align-items: center; }
.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }
.gap-2 { gap: 0.5rem; }
.gap-4 { gap: 1rem; }
.gap-6 { gap: 1.5rem; }
```

### Container System

```css
/* Container */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.container-sm {
  max-width: 640px;
  margin: 0 auto;
  padding: 0 1rem;
}

.container-lg {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 1rem;
}
```

## Animation System

### GSAP Animations

```typescript
// Animation utilities
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

.hover-glow:hover {
  box-shadow: 0 0 20px rgba(58, 166, 255, 0.3);
}
```

## Responsive Design

### Mobile-First Approach

Optimized for 320-430px widths with proper safe-area handling:

```css
/* Mobile First (default) - 320-430px */
.container {
  padding: 1rem;
  max-width: 420px;
  margin: 0 auto;
  padding-bottom: env(safe-area-inset-bottom, 16px);
}

.button {
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  min-height: 44px; /* Accessibility: minimum tap target */
}

/* Mobile Toolbar (mobile only) */
.mobile-toolbar {
  position: sticky;
  bottom: 12px;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-between;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 9999px;
  border: 1px solid #e5e5e5;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
}

/* Tablet */
@media (min-width: 768px) {
  .container {
    padding: 1.5rem;
    max-width: 768px;
  }
  
  .button {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
  }
  
  .mobile-toolbar {
    display: none; /* Hide mobile toolbar on desktop */
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .container {
    padding: 2rem;
    max-width: 1280px;
  }
  
  .button {
    padding: 1rem 2rem;
    font-size: 1rem;
  }
}
```

**Mobile Interface**: On mobile devices, a round hero Save button is centered below the journal card. Users can use the keyboard microphone button for voice dictation (no custom STT UI on mobile). The bottom navigation bar contains Save, History, Settings, and Sign Out controls.

### Breakpoint System

```typescript
// tailwind.config.js
module.exports = {
  theme: {
    screens: {
      'sm': '640px',   // Small devices
      'md': '768px',   // Medium devices
      'lg': '1024px',  // Large devices
      'xl': '1280px',  // Extra large devices
      '2xl': '1536px', // 2X large devices
    }
  }
}
```

## Accessibility

### Focus States

```css
/* Focus Styles */
.focus-visible:focus {
  outline: 2px solid var(--ui-press);
  outline-offset: 2px;
}

.focus-visible:focus:not(:focus-visible) {
  outline: none;
}

/* Skip Links */
.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  background: var(--ui-charcoal);
  color: white;
  padding: 8px;
  text-decoration: none;
  z-index: 1000;
  border-radius: 4px;
}

.skip-link:focus {
  top: 6px;
}
```

### ARIA Labels

```typescript
// Accessible components
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
      className="button"
      role="button"
      tabIndex={0}
    >
      {children}
    </button>
  );
}
```

## Icon System

### Icon Guidelines

- **Style**: Stroke-based, single weight (1.5px)
- **Size**: 16px, 20px, 24px, 32px
- **Color**: Inherit from parent or use semantic colors
- **Accessibility**: Include ARIA labels

```css
/* Icon Styles */
.icon {
  width: 1.25rem;
  height: 1.25rem;
  stroke-width: 1.5;
  stroke: currentColor;
  fill: none;
}

.icon-sm { width: 1rem; height: 1rem; }
.icon-lg { width: 1.5rem; height: 1.5rem; }
.icon-xl { width: 2rem; height: 2rem; }
```

## Design Tokens

### Design Token System

```typescript
// design-tokens.ts
export const designTokens = {
  colors: {
    primary: {
      charcoal: '#181819',
      graphite: '#616162',
      silver: '#9E9E9E',
      warmSilver: '#C1C0BD',
      screen: '#E8E9EB',
      press: '#3AA6FF'
    },
    semantic: {
      error: '#DC2626',
      success: '#16A34A',
      warning: '#D97706'
    }
  },
  spacing: {
    xs: '0.25rem',  // 4px
    sm: '0.5rem',   // 8px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
    '2xl': '3rem'   // 48px
  },
  typography: {
    fontFamily: {
      ui: 'Orbitron, monospace',
      content: 'Inter, sans-serif'
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem'
    }
  }
};
```

This design system creates a **cohesive**, **accessible**, and **beautiful** user interface that honors the **PalmPilot 1985 aesthetic** while providing a **modern**, **functional** experience.

# Design Documentation

## Overview
Heijō follows a minimalist, calming design philosophy inspired by the PalmPilot 1985 aesthetic. This document outlines the design system, visual guidelines, and user experience principles.

## Design Philosophy

### Core Principles
- **Minimalism**: Clean, uncluttered interfaces
- **Calm**: Soothing colors and gentle interactions
- **Focus**: Design that supports concentration
- **Accessibility**: Inclusive design for all users
- **Mobile-First**: Responsive design starting from mobile

### PalmPilot 1985 Inspiration
- **Monospace Typography**: Clean, readable fonts
- **High Contrast**: Clear visual hierarchy
- **Simple Layouts**: Grid-based, structured design
- **Functional Aesthetics**: Form follows function
- **Retro-Futuristic**: Modern functionality with classic styling

## Color Palette

### Primary Colors
- **Background**: `#FFFFFF` (Pure white)
- **Text**: `#1A1A1A` (Near black)
- **Accent**: `#4A90E2` (Calm blue)
- **Success**: `#52C41A` (Gentle green)
- **Warning**: `#FAAD14` (Soft yellow)
- **Error**: `#F5222D` (Muted red)

### Secondary Colors
- **Gray 50**: `#FAFAFA` (Lightest gray)
- **Gray 100**: `#F5F5F5` (Light gray)
- **Gray 200**: `#E8E8E8` (Medium light gray)
- **Gray 300**: `#D9D9D9` (Medium gray)
- **Gray 400**: `#BFBFBF` (Medium dark gray)
- **Gray 500**: `#8C8C8C` (Dark gray)

### Semantic Colors
- **Primary**: `#4A90E2` (Calm blue)
- **Secondary**: `#8C8C8C` (Neutral gray)
- **Success**: `#52C41A` (Success green)
- **Warning**: `#FAAD14` (Warning yellow)
- **Error**: `#F5222D` (Error red)
- **Info**: `#1890FF` (Info blue)

## Typography

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 
             'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 
             'Helvetica Neue', sans-serif;
```

### Font Sizes
- **Display**: `3rem` (48px) - Hero headings
- **H1**: `2.25rem` (36px) - Page titles
- **H2**: `1.875rem` (30px) - Section headings
- **H3**: `1.5rem` (24px) - Subsection headings
- **H4**: `1.25rem` (20px) - Card titles
- **Body Large**: `1.125rem` (18px) - Important text
- **Body**: `1rem` (16px) - Regular text
- **Body Small**: `0.875rem` (14px) - Secondary text
- **Caption**: `0.75rem` (12px) - Labels and captions

### Font Weights
- **Light**: 300
- **Regular**: 400
- **Medium**: 500
- **Semibold**: 600
- **Bold**: 700

### Line Heights
- **Tight**: 1.2
- **Normal**: 1.5
- **Relaxed**: 1.75

## Spacing System

### Spacing Scale
- **0**: `0px`
- **1**: `0.25rem` (4px)
- **2**: `0.5rem` (8px)
- **3**: `0.75rem` (12px)
- **4**: `1rem` (16px)
- **5**: `1.25rem` (20px)
- **6**: `1.5rem` (24px)
- **8**: `2rem` (32px)
- **10**: `2.5rem` (40px)
- **12**: `3rem` (48px)
- **16**: `4rem` (64px)
- **20**: `5rem` (80px)
- **24**: `6rem` (96px)

### Component Spacing
- **Padding Small**: `0.5rem` (8px)
- **Padding Medium**: `1rem` (16px)
- **Padding Large**: `1.5rem` (24px)
- **Margin Small**: `0.5rem` (8px)
- **Margin Medium**: `1rem` (16px)
- **Margin Large**: `2rem` (32px)

## Layout System

### Grid System
- **Container**: Max-width with responsive padding
- **Columns**: 12-column grid system
- **Gutters**: Consistent spacing between columns
- **Breakpoints**: Mobile-first responsive design

### Breakpoints
- **Mobile**: `320px` - `767px`
- **Tablet**: `768px` - `1023px`
- **Desktop**: `1024px` - `1439px`
- **Large Desktop**: `1440px`+

### Container Sizes
- **Mobile**: Full width with padding
- **Tablet**: Max-width `768px`
- **Desktop**: Max-width `1024px`
- **Large Desktop**: Max-width `1200px`

## Component Design

### Buttons
```css
/* Primary Button */
.btn-primary {
  background-color: #4A90E2;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 0.375rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background-color: #357ABD;
  transform: translateY(-1px);
}
```

### Forms
- **Input Fields**: Clean borders, subtle shadows
- **Labels**: Clear, accessible labeling
- **Validation**: Gentle error states
- **Focus States**: Clear focus indicators

### Cards
- **Background**: White with subtle shadow
- **Border Radius**: `0.5rem` (8px)
- **Padding**: `1.5rem` (24px)
- **Shadow**: Subtle elevation

### Navigation
- **Header**: Fixed top navigation
- **Links**: Clear, accessible navigation
- **Mobile**: Collapsible menu
- **Active States**: Clear current page indication

## Iconography

### Icon Style
- **Style**: Outline icons with consistent stroke width
- **Size**: 16px, 20px, 24px, 32px
- **Color**: Inherit from parent or semantic colors
- **Alignment**: Centered with text

### Icon Library
- **System Icons**: Navigation, actions, status
- **Brand Icons**: Heijō logo, social media
- **Utility Icons**: Loading, error, success states

## Animation & Transitions

### Transition Principles
- **Duration**: 200ms for micro-interactions
- **Easing**: `ease-out` for natural feel
- **Purpose**: Enhance usability, not distract

### Common Animations
- **Hover**: Subtle scale and color changes
- **Focus**: Clear focus indicators
- **Loading**: Gentle pulsing or spinning
- **Page Transitions**: Smooth fade transitions

## Accessibility

### Color Contrast
- **Normal Text**: 4.5:1 contrast ratio minimum
- **Large Text**: 3:1 contrast ratio minimum
- **Interactive Elements**: 3:1 contrast ratio minimum

### Focus Management
- **Visible Focus**: Clear focus indicators
- **Keyboard Navigation**: Full keyboard accessibility
- **Focus Order**: Logical tab order
- **Skip Links**: Skip to main content

### Screen Reader Support
- **Semantic HTML**: Proper HTML structure
- **ARIA Labels**: Descriptive labels
- **Alt Text**: Meaningful image descriptions
- **Live Regions**: Dynamic content announcements

## Responsive Design

### Mobile-First Approach
- **Base Styles**: Mobile-optimized
- **Progressive Enhancement**: Desktop features
- **Touch-Friendly**: Appropriate touch targets
- **Performance**: Optimized for mobile networks

### Breakpoint Strategy
```css
/* Mobile First */
.container {
  padding: 1rem;
}

/* Tablet */
@media (min-width: 768px) {
  .container {
    padding: 2rem;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .container {
    max-width: 1200px;
    margin: 0 auto;
  }
}
```

## Design Tokens

### CSS Custom Properties
```css
:root {
  /* Colors */
  --color-primary: #4A90E2;
  --color-text: #1A1A1A;
  --color-background: #FFFFFF;
  
  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  
  /* Typography */
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
}
```

## Brand Guidelines

### Logo Usage
- **Primary Logo**: Full Heijō logo
- **Icon Only**: H icon for small spaces
- **Minimum Size**: 24px height
- **Clear Space**: Equal to icon height
- **Background**: White or transparent

### Voice & Tone
- **Calm**: Soothing, peaceful language
- **Clear**: Simple, understandable communication
- **Confident**: Assured, trustworthy messaging
- **Inclusive**: Welcoming to all users

### Content Guidelines
- **Headlines**: Clear, benefit-focused
- **Body Text**: Conversational, helpful
- **CTAs**: Action-oriented, encouraging
- **Error Messages**: Helpful, solution-focused


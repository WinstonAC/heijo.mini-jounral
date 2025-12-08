# Product Features

## Overview

Heijō Mini-Journal is a **privacy-first journaling application** that combines the nostalgic charm of 1985 PalmPilot aesthetics with modern voice recognition technology. The app prioritizes **user privacy**, **offline functionality**, and **seamless user experience**.

## Core Features

### 1. Voice & Text Journaling

#### Voice Recording
- **Desktop**: Custom MicButton with Web Speech API for real-time transcription (<300ms latency)
- **Mobile**: Uses device keyboard microphone button for native dictation (no custom STT UI)
- **Language Selection**: Configurable voice input language via Settings (desktop only)
- **Visual Feedback**: Animated recording button with pulse effects (desktop)
- **Error Handling**: Clear error messages for microphone issues (desktop)
- **Offline Support**: Voice recognition works without internet (desktop)

```typescript
// Voice recording implementation
const handleVoiceRecording = async () => {
  if (isRecording) {
    const result = await stopRecording();
    setContent(prev => prev + result.transcript);
  } else {
    await startRecording();
  }
  setIsRecording(!isRecording);
};
```

#### Text Input
- **Rich Text Editor**: Clean, distraction-free writing interface
- **Auto-save**: Automatic saving of draft entries
- **Keyboard Shortcuts**: Quick access to common functions
- **Mobile Optimized**: Touch-friendly interface for mobile devices

### 2. Daily Prompts System

#### 90-Day Rotating Prompts
- **Curated Prompts**: Thoughtfully crafted journaling prompts
- **Y/N Chip Interface**: Simple yes/no response system
- **Category Organization**: Prompts organized by themes
- **Progress Tracking**: Visual progress through the 90-day cycle

```typescript
// Prompt system implementation
const prompts = [
  {
    id: '1',
    text: 'What made you smile today?',
    category: 'gratitude',
    day_number: 1
  },
  {
    id: '2', 
    text: 'Describe a challenge you overcame this week.',
    category: 'growth',
    day_number: 2
  }
  // ... 90 total prompts
];
```

#### Prompt Categories
- **Gratitude**: Focus on positive experiences
- **Growth**: Personal development and learning
- **Reflection**: Self-awareness and introspection
- **Creativity**: Creative expression and ideas
- **Relationships**: Social connections and interactions

### 3. Tag System

#### Custom Tags
- **Flexible Tagging**: Create custom tags for organization
- **Tag Suggestions**: Smart suggestions based on content
- **Tag Management**: Easy tag creation, editing, and deletion
- **Search by Tags**: Find entries by specific tags

```typescript
// Tag system implementation
interface JournalEntry {
  id: string;
  content: string;
  tags: string[];
  created_at: string;
  source: 'text' | 'voice';
}

const handleTagAdd = (tag: string) => {
  setTags(prev => [...prev, tag]);
};
```

#### Tag Features
- **Auto-complete**: Smart tag suggestions
- **Color Coding**: Visual tag organization
- **Tag Statistics**: View most used tags
- **Bulk Operations**: Apply tags to multiple entries

### 4. Premium & Storage Tiers

#### Free Tier (Local Storage)
- **Complete functionality**: All journaling features available
- **Local storage only**: Data stored in browser (`localStorage`)
- **Privacy-first**: Data never leaves your device
- **Unlimited**: No limits on entries or storage
- **Offline-first**: Works completely without internet

#### Premium Tier (Cloud Sync) - $5/year
- **All free features**: Plus cloud sync
- **Multi-device access**: Access entries from any device
- **Cloud backup**: Automatic backup to Supabase
- **Automatic sync**: Real-time synchronization
- **Testing**: Currently free for testing (manual activation)

See [Premium Features Documentation](../PREMIUM_FEATURES.md) for complete details.

### 5. Privacy-First Architecture

#### Local Storage
- **Encrypted Storage**: AES-GCM encryption for all data
- **Device-Specific Keys**: Unique encryption keys per device
- **Zero-Network Mode**: Complete offline functionality
- **Data Minimization**: Automatic cleanup of old data

```typescript
// Encryption implementation
export class EncryptionManager {
  async encrypt(data: string): Promise<string> {
    const key = await this.getDeviceKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(data)
    );
    return JSON.stringify({
      data: Array.from(new Uint8Array(encrypted)),
      iv: Array.from(iv)
    });
  }
}
```

#### GDPR Compliance
- **Data Export**: Complete data export in JSON format
- **Data Deletion**: One-tap data deletion
- **Consent Management**: Granular privacy controls
- **Transparent Privacy**: Clear privacy policy and data usage

### 5. PalmPilot 1985 Design

#### Retro Aesthetic
- **Color Palette**: Authentic 1985 PalmPilot colors
- **Typography**: Orbitron font for UI elements
- **Layout**: Grid-based layout with 8-point spacing
- **Animations**: Subtle, purposeful animations

```css
:root {
  /* PalmPilot 1985 Color Palette */
  --ui-charcoal: #181819;
  --ui-graphite: #616162;
  --ui-silver: #9E9E9E;
  --ui-warm-silver: #C1C0BD;
  --ui-screen: #E8E9EB;
  --ui-press: #3AA6FF;
}
```

#### Design Principles
- **Dieter Rams Inspired**: Clean, functional design
- **Mobile-First**: Responsive design starting from mobile
- **Accessibility**: WCAG 2.1 AA compliance
- **Consistency**: Unified design language throughout

### 6. Progressive Web App (PWA)

#### Installation
- **App Manifest**: Installable on mobile and desktop
- **Offline Support**: Full functionality without internet
- **App Icons**: Custom icons for different platforms
- **Splash Screen**: Branded loading experience

```json
// site.webmanifest
{
  "name": "Heijō Mini-Journal",
  "short_name": "Heijō",
  "description": "Privacy-first journaling app",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#F8F8F8",
  "theme_color": "#3AA6FF",
  "icons": [
    {
      "src": "/icon-192.svg",
      "sizes": "192x192",
      "type": "image/svg+xml"
    }
  ]
}
```

#### PWA Features
- **Offline Functionality**: Complete offline experience
- **Push Notifications**: Optional daily reminders
- **Background Sync**: Automatic data synchronization
- **App-like Experience**: Native app feel in browser

#### Notification Settings
Comprehensive notification and reminder system with granular controls:

- **Push Notifications**: Browser push notifications with permission handling
  - Request browser permission for push notifications
  - Browser support detection and fallback messaging
  - Permission status tracking (granted/denied/default)
  - Test notification functionality

- **Email Notifications**: Email-based reminders
  - Toggle email notifications on/off
  - Email delivery for reminders

- **Reminder Configuration**:
  - **Frequency**: Daily, weekly, or off
  - **Reminder Time**: Custom time selection (24-hour format)
  - **Timezone**: Automatic timezone detection
  - **Smart Skip**: Automatically skip reminders if user has already journaled today
  - **Quiet Hours**: Configure start/end times to suppress notifications during specific hours

- **Settings Management**:
  - Save reminder settings with confirmation feedback
  - Unsaved changes tracking
  - Browser compatibility warnings
  - Test notification button for verification

### 7. Data Management

#### Export Functionality
- **CSV Export**: Spreadsheet-compatible export (primary export method in Settings)
  - Includes entry text, tags, and timestamps
  - Downloadable file format
  - Available from Settings panel
- **JSON Export**: Complete data export in JSON format (available via GDPR tools)
- **Selective Export**: Export specific date ranges or tags (future enhancement)
- **Backup Creation**: Automatic backup generation

```typescript
// Data export implementation
const handleDataExport = async () => {
  const data = await gdprManager.requestDataExport();
  const blob = new Blob([JSON.stringify(data, null, 2)], { 
    type: 'application/json' 
  });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `heijo-export-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
};
```

#### Data Organization
- **Chronological View**: Entries sorted by date
- **Search Functionality**: Full-text search across entries
- **Filter Options**: Filter by date, tags, or source
- **Archive System**: Organize entries by year/month

### 8. Security Features

#### Authentication
- **Magic Link Login**: Passwordless authentication
- **Session Management**: Secure session handling
- **Offline Authentication**: Local authentication fallback
- **Privacy Protection**: No password storage required

#### Security Measures
- **Rate Limiting**: 100 requests per hour per device
- **Input Validation**: XSS and injection prevention
- **Content Security Policy**: Strict CSP implementation
- **Secure Headers**: Comprehensive security headers

### 9. Performance Optimization

#### Speed & Efficiency
- **Cold Start**: <1.5 seconds app initialization
- **Voice Recognition**: <300ms first partial result
- **Bundle Size**: <500KB total bundle size
- **CPU Usage**: <5% idle, <35% during recording

```typescript
// Performance monitoring
export class PerformanceMonitor {
  async trackMetric(name: string, value: number) {
    const metrics = this.getMetrics();
    metrics[name] = value;
    localStorage.setItem('heijo-metrics', JSON.stringify(metrics));
  }
  
  getMetrics(): Record<string, number> {
    const stored = localStorage.getItem('heijo-metrics');
    return stored ? JSON.parse(stored) : {};
  }
}
```

#### Optimization Features
- **Code Splitting**: Lazy loading of components
- **Image Optimization**: Next.js Image component
- **Caching Strategy**: Intelligent data caching
- **Memory Management**: Efficient memory usage

### 10. Settings & Configuration

#### Settings Panel
Comprehensive settings interface accessible from the main journal interface:

**Data Overview**:
- **Total Entries**: Count of all journal entries
- **Storage Used**: Total data storage in bytes (formatted display)
- **Oldest Entry**: Date of the oldest journal entry
- **Newest Entry**: Date of the most recent journal entry

**Consent Settings**:
- **Microphone Access**: Toggle microphone permission (required for voice recording)
- **Local Data Storage**: Toggle local encrypted storage (disabled when Premium is active)
- **Premium Cloud Sync**: Toggle premium cloud sync with upgrade modal
  - Upgrade modal with feature list
  - Sync confirmation flow for existing entries
  - Premium activation (free for testing)
- **Analytics (Optional)**: Toggle anonymous usage analytics

**Display Settings**:
- **Font Size**: Adjustable font size (Small, Medium, Large)
  - Changes reading comfort without affecting layout
  - Persists across sessions
- **Voice Input Language**: Select language for voice transcription
  - Supports multiple languages via Web Speech API
  - Settings persist across sessions
  - Available in Settings → Display → Voice Input Language
- **Daily Prompt**: 
  - "Show Today's Prompt" button (if prompt was dismissed earlier)
  - Displays prompt availability status

**Notifications**:
- Full notification settings panel (see Notification Settings section above)

**Export**:
- **Export as CSV**: Download all entries as CSV file
  - Includes entry text, tags, and timestamps
  - Disabled when no entries exist

**Delete All Data**:
- **Permanent Deletion**: Remove all journal entries, tags, and preferences
- **Confirmation Modal**: Two-step confirmation process
- **GDPR Compliant**: Complete data removal

**Legal Links**:
- Privacy Policy link
- Terms of Service link
- Brand information

### 11. User Experience

#### Onboarding
- **Welcome Tour**: Interactive app introduction
- **Feature Highlights**: Key features explanation
- **Privacy Explanation**: Clear privacy information
- **Quick Start**: Get started in under 2 minutes

```typescript
// Onboarding implementation
const onboardingSteps = [
  {
    title: 'Welcome to Heijō',
    content: 'Your private journaling companion',
    action: 'Get Started'
  },
  {
    title: 'Voice Recording',
    content: 'Tap and hold to record your thoughts',
    action: 'Try Voice'
  },
  {
    title: 'Privacy First',
    content: 'Your data stays on your device',
    action: 'Learn More'
  }
];
```

#### Accessibility
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader**: ARIA labels and descriptions
- **High Contrast**: Support for high contrast mode
- **Font Scaling**: Respects system font size settings

## Advanced Features

### 1. Smart Suggestions

#### Content Suggestions
- **Writing Prompts**: AI-powered writing suggestions
- **Tag Recommendations**: Smart tag suggestions
- **Entry Templates**: Pre-built entry templates
- **Mood Tracking**: Optional mood indicators

### 2. Analytics & Insights

#### Analytics Dashboard
Comprehensive usage analytics dashboard (visible when analytics consent is enabled):

**Overview Metrics**:
- **Total Sessions**: Number of app sessions
- **Total Entries**: Count of all journal entries created

**Entry Type Analysis**:
- **Voice vs Text Breakdown**: Percentage breakdown of entry types
- **Visual Progress Bars**: Visual representation of entry type distribution

**Performance Metrics**:
- **Average Voice Latency**: Average time for voice recognition results
- **Average App Start Time**: Average application initialization time
- **Memory Usage**: Average memory consumption
- **Entries Per Day**: Average number of entries created per day

**Writing Patterns**:
- **Average Entry Length**: Average character count per entry
- **Longest Entry**: Character count of the longest entry

**Feature Usage Tracking**:
- Voice Recording usage count
- Text Entry usage count
- Voice-to-Text conversion count
- Export Data usage count
- Delete Entry usage count
- Search Entries usage count

**Usage Timeline**:
- **First Used**: Date of first app usage
- **Last Used**: Date of most recent app usage

**Privacy-First Design**:
- All analytics stored locally in `localStorage`
- No external tracking or data transmission
- User can opt-in/opt-out via Settings
- Dashboard only visible when analytics consent is enabled

### 3. Integration Features

#### Calendar Integration
- **Date Navigation**: Calendar view of entries
- **Anniversary Reminders**: Remember special dates
- **Habit Tracking**: Track daily journaling habits
- **Goal Setting**: Set and track journaling goals

### 4. Customization Options

#### Theme Customization
- **Color Themes**: Multiple color schemes
- **Font Options**: Different font choices
- **Layout Options**: Flexible layout configurations
- **Icon Packs**: Custom icon sets

## Technical Features

### 1. Offline-First Architecture

- **Complete Offline**: Full functionality without internet
- **Background Sync**: Automatic sync when online
- **Conflict Resolution**: Smart conflict resolution
- **Data Integrity**: Ensures data consistency

### 2. Cross-Platform Support

- **Web Browsers**: Chrome, Firefox, Safari, Edge
- **Mobile Devices**: iOS Safari, Android Chrome
- **Desktop**: Windows, macOS, Linux
- **PWA Installation**: Install on any platform

### 3. Data Portability

- **Export Formats**: JSON, CSV, Markdown
- **Import Support**: Import from other journaling apps
- **Backup & Restore**: Complete backup system
- **Migration Tools**: Easy data migration

## Future Features

### 1. Planned Enhancements

- **Collaborative Journaling**: Share entries with trusted contacts
- **Advanced Analytics**: Deeper insights and patterns
- **Voice Commands**: Voice-controlled navigation
- **Smart Reminders**: Intelligent reminder system

### 2. Integration Roadmap

- **Calendar Apps**: Google Calendar, Apple Calendar
- **Note-Taking Apps**: Notion, Obsidian, Roam Research
- **Health Apps**: Apple Health, Google Fit
- **Social Platforms**: Optional social sharing

### 3. AI Features

- **Content Analysis**: Sentiment analysis and insights
- **Writing Assistance**: Grammar and style suggestions
- **Smart Summaries**: Automatic entry summaries
- **Pattern Recognition**: Identify writing patterns

## User Benefits

### 1. Privacy & Security
- **Complete Privacy**: Your data never leaves your device
- **No Tracking**: No analytics or user tracking
- **Encryption**: Military-grade encryption
- **GDPR Compliant**: Full data control

### 2. Convenience & Ease
- **Quick Access**: Start journaling in seconds
- **Voice Input**: Hands-free journaling
- **Offline Use**: Works anywhere, anytime
- **Cross-Platform**: Use on any device

### 3. Personal Growth
- **Daily Prompts**: Structured reflection
- **Progress Tracking**: See your growth over time
- **Habit Building**: Develop consistent journaling
- **Self-Discovery**: Learn about yourself through writing

### 4. Technical Excellence
- **Fast Performance**: Sub-second response times
- **Reliable**: 99.9% uptime
- **Secure**: Enterprise-grade security
- **Modern**: Built with latest web technologies

Heijō Mini-Journal combines **nostalgic design**, **modern technology**, and **privacy-first principles** to create the ultimate personal journaling experience.

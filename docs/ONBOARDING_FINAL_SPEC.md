# Onboarding Flow - Final Specification

## ✅ Confirmed Requirements

### 1. Welcome Screen
- **Title**: "Welcome to Heijō"
- **Tagline**: "micro moments for macro clarity"
- **Format**: Full-screen welcome (slides in)
- **No image**: Text-only welcome screen

### 2. Reminder Setup
- **Frequency Options**: 
  - Daily
  - Weekly
  - Custom (all three options available)
- **Time of Day**: Adaptive (smart time based on user behavior)
- **Message Tone**: Calm
- **Integration**: Save to NotificationManager, also available in Settings

### 3. Feature List
- Use tags for organization
- How to store entries (voice/text)
- How to save entries
- **Nothing else** - keep it simple

### 4. User Name
- **Skip collection** - Use "Welcome to Heijō" (no personalization)

### 5. First-Time Detection
- **Method**: Check if email is new (first signup)
- **Storage**: 
  - Supabase `auth.users` (signup timestamp)
  - `user_metadata.has_seen_onboarding` (boolean)
  - Fallback to localStorage for free tier

### 6. Settings Integration
- **Show in both**: Onboarding AND Settings page
- Users can set up reminders in onboarding
- Users can change preferences later in Settings

## 🎨 Design Spec

### Full-Screen Welcome
- Slides in from top or center
- Covers entire viewport
- PalmPilot 1985 aesthetic
- Mobile-first responsive
- Smooth animation (fade + slide)

### Reminder Setup UI
- Frequency: Three buttons (Daily/Weekly/Custom)
- Time: Adaptive selector (shows "Adaptive" or smart time suggestion)
- Tone: Calm (maybe just a note, or toggle if multiple tones later)
- Toggle: Enable/disable reminders

### Content Sections
1. Welcome header (large, centered)
2. Tagline (smaller, italic, centered)
3. Reminder setup (optional, collapsible or always visible)
4. Feature list (bullet points)
5. "Get Started" button (primary action)

## 🔄 User Flow

1. User signs up with **new email address**
2. System detects first-time user
3. Full-screen welcome slides in
4. User sees:
   - Welcome message + tagline
   - Optional reminder setup
   - Quick feature list
5. User can:
   - Set up reminders (optional)
   - Skip reminders
6. User clicks "Get Started"
7. System saves:
   - Reminder preferences (if set)
   - `has_seen_onboarding = true` in user_metadata
8. Welcome screen slides out
9. User lands on journal page
10. Settings page shows same reminder controls (for later changes)

## 📝 Implementation Notes

### Adaptive Time Detection
- For now, can default to "Evening" (8 PM) or "Morning" (8 AM)
- Future: Analyze user's journaling patterns to suggest best time
- Can show as "Adaptive (8 PM suggested)" initially

### Calm Message Tone
- For now, this is just a preference stored
- Future: Use for notification message tone
- Can show as a note: "Reminders will use a calm, gentle tone"

### First-Time Detection Logic
```typescript
// Check if user is new
const isNewUser = user.created_at && 
  new Date(user.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000); // Signed up in last 24 hours

// OR check metadata
const hasSeenOnboarding = user.user_metadata?.has_seen_onboarding === true;

// Show onboarding if new user and hasn't seen it
if (isNewUser && !hasSeenOnboarding) {
  showOnboarding();
}
```

## 🚀 Ready to Implement

All requirements confirmed. Proceeding with implementation.


# Enhanced Onboarding Flow Implementation Plan

## 🎯 Overview

Enhance the existing `OnboardingModal` component to include:
1. Welcome screen with tagline
2. Reminder setup (frequency & time)
3. Quick feature list
4. Settings integration
5. First-time user detection

## 📋 Requirements

### 1. Welcome Screen Content
- **Title**: "Welcome to Heijō"
- **Tagline**: "micro moments for macro clarity" (⚠️ **NEEDS CONFIRMATION** - user mentioned both versions)
- **Message**: Guide users to Settings to configure the app
- **Feature Highlights**:
  - Use tags for organization
  - How to store entries (voice/text)
  - How to save entries
- **Visual**: User will add an image (placeholder for now)

### 2. Reminder Setup in Onboarding
- **Frequency Options**:
  - Daily
  - Weekly
  - Custom (⚠️ **NEEDS CLARIFICATION** - what does custom mean?)
- **Time of Day**: Time picker (24-hour format)
- **Toggle**: Enable/disable reminders
- **Integration**: Save to notification preferences (use existing `NotificationManager`)

### 3. First-Time User Detection
- Check `localStorage.getItem('heijo-has-seen-onboarding')` or `user_metadata.has_seen_onboarding`
- Show only on first login
- Store completion flag after user dismisses

### 4. Settings Integration
- Reminder settings should also appear in Settings page
- Settings should load saved preferences from onboarding

## 🏗️ Implementation Steps

### Step 1: Update OnboardingModal Component

**File**: `components/OnboardingModal.tsx`

**Features to add**:
1. Welcome section with tagline
2. Reminder setup section:
   - Frequency selector (Daily/Weekly/Custom)
   - Time picker
   - Enable/disable toggle
3. Quick feature list
4. Link to Settings page
5. "Get Started" button that saves preferences

**Design**:
- Modal overlay (centered, matches existing design)
- Multi-step or single scrollable modal
- PalmPilot 1985 aesthetic
- Mobile-first responsive

### Step 2: Integrate with NotificationManager

**File**: `lib/notifications.ts` (already exists)

**Actions**:
- Use existing `NotificationManager.savePreferences()` to save onboarding choices
- Request notification permission if user enables reminders
- Subscribe to push notifications if enabled

### Step 3: Update First-Time Detection

**File**: `app/journal/page.tsx`

**Current logic** (line 56-61):
```typescript
const hasVisited = localStorage.getItem('heijo-has-visited');
if (!hasVisited) {
  setShowOnboarding(true);
  localStorage.setItem('heijo-has-visited', 'true');
}
```

**Update to**:
- Check both localStorage and Supabase (if premium)
- Use consistent key: `heijo-has-seen-onboarding`
- Store in `user_metadata` if premium user

### Step 4: Add Notification Settings to Settings Page

**File**: `components/Settings.tsx`

**Action**:
- Import and add `NotificationSettings` component (already created)
- Add as new section in Settings
- Ensure it loads saved preferences from onboarding

### Step 5: Database Schema (if needed)

**File**: `sql/` (create new migration)

**Action**:
- Ensure `user_notification_preferences` table exists (already created in NOTIFICATIONS_IMPLEMENTATION.md)
- Add `has_seen_onboarding` to `user_metadata` or separate table

## 📝 Detailed Component Spec

### OnboardingModal Component Structure

```typescript
interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string; // Add userId prop
}

// State
- showOnboarding: boolean
- reminderEnabled: boolean
- reminderFrequency: 'daily' | 'weekly' | 'custom'
- reminderTime: string (HH:mm format)
- customDays: number[] (for custom frequency)
```

### Content Sections

#### 1. Welcome Section
```
Welcome to Heijō
micro moments for macro clarity

[Image placeholder - user will add]

Your personal journaling companion
```

#### 2. Quick Feature List
```
Getting Started:
• Voice & Text: Record thoughts or type them out
• Tags: Organize entries with tags for easy search
• Save: Entries auto-save as you write
• Privacy: Your data stays on your device
```

#### 3. Reminder Setup
```
Set Up Reminders (Optional)

Enable reminders to build a consistent journaling habit.

Frequency: [Daily] [Weekly] [Custom]
Time: [Time picker - default 8:00 PM]
[Toggle: Enable Reminders]
```

#### 4. Settings Link
```
Head over to Settings to configure the app to use as needed.
[Link to Settings]
```

#### 5. Get Started Button
```
[Get Started] - Saves preferences and closes modal
```

## 🔄 User Flow

1. User logs in for first time
2. Onboarding modal appears (centered, overlay)
3. User sees welcome message + tagline
4. User can optionally set up reminders
5. User clicks "Get Started"
6. Modal saves:
   - Reminder preferences (if set)
   - `has_seen_onboarding` flag
7. Modal closes
8. User lands on journal page
9. Settings page shows saved reminder preferences

## 🎨 Design Requirements

### Modal Styling
- Matches existing PalmPilot 1985 aesthetic
- Uses existing color palette:
  - `--ui-charcoal` for text
  - `--ui-graphite` for secondary text
  - `--ui-press` for primary actions
  - `--ui-screen` for backgrounds
- Mobile-first responsive
- Max-width: 600px on desktop
- Rounded corners, subtle shadow

### Typography
- Heading: Orbitron font, 1.5rem
- Tagline: Inter font, italic, 1rem
- Body: Inter font, 0.875rem
- Uses existing font size system

### Components
- Time picker: Native HTML5 `<input type="time">`
- Frequency buttons: Chip-style buttons (matches existing design)
- Toggle switches: Match existing Settings toggles
- Buttons: Match existing button styles

## ✅ Implementation Checklist

### Core Features
- [ ] Update OnboardingModal with welcome section
- [ ] Add tagline (confirm exact wording)
- [ ] Add reminder frequency selector (Daily/Weekly/Custom)
- [ ] Add time picker for reminder time
- [ ] Add reminder enable/disable toggle
- [ ] Add quick feature list
- [ ] Add Settings link/button
- [ ] Integrate with NotificationManager
- [ ] Save preferences on "Get Started"
- [ ] Update first-time detection logic

### Settings Integration
- [ ] Ensure NotificationSettings component is added to Settings
- [ ] Test that onboarding preferences load in Settings
- [ ] Test that Settings changes persist

### Testing
- [ ] Test first-time user flow
- [ ] Test reminder setup in onboarding
- [ ] Test Settings integration
- [ ] Test on mobile devices
- [ ] Test with different browsers
- [ ] Test notification permission flow

### Documentation
- [ ] Update component documentation
- [ ] Add user-facing help text
- [ ] Update feature list

## 🚨 Open Questions (Need User Confirmation)

1. **Tagline**: "micro moments for macro clarity" or "mindful moments for macro clarity"?
2. **Custom Frequency**: What should "custom" mean?
   - User selects specific days of week?
   - User sets interval (e.g., every 3 days)?
   - User defines custom schedule?
3. **Image Placement**: Where should the image appear?
   - Top of modal?
   - Background?
   - Side illustration?
4. **Modal Format**: Single scrollable modal or multi-step?
5. **First-Time Detection**: Store in localStorage only, or also Supabase?
6. **Settings Link**: Should it be a button that opens Settings, or just text?

## 📦 Files to Modify

1. `components/OnboardingModal.tsx` - Major update
2. `app/journal/page.tsx` - Update first-time detection
3. `components/Settings.tsx` - Already has NotificationSettings import
4. `lib/notifications.ts` - Already exists, may need minor updates

## 🎯 Next Steps

1. **Get user confirmation** on open questions
2. **Implement OnboardingModal updates**
3. **Test end-to-end flow**
4. **Add image when user provides it**
5. **Deploy and validate**

---

**Status**: Ready for implementation after user confirmation
**Priority**: High (improves user onboarding and retention)
**Estimated Time**: 4-6 hours for full implementation


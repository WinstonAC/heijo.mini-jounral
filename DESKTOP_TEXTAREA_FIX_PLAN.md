# Desktop Textarea Fix Plan

## Problem Analysis

### Current Issue
The desktop textarea is too small and constrained, breaking the intended layout. The textarea should be large and prominent on desktop, filling the available space.

### Root Cause
1. **Mobile changes affected desktop**: Recent mobile optimizations (lines 860-864) added viewport-based heights for mobile, but also changed desktop height to a constrained calculation (line 868)
2. **Height override conflict**: The inline style `height: "clamp(300px, calc((100dvh - 21rem) * 0.85), 440px)"` overrides the flex layout classes (`flex-1 h-full`) that should make the textarea fill available space
3. **Desktop breakpoint**: Mobile detection uses `window.innerWidth < 768`, so desktop is `>= 768px` (md breakpoint)

### Current Code (Problematic)
```typescript
// Line 867-869 in Composer.tsx
: {
    // ✅ DESKTOP: reduced height by ~15-20% for better balance
    height: "clamp(300px, calc((100dvh - 21rem) * 0.85), 440px)",
    transition: "height 0.3s ease",
}
```

### Expected Desktop Behavior
- Textarea should fill available flex space (parent has `flex-1 flex flex-col`)
- Should use `flex-1 h-full` from className (line 846) without height override
- Should be large and prominent, matching the design image
- No max height constraint on desktop

### Expected Mobile Behavior (Keep Current)
- Use viewport-based heights: `minHeight: "45vh", maxHeight: "55vh"`
- This works well for mobile

## Fix Plan

### Step 1: Remove Desktop Height Constraint
- Remove the `height` property from desktop inline styles
- Let flex layout (`flex-1 h-full`) handle desktop sizing
- Keep transition for smooth animations

### Step 2: Verify Breakpoints
- Confirm mobile detection: `< 768px` = mobile
- Confirm desktop: `>= 768px` (md breakpoint)
- Ensure Tailwind classes align with JavaScript detection

### Step 3: Test Desktop Layout
- Verify textarea fills available space
- Verify textarea is large and prominent
- Verify no visual regressions on mobile

## Implementation

### Change Required
```typescript
// BEFORE (Current - Broken)
: {
    // ✅ DESKTOP: reduced height by ~15-20% for better balance
    height: "clamp(300px, calc((100dvh - 21rem) * 0.85), 440px)",
    transition: "height 0.3s ease",
}

// AFTER (Fixed)
: {
    // ✅ DESKTOP: Let flex layout handle sizing (flex-1 h-full from className)
    // No height constraint - fills available space
    transition: "height 0.3s ease",
}
```

### Files to Change
- `components/Composer.tsx` (lines 866-870)

### Testing Checklist
- [ ] Desktop (>= 768px): Textarea fills available space, large and prominent
- [ ] Desktop: No height constraint visible
- [ ] Mobile (< 768px): Viewport-based heights still work (45vh-55vh)
- [ ] Mobile: No regressions from mobile changes
- [ ] Both: Transitions work smoothly

## Notes
- The className already has `flex-1 h-full min-h-0` for desktop (line 846)
- Removing the inline `height` will let flexbox do its job
- Mobile changes are correct and should remain unchanged


# Premium Features & Pricing Documentation

**Last Updated**: 2025-11-05  
**Status**: Implemented & Testing  
**Audience**: Product Managers, Developers, Users

---

## 📊 Quick Reference (For Product Managers)

### Pricing Model
- **Free Tier**: $0/year - Complete functionality, local storage only
- **Premium Tier**: $5/year - Cloud sync across all devices
- **Testing**: Currently free for testing (manual activation)

### Implementation Status
- ✅ Premium toggle in Settings UI
- ✅ Upgrade modal and sync confirmation flow
- ✅ Cloud sync gated behind premium status
- ⏳ Payment integration (Chrome Web Store / App Store) - Coming soon

### Revenue Model
- **ARPU**: $5/year per premium user
- **Target conversion**: 5-10% free-to-paid
- **Market position**: Privacy-first, local-first alternative

---

## Business Model

**Freemium SaaS model** with one premium tier focused on cloud sync and multi-device access.

### Market Positioning
- Privacy-first alternative to mainstream journaling apps
- Local-first by default (differentiates from competitors)
- Premium upsell focused on convenience (multi-device), not core features
- Low-friction upgrade path without restricting free functionality

### Projected Metrics (Year 1)
- Free Users: 10,000-50,000
- Premium Conversion: 5-10% (500-5,000 paying users)
- Annual Revenue: $30,000-$300,000

---

## Free Tier (Local Storage)

### Features
- ✅ **Complete journaling functionality**
  - Voice and text entry
  - Daily prompts
  - Tag system
  - Search and filter
  - Export to CSV
  
- ✅ **Privacy-first architecture**
  - All data stored locally in browser (`localStorage`)
  - Data never leaves your device
  - No cloud access required
  - Works completely offline

- ✅ **No limits**
  - Unlimited entries
  - Unlimited storage (based on device capacity)
  - All features available

### Storage Location
- **Browser**: `localStorage` (key: `heijo-journal-entries`)
- **Encryption**: Optional device-based encryption
- **Backup**: Manual CSV export available

### Use Case
Perfect for users who:
- Value complete privacy
- Use a single device
- Don't need cloud backup
- Want zero cost

---

## Premium Tier (Cloud Sync) - $5/year

### Pricing
- **$5/year** (one-time annual payment)
- **Testing Phase**: Currently free for testing (manual activation)
- **Future**: Payment integration via Chrome Web Store / App Store

### Features
- ✅ **All Free Tier features**
- ✅ **Cloud sync across devices**
  - Access entries from any device
  - Automatic synchronization
  - Real-time updates

- ✅ **Cloud backup**
  - Automatic backup to Supabase
  - Data recovery if device is lost
  - Cross-device consistency

- ✅ **Multi-device access**
  - Sign in on phone, tablet, desktop
  - Entries sync automatically
  - Seamless experience

### Storage Location
- **Primary**: Browser `localStorage` (local-first)
- **Secondary**: Supabase cloud database (sync)
- **Strategy**: Hybrid storage - local-first, cloud backup

### Activation
1. Go to **Settings** → **Consent Settings**
2. Toggle **"Premium Cloud Sync"** ON
3. If not premium: Click "Activate Premium" (free for testing)
4. Choose to sync existing entries or skip
5. New entries automatically sync to cloud

---

## Technical Details

### Premium Status Storage
- **Location**: Supabase `user_metadata.premium` (boolean)
- **Testing**: Manual toggle updates `user_metadata.premium = true`
- **Future**: Platform receipt verification (Chrome/App Store)

### Sync Behavior
- **Local-first**: Entries always save to `localStorage` first
- **Cloud sync**: Only if premium is active
- **Merge strategy**: Local entries prioritized, cloud merged
- **Conflict resolution**: Local version takes precedence

### Data Migration
When upgrading to premium:
- User is prompted: "Sync your existing X entries to the cloud?"
- Options:
  - **Sync Now**: All localStorage entries uploaded to Supabase
  - **Skip**: Only new entries will sync
  - **Cancel**: Premium activation cancelled

### Deactivation
When disabling premium:
- **Warning**: "You have 24 hours to export your data. Access will be revoked after that."
- **Data**: Cloud data remains for 24 hours, then deleted
- **Local**: localStorage entries remain (no deletion)
- **Fallback**: Automatically switches back to local-only mode

### Code Location
- **Premium utilities**: `lib/premium.ts`
  - `checkPremiumStatus()`: Check if user has premium
  - `activatePremium()`: Activate premium (testing)
  - `deactivatePremium()`: Deactivate premium

- **Storage gating**: `lib/store.ts`
  - `HybridStorage.saveEntry()`: Checks premium before Supabase sync
  - `HybridStorage.getEntries()`: Merges local + cloud if premium
  - `HybridStorage.syncLocalEntries()`: Only syncs if premium active

- **UI components**: `components/Settings.tsx`
  - Premium toggle in Settings
  - Upgrade modal
  - Sync confirmation modal

### Premium Check Logic

```typescript
// Check premium status
const premium = user.user_metadata?.premium;
if (premium === true) {
  // Enable Supabase sync
  // Merge cloud and local entries
  // Sync local-only entries to cloud
}
```

### Future Payment Integration

**TODO: When ready for production:**

1. **Chrome Web Store**
   - Use Chrome Payment API
   - Verify purchase receipt
   - Update `user_metadata.premium` based on receipt

2. **App Store**
   - Use App Store in-app purchase API
   - Verify receipt server-side
   - Update `user_metadata.premium` based on receipt

3. **Replace manual activation**
   - Remove free activation button
   - Add payment flow
   - Add receipt verification

---

## User Experience

### Free Tier User Flow
1. Sign up → Free tier (localStorage only)
2. Create entries → Saved to localStorage
3. All features work offline
4. Export to CSV when needed

### Premium Tier User Flow
1. Sign up → Free tier (localStorage only)
2. Create entries → Saved to localStorage
3. Upgrade to Premium → Toggle in Settings
4. Sync existing entries → Prompt to sync
5. Create new entries → Auto-sync to cloud
6. Sign in on other device → Entries appear

### Premium Deactivation Flow
1. Go to Settings → Toggle Premium OFF
2. Warning: "24 hours to export data"
3. Export data (CSV)
4. After 24 hours: Cloud access revoked
5. Falls back to local-only mode

---

## Privacy & Security

### Free Tier
- **Data location**: 100% local (browser)
- **Cloud access**: None
- **Privacy**: Maximum (no data transmission)

### Premium Tier
- **Data location**: Local + Cloud (Supabase)
- **Cloud access**: Authenticated, encrypted
- **Privacy**: Row Level Security (RLS) ensures user isolation
- **Encryption**: Data encrypted in transit (HTTPS)
- **Compliance**: GDPR compliant (export/delete available)

---

## Testing Premium Features

### Manual Activation (Testing Only)

**For Development/Testing:**
1. Sign in to the app
2. Go to **Settings** → **Consent Settings**
3. Toggle **"Premium Cloud Sync"** ON
4. Click **"Activate Premium"** in the modal
5. Premium status is saved to `user_metadata.premium = true`

**Note**: This is for testing only. Production will use payment API verification.

### Testing Checklist
- [ ] Toggle premium ON → Upgrade modal appears
- [ ] Activate premium → Status updates to "Premium: Active"
- [ ] Create entry → Saves to localStorage AND Supabase
- [ ] Sign in on different device → Entries appear
- [ ] Sync existing entries → All localStorage entries uploaded
- [ ] Toggle premium OFF → Warning appears, data export recommended
- [ ] Local storage disabled when premium is ON (mutually exclusive)

---

## Key Decisions Made

1. **Mutually Exclusive Storage**: Local Storage and Premium cannot be ON at the same time
2. **Local-First Approach**: Entries always save locally first, then sync to cloud
3. **Free Testing**: Premium activation is free during testing phase
4. **24-Hour Grace Period**: Users have 24 hours to export data when disabling premium
5. **Pricing**: $5/year (simple, affordable, annual payment)

---

## FAQ

### Q: Can I switch between free and premium?
**A**: Yes, you can toggle premium on/off in Settings. When disabling, you have 24 hours to export your data.

### Q: What happens to my data if I cancel premium?
**A**: Your local data remains. Cloud data is deleted after 24 hours. You can export everything before disabling.

### Q: Is premium required?
**A**: No, premium is completely optional. Free tier has all journaling features.

### Q: How do I activate premium for testing?
**A**: Go to Settings → Premium Cloud Sync → Toggle ON → Activate Premium (free for testing).

### Q: When will payment integration be ready?
**A**: Payment APIs (Chrome Web Store / App Store) will be integrated when ready for production launch.

### Q: Can I use both local storage and cloud sync?
**A**: No, they are mutually exclusive. Premium uses cloud sync, free uses local storage only.

---

## Support

For questions about premium features:
- **GitHub Issues**: https://github.com/WinstonAC/heijo.mini-jounral/issues
- **Support Email**: support@heijo.io

---

**Related Documentation**:
- Product Features: `docs/product/FEATURES.md`
- Architecture: `docs/technical/ARCHITECTURE.md`

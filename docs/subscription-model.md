# Subscription Model - Investor Overview

## Business Model
• Freemium SaaS model
• One premium tier focused on cloud sync and multi-device access

## Pricing Tiers

### Free Tier - $0/month
• Full journaling functionality (voice, text, prompts, tags)
• Local device storage only
• Complete privacy (data never leaves device)
• CSV/JSON export
• Offline-first architecture

### Premium Tier - $5/year
• All free tier features
• Cloud sync across all devices
• Cloud backup and restore
• Access journal from any device
• Automatic synchronization

**Note**: Currently free for testing. Payment integration (Chrome Web Store / App Store) coming soon.

## Revenue Model
• Primary revenue: Monthly/annual subscriptions via Chrome Web Store and App Store
• Target conversion: 5-10% free-to-paid conversion rate
• ARPU: $5/year per premium user
• Estimated churn: <5% monthly (typical for utility apps)

## Market Positioning
• Privacy-first alternative to mainstream journaling apps
• Local-first by default (differentiates from competitors)
• Premium upsell focused on convenience (multi-device), not core features
• Low-friction upgrade path without restricting free functionality

## Implementation Status
• ✅ Premium tier architecture implemented
• ✅ Cloud sync gated behind premium status
• ✅ Premium toggle in Settings UI
• ✅ Upgrade modal and sync confirmation flow
• ✅ Manual premium activation for testing (free)
• ⏳ Payment integration (Chrome Web Store / App Store) - When ready for production
• ⏳ Subscription management dashboard - Future enhancement

See `docs/PREMIUM_FEATURES.md` for detailed documentation.

## Projected Metrics (Year 1)
• Free Users: 10,000-50,000
• Premium Conversion: 5-10% (500-5,000 paying users)
• Monthly Recurring Revenue: $2,500-$25,000
• Annual Revenue: $30,000-$300,000


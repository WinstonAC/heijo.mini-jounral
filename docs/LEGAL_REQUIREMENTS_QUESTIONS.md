# Legal Documents — Clarifying Questions

## Current Status
- ✅ Privacy Policy page exists at `/privacy` (accessible via Settings → Privacy Policy link)
- ❌ Terms of Service page does not exist
- ❌ No Terms link in UI currently

## Do You Need Terms of Service?

**Short answer: Yes, recommended for production apps.**

Reasons:
1. Legal protection (liability, disclaimers)
2. User expectations (usage rules, service availability)
3. App store compliance (if distributing as PWA)
4. GDPR/legal best practices
5. Data handling transparency

---

## Clarifying Questions Before Creating Terms of Service

### 1. Business/Entity Information
- **What is your company/organization name?**
  - [ ] Individual developer
  - [ ] LLC/Corporation (name: _______________)
  - [ ] Other: _______________

- **Contact information for legal notices?**
  - Email: _______________
  - Address (if required by jurisdiction): _______________

### 2. Service Model
- **Is the service free or paid?**
  - [ ] Free (open source/local-first)
  - [ ] Freemium (free tier + premium features)
  - [ ] Subscription-based
  - [ ] One-time purchase

- **If paid, what's the refund policy?**
  - [ ] No refunds
  - [ ] 30-day money-back guarantee
  - [ ] Case-by-case
  - [ ] Other: _______________

### 3. User Restrictions
- **Minimum age requirement?**
  - [ ] 13+ (COPPA compliance)
  - [ ] 16+ (some GDPR requirements)
  - [ ] 18+
  - [ ] No age restriction

- **Prohibited uses?**
  - [ ] Illegal activities
  - [ ] Harassment/abuse
  - [ ] Automated scraping
  - [ ] Commercial resale
  - [ ] Other: _______________

### 4. Service Availability & Liability
- **Service availability guarantee?**
  - [ ] Best-effort (no SLA)
  - [ ] Uptime guarantee (e.g., 99.9%)
  - [ ] "As-is" disclaimer

- **Data loss liability?**
  - [ ] Not liable (user responsibility to backup)
  - [ ] Limited liability (partial refund)
  - [ ] Full liability (replace data)

- **Offline/local-first disclaimer?**
  - [ ] "Service works offline; no uptime guarantee for cloud sync"
  - [ ] "Use Supabase sync at your own risk"

### 5. Intellectual Property
- **Who owns user-created content?**
  - [ ] User retains all rights
  - [ ] Limited license to display/store
  - [ ] Other: _______________

- **Open source license?**
  - [ ] MIT (code)
  - [ ] User data is private, not open source
  - [ ] Other: _______________

### 6. Content Moderation
- **Do you moderate journal entries?**
  - [ ] No moderation (local-only)
  - [ ] If cloud sync enabled, any content rules?
  - [ ] Prohibited content types?

### 7. Privacy Policy Updates
- **How often might privacy policy change?**
  - [ ] Rarely (major changes only)
  - [ ] As needed (with user notification)
  - [ ] Other: _______________

### 8. Jurisdiction & Dispute Resolution
- **What jurisdiction governs?**
  - [ ] United States (specify state: _______________)
  - [ ] EU (specify country: _______________)
  - [ ] Other: _______________

- **Dispute resolution method?**
  - [ ] Binding arbitration
  - [ ] Court system
  - [ ] Mediation first

### 9. Third-Party Services
- **Do you disclose Supabase/other third-party services?**
  - [ ] Yes, list Supabase as optional service
  - [ ] Yes, list all third parties
  - [ ] No disclosure needed (local-first)

### 10. Update Mechanism
- **How do users learn about Terms updates?**
  - [ ] In-app notification on next login
  - [ ] Email notification
  - [ ] Banner on website
  - [ ] Updated date on terms page only

---

## Recommended Structure for Terms Page

Based on common practices, your Terms should include:

1. **Acceptance of Terms** — "By using Heijō, you agree..."
2. **Description of Service** — What Heijō does
3. **User Responsibilities** — Prohibited uses, age requirements
4. **Service Availability** — "Best effort," local-first disclaimers
5. **Intellectual Property** — Who owns what
6. **Privacy** — Link to Privacy Policy
7. **Limitation of Liability** — Data loss, service interruptions
8. **Indemnification** — User protects you from claims
9. **Termination** — You can terminate abusive accounts
10. **Changes to Terms** — How updates are communicated
11. **Governing Law** — Jurisdiction
12. **Contact** — How to reach you

---

## Next Steps

Once you answer these questions, I can:
1. ✅ Create `/app/terms/page.tsx` with full Terms of Service
2. ✅ Add Terms link to footer/login/settings (where appropriate)
3. ✅ Ensure Privacy Policy link works correctly
4. ✅ Add both links to onboarding if desired

**Priority: Medium-High for production launch**


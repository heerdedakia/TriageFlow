# Changelog — TriageFlow Hardening Pass

All notable improvements and architectural changes made across the hardening cycles of TriageFlow.

---

## [Round 3] — Branding, SLA Architecture & Documentation
### Added
- **Changelog**: Introduced [CHANGELOG.md](file:///c:/Users/User/OneDrive/Desktop/secondp/CHANGELOG.md) to preserve the design rationale and update history of the reconstruction.
- **SLA Design Scope Documentation**: Documented the engineering design choice behind limiting transition blocking to `CRITICAL` severity tickets (to prevent workflow gridlock on low-outage bugs while preserving visual SLA status badges).
- **Screenshot Assets**: Added automated script in `scripts/take-screenshots.js` using Puppeteer to capture actual live preview images.

### Changed
- **Renamed Identity Mismatch**: Updated package name in `package.json` to `triageflow`. Renamed all remaining logo tags, default session keys, registration title text, and placeholder examples from "Bugzilla DTR" to "TriageFlow" for complete branding consistency.
- **Seeded Domain Migration**: Migrated all pre-seeded user accounts from `@bugzilla.dev` to `@triageflow.dev` across database seed scripts and front-end displays.

---

## [Round 2] — Reliability UX, A11y & Responsiveness
### Added
- **Next.js Loading Skeletons**: Placed CSS-animated custom skeleton loading states (`loading.tsx`) across all 7 authenticated routes to mimic layouts during page transitions.
- **Next.js Error Boundaries**: Placed client error boundaries (`error.tsx`) on all authenticated routes containing recovery retry actions.
- **Role-Based Responsive Sidebar**: Built a collapsible sidebar drawer component (`ResponsiveLayout.tsx`) with hamburger menu trigger and backdrop overlay supporting viewports below 768px.
- **A11y Landmarks**: Added ARIA accessibility landmarks (`role="group"`, `<nav>`, `<aside>`, `<main>`) and keyboard focus visible overrides in CSS.

---

## [Round 1] — Security Boundaries & SLA Core Engine
### Added
- **IP-Based Token Bucket Rate Limiter**: Implemented a memory-cached token bucket limiter with automatic stale-entry cleanup to prevent brute force login attempts.
- **Secure File Upload Pipeline**: Secured the upload endpoint with authenticated session checks, rate limiting (10 attempts/min), size checks (<4MB), and strict MIME-type file signature validation before storing in Vercel Blob.
- **SLA Core Engine**: Developed deadline calculation helper (`sla.ts`) mapping Severity to resolution windows (Critical = 4h, High = 24h, Medium = 3d, Low = 7d).
- **Workflow State Transition Guard**: Updated the transition engine to block direct closure of breached critical issues until verified through manual QA verification.

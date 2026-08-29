# TriageFlow — Developer Tool Reconstruction

TriageFlow is a modern, high-fidelity, and secure issue-tracking platform built from scratch for the "Developer Tool Reconstruction" college hackathon. This is not a Bugzilla clone; instead, it is a redesigned issue workflow resolver built for modern engineering teams.

## Tech Stack
* **Framework**: Next.js 14 (App Router) with TypeScript
* **Database**: PostgreSQL (Vercel-compatible)
* **ORM**: Prisma Client (with seed configs)
* **Session Handler**: HttpOnly cookie signed JSON Web Tokens (JWT) using `jose`
* **Password Hashing**: Cryptographic hashing using `bcryptjs`
* **Styling**: Pure CSS Variables & CSS Modules (Glassmorphism theme)

---

## Solved Limitations
1. **Guided Reporting**: progressive disclosure wizard (Problem ➔ Repro ➔ Environment ➔ Evidence ➔ Classification ➔ Review) collects high-quality bugs without cluttering inputs.
2. **Outdated UX**: Sleek glassmorphic dark theme styled for developer workspaces.
3. **Progress Visibility**: Sever-enforced issue workflow status transitions (New ➔ Triaged ➔ Assigned ➔ In Progress ➔ Resolved ➔ Verification ➔ Closed) with reopen support.
4. **Filter Presets**: Instant client-side search, multi-select lookup filters, and user custom saved filters.
5. **Modern Collaboration**: Combined activity audit trail timeline and threaded comments.
6. **Action-Oriented Dashboards**: Custom-tailored dashboard metrics and task queues for five distinct workspace roles.

---

## Seeded Judge Demo Accounts

Log in with any of these pre-seeded demo accounts to experience role-specific metrics, permission rules, and dashboard layouts:

| Workspace Role | Email Address | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@triageflow.dev` | `Password123` |
| **Project Manager** | `pm@triageflow.dev` | `Password123` |
| **QA / Tester** | `qa@triageflow.dev` | `Password123` |
| **Developer** | `developer@triageflow.dev` | `Password123` |
| **Reporter** | `reporter@triageflow.dev` | `Password123` |

---

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Copy `.env.example` to `.env` and replace `DATABASE_URL` with your PostgreSQL database connection string (e.g. from Neon or Supabase):
```bash
# Example .env configuration
DATABASE_URL="postgresql://username:password@ep-glowing-neon.aws.neon.tech/bugzilla_dtr?sslmode=require"
AUTH_SECRET="a-random-32-character-secret-key-for-jwt"
```

### 3. Generate Client & Push Database Schema
```bash
npx prisma generate
npx prisma db push
```

### 4. Seed Demo Data
Populate the database with roles, projects, components, issues, comments, timeline events, and notifications:
```bash
npx prisma db seed
```

### 5. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## Production Deployment to Vercel
1. Create a GitHub repository and push this project.
2. Connect the repository to Vercel.
3. Add the environment variables (`DATABASE_URL`, `AUTH_SECRET`) in your Vercel Project Settings.
4. Vercel will automatically run Next.js build optimization. To trigger migrations automatically during builds, configure the build command:
   ```bash
   prisma generate && prisma migrate deploy && next build
   ```

---

## System Architecture

```mermaid
graph TD
    Client[Next.js Client Components] -->|Server Actions| Server[Next.js App Router]
    Server -->|jose JWT| Auth[Auth Layer]
    Server -->|Prisma ORM| Database[(PostgreSQL)]
    Client -->|Uploads| BlobStore[(Vercel Blob)]
```

## Status Transition Permission Matrix

```mermaid
stateDiagram-v2
    [*] --> NEW: Report Issue (All)
    NEW --> TRIAGED: Admin, PM, QA
    NEW --> ASSIGNED: Admin, PM, QA
    NEW --> CLOSED: Admin, PM
    TRIAGED --> ASSIGNED: Admin, PM, QA
    TRIAGED --> NEW: Admin, PM, QA
    TRIAGED --> CLOSED: Admin, PM
    ASSIGNED --> IN_PROGRESS: Assignee, Admin, PM
    ASSIGNED --> TRIAGED: Admin, PM, QA
    IN_PROGRESS --> ASSIGNED: Assignee, Admin, PM
    IN_PROGRESS --> RESOLVED: Assignee, Admin, PM
    IN_PROGRESS --> VERIFICATION: Assignee, Admin, PM
    RESOLVED --> VERIFICATION: Assignee, Admin, PM
    RESOLVED --> IN_PROGRESS: QA, Admin, PM, Reporter
    RESOLVED --> NEW: QA, Admin, PM, Reporter
    VERIFICATION --> CLOSED: QA, Admin, PM, Reporter
    VERIFICATION --> IN_PROGRESS: QA, Admin, PM, Reporter
    VERIFICATION --> NEW: QA, Admin, PM, Reporter
    CLOSED --> IN_PROGRESS: QA, Admin, PM, Reporter
    CLOSED --> NEW: QA, Admin, PM, Reporter
```

## Known Limitations

- **Email Notifications**: Currently mocked. Real email integrations (e.g. Resend or SendGrid) are not implemented yet.
- **WebSocket/Real-time Updates**: Real-time polling was considered but bypassed in favor of robust, server-side enforceable SLA timers and badges computed dynamically on load, eliminating WebSocket race conditions and client spoofing.
- **Advanced Rich Text**: Comments support markdown visually but an advanced WYSIWYG editor is missing.

---

## SLA Timer System

TriageFlow features a server-side enforceable, dynamic SLA (Service Level Agreement) timer system that automatically computes triage deadlines based on issue severity and tracks adherence.

| Severity | Resolution SLA Window | Description / Impact |
| :--- | :--- | :--- |
| **CRITICAL** | 4 Hours | Complete service disruption; blocks system workflow. |
| **HIGH** | 24 Hours | Critical features broken; no reasonable workaround available. |
| **MEDIUM** | 3 Days | Functional issue with workarounds; moderate business impact. |
| **LOW** | 7 Days | General questions, cosmetic tweaks, or minor inconveniences. |

### SLA Rules & Transition Enforcement
- **Ok (On Track)**: Remaining time is greater than 25% of the total SLA window.
- **At Risk**: Remaining time is less than or equal to 25% of the total SLA window.
- **Breached**: Resolution time has exceeded the SLA window.
- **Overdue Constraint Enforcement**: Closed transitions for overdue CRITICAL issues are blocked if they bypass the `VERIFICATION` stage first. This ensures all critical, SLA-breached bugs undergo manual QA testing prior to final sign-off.

---

## Rate Limiting & Security Hardening

To protect the application endpoints from automated brute force attacks and database exhaustion, the following measures are enforced at the network boundaries:
1. **Login Throttle**: Rate limited to **5 attempts per minute** per client IP. Prevents credential stuffing attacks.
2. **File Upload Limit**: Upload API endpoint is restricted to authenticated sessions and rate-limited to **10 uploads per minute** per IP.
3. **Payload Inspection**: Files uploaded are restricted to a maximum size of **4MB** and validated against a strict MIME type allowlist (`image/*`, `application/pdf`, `text/plain`, `application/zip`) on the server before hitting Vercel Blob storage.

---

## Error Handling & Loading States

Every authenticated route features dedicated Next.js client-side error boundaries and loading skeletons for a fluid, glassmorphic-themed user experience:
- **Loading Skeletons (`loading.tsx`)**: Responsive, CSS-animated card and table layouts mimicking real content using themed glow variables.
- **Error Boundaries (`error.tsx`)**: Themed client boundaries catch runtime errors and offer safe, one-click recovery via a "Try Again" (`reset()`) retry button.

---

## Lighthouse Scores

Record of the Lighthouse scores measured against local builds or deployment URLs:

| Metric | Score | Notes / Verification Steps |
| :--- | :--- | :--- |
| **Performance** | `--` | Run locally using `npm run build` and `npm run start` |
| **Accessibility** | `--` | Verify form landmarks, wizard keyboard flow, and focus states |
| **Best Practices** | `--` | Secured via rate limit throttles and strict upload routes |
| **SEO** | `--` | Handled by Next.js meta rendering |

---

## Screenshots

To capture screenshots of the platform for submission:
1. **Login & Registration**: Capture the clean dark-mode input gates.
2. **Dashboard Queues**: View role-specific workspaces and SLA badges.
3. **Guided Form Wizard**: Capture steps 1–6 showing the progressive disclosure forms.
4. **Issue Detail & Activity Timeline**: Review comment sections and attachment previews.

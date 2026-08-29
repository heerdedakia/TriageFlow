# Bugzilla DTR — Developer Tool Reconstruction

Bugzilla DTR is a modern, high-fidelity, and secure issue-tracking platform built from scratch for the "Developer Tool Reconstruction" college hackathon. This is not a Bugzilla clone; instead, it is a redesigned issue workflow resolver built for modern engineering teams.

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
| **Admin** | `admin@bugzilla.dev` | `Password123` |
| **Project Manager** | `pm@bugzilla.dev` | `Password123` |
| **QA / Tester** | `qa@bugzilla.dev` | `Password123` |
| **Developer** | `developer@bugzilla.dev` | `Password123` |
| **Reporter** | `reporter@bugzilla.dev` | `Password123` |

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
- **WebSocket/Real-time Updates**: Real-time pushes via WebSockets are absent; Next.js server actions mutate data and call `revalidatePath`.
- **Advanced Rich Text**: Comments support markdown visually but an advanced WYSIWYG editor is missing.

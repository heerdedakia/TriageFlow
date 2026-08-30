import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function LandingPage() {
  const session = await getSession();
  
  // Redirect to dashboard if already logged in
  if (session) {
    redirect('/dashboard');
  }

  const credentials = [
    { role: 'Admin', email: 'admin@triageflow.dev', pass: 'Password123' },
    { role: 'Project Manager', email: 'pm@triageflow.dev', pass: 'Password123' },
    { role: 'QA / Tester', email: 'qa@triageflow.dev', pass: 'Password123' },
    { role: 'Developer', email: 'developer@triageflow.dev', pass: 'Password123' },
    { role: 'Reporter', email: 'reporter@triageflow.dev', pass: 'Password123' },
  ];

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoBug}>Triage</span>
          <span style={styles.logoDtr}>Flow</span>
        </div>
        <div style={styles.headerLinks}>
          <Link href="/login" style={styles.loginBtn}>Sign In</Link>
          <Link href="/register" style={styles.registerBtn}>Get Started</Link>
        </div>
      </header>

      <main style={styles.main}>
        <section style={styles.hero}>
          <div style={styles.badge}>HACKATHON RECONSTRUCTION</div>
          <h1 style={styles.title}>
            The Issue Workspace for <span style={styles.gradientText}>Modern Engineering</span>
          </h1>
          <p style={styles.subtitle}>
            A complete reconstruction of the classic bug tracker. We solved the complex flows, poor progress visibility, and outdated UX to create a high-fidelity workspace.
          </p>
          <div style={styles.ctaGroup}>
            <Link href="/login" style={styles.primaryCta}>Sign In to Workspace</Link>
            <Link href="/register" style={styles.secondaryCta}>Register New Account</Link>
          </div>
        </section>

        <section style={styles.features}>
          <h2 style={styles.sectionTitle}>Modernizations</h2>
          <div style={styles.grid}>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>1. Guided Reporting</h3>
              <p style={styles.cardDesc}>Progressive disclosure through problem, reproduction, environment, evidence, and classification steps.</p>
            </div>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>2. Modern Developer UX</h3>
              <p style={styles.cardDesc}>A dark-themed, glassmorphic layout styled for developer productivity, clear typography, and responsive menus.</p>
            </div>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>3. Visual Status Lifecycle</h3>
              <p style={styles.cardDesc}>Strict status checks from New, Triaged, Assigned, In Progress, Resolved, Verification, to Closed with Reopen flows.</p>
            </div>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>4. Granular Search & Filters</h3>
              <p style={styles.cardDesc}>Instant text queries combined with project, status, priority, and component tags, plus custom saved filters.</p>
            </div>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>5. Active Dashboards</h3>
              <p style={styles.cardDesc}>Dynamic metrics, bug aging, status breakdowns, and personalized work lists custom-tailored for 5 roles.</p>
            </div>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>6. Modern Collaboration</h3>
              <p style={styles.cardDesc}>Threaded discussions, @mentions, robust attachment handling, and audit timeline tracking for changes.</p>
            </div>
          </div>
        </section>

        <section style={styles.demoSection}>
          <h2 style={styles.sectionTitle}>Hackathon Judge Seed Accounts</h2>
          <p style={styles.demoDesc}>
            Log in with any of these pre-seeded demo accounts to experience the custom-tailored dashboards and role permissions:
          </p>
          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={styles.tableTh}>Workspace Role</th>
                  <th style={styles.tableTh}>Email Address</th>
                  <th style={styles.tableTh}>Password</th>
                </tr>
              </thead>
              <tbody>
                {credentials.map((cred) => (
                  <tr key={cred.role} style={styles.tableRow}>
                    <td style={styles.tableTdRole}>{cred.role}</td>
                    <td style={styles.tableTdEmail}><code>{cred.email}</code></td>
                    <td style={styles.tableTdPass}><code>{cred.pass}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <footer style={styles.footer}>
        <p>© 2026 Developer Tool Reconstruction: TriageFlow. Created for College Hackathon.</p>
      </footer>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 2rem',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '2rem 0',
  },
  logo: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    letterSpacing: '-0.03em',
  },
  logoBug: {
    color: '#ffffff',
  },
  logoDtr: {
    color: '#0d9488',
    marginLeft: '0.2rem',
    background: 'rgba(13, 148, 136, 0.1)',
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.9rem',
  },
  headerLinks: {
    display: 'flex',
    gap: '1rem',
  },
  loginBtn: {
    padding: '0.5rem 1.25rem',
    borderRadius: '8px',
    color: '#ffffff',
    fontWeight: 500,
    background: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  registerBtn: {
    padding: '0.5rem 1.25rem',
    borderRadius: '8px',
    backgroundColor: '#0d9488',
    color: '#ffffff',
    fontWeight: 500,
    boxShadow: '0 0 15px rgba(13, 148, 136, 0.3)',
  },
  main: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6rem',
    padding: '3rem 0',
  },
  hero: {
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '1.5rem',
    maxWidth: '800px',
    margin: '0 auto',
  },
  badge: {
    background: 'linear-gradient(90deg, #0d9488, #10b981)',
    color: '#ffffff',
    fontSize: '0.75rem',
    fontWeight: 700,
    padding: '0.35rem 0.8rem',
    borderRadius: '100px',
    letterSpacing: '0.05em',
    boxShadow: '0 0 20px rgba(13, 148, 136, 0.2)',
  },
  title: {
    fontSize: '3.5rem',
    lineHeight: '1.1',
    fontWeight: 800,
    color: '#ffffff',
    letterSpacing: '-0.04em',
  },
  gradientText: {
    background: 'linear-gradient(90deg, #818cf8, #c084fc)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '1.25rem',
    color: '#9ca3af',
    maxWidth: '650px',
    lineHeight: '1.6',
  },
  ctaGroup: {
    display: 'flex',
    gap: '1rem',
    marginTop: '1rem',
  },
  primaryCta: {
    padding: '0.75rem 2rem',
    borderRadius: '10px',
    backgroundColor: '#0d9488',
    color: '#ffffff',
    fontWeight: 600,
    fontSize: '1.05rem',
    boxShadow: '0 0 25px rgba(13, 148, 136, 0.4)',
  },
  secondaryCta: {
    padding: '0.75rem 2rem',
    borderRadius: '10px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    color: '#ffffff',
    fontWeight: 600,
    fontSize: '1.05rem',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  features: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2.5rem',
  },
  sectionTitle: {
    fontSize: '2rem',
    textAlign: 'center' as const,
    fontWeight: 700,
    color: '#ffffff',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '2rem',
  },
  card: {
    padding: '2rem',
    borderRadius: '12px',
    backgroundColor: 'rgba(17, 19, 28, 0.65)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    backdropFilter: 'blur(12px)',
    transition: 'transform 0.2s ease',
  },
  cardTitle: {
    fontSize: '1.25rem',
    color: '#818cf8',
    marginBottom: '0.75rem',
    fontWeight: 600,
  },
  cardDesc: {
    color: '#9ca3af',
    fontSize: '0.95rem',
    lineHeight: '1.5',
  },
  demoSection: {
    backgroundColor: 'rgba(13, 148, 136, 0.03)',
    border: '1px solid rgba(13, 148, 136, 0.1)',
    borderRadius: '16px',
    padding: '3rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.5rem',
  },
  demoDesc: {
    fontSize: '1.1rem',
    color: '#9ca3af',
    textAlign: 'center' as const,
    maxWidth: '700px',
    margin: '0 auto',
  },
  tableWrapper: {
    overflowX: 'auto' as const,
    marginTop: '1rem',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    textAlign: 'left' as const,
  },
  tableHeaderRow: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  tableTh: {
    padding: '1rem',
    color: '#ffffff',
    fontWeight: 600,
    fontSize: '0.95rem',
  },
  tableRow: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  tableTdRole: {
    padding: '1.2rem 1rem',
    fontWeight: 600,
    color: '#ffffff',
  },
  tableTdEmail: {
    padding: '1.2rem 1rem',
    color: '#10b981',
  },
  tableTdPass: {
    padding: '1.2rem 1rem',
    color: '#9ca3af',
  },
  footer: {
    padding: '3rem 0',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    textAlign: 'center' as const,
    color: '#6b7280',
    fontSize: '0.9rem',
    marginTop: 'auto',
  },
};

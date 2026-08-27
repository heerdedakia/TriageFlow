import Link from 'next/link';
import { registerUser } from '@/app/actions/auth';
import RegisterFormClient from './RegisterFormClient';

export default async function RegisterPage() {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <span style={styles.logoBug}>Bugzilla</span>
          <span style={styles.logoDtr}>DTR</span>
        </div>
        <h1 style={styles.title}>Create your account</h1>
        <p style={styles.subtitle}>Get started with your custom issue tracking workspace</p>

        <RegisterFormClient registerAction={registerUser} />

        <p style={styles.footerLink}>
          Already have an account? <Link href="/login" style={styles.link}>Sign In</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
  },
  card: {
    width: '100%',
    maxWidth: '480px',
    backgroundColor: 'rgba(17, 19, 28, 0.7)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '3rem',
    boxShadow: '0 20px 40px rgba(0,0,0,0.3), 0 0 50px rgba(99, 102, 241, 0.1)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
  },
  logo: {
    fontSize: '1.75rem',
    fontWeight: 'bold',
    letterSpacing: '-0.03em',
    marginBottom: '1.5rem',
  },
  logoBug: {
    color: '#ffffff',
  },
  logoDtr: {
    color: '#6366f1',
    marginLeft: '0.2rem',
    background: 'rgba(99, 102, 241, 0.1)',
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
    fontSize: '1rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#ffffff',
    textAlign: 'center' as const,
    marginBottom: '0.5rem',
  },
  subtitle: {
    fontSize: '0.9rem',
    color: '#9ca3af',
    textAlign: 'center' as const,
    marginBottom: '2rem',
  },
  footerLink: {
    fontSize: '0.9rem',
    color: '#9ca3af',
    textAlign: 'center' as const,
    marginTop: '1.5rem',
  },
  link: {
    color: '#6366f1',
    fontWeight: 500,
  },
};

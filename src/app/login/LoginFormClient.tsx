'use client';

import { useState } from 'react';

interface LoginFormClientProps {
  loginAction: (prevState: any, formData: FormData) => Promise<{ error?: string } | undefined>;
}

export default function LoginFormClient({ loginAction }: LoginFormClientProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);

    const res = await loginAction(null, formData);
    if (res && res.error) {
      setError(res.error);
      setLoading(false);
    }
  };

  const handleFillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123');
    setError(null);
  };

  return (
    <div style={{ width: '100%' }}>
      <form onSubmit={handleSubmit} style={styles.form}>
        {error && <div style={styles.errorAlert} aria-live="assertive" role="alert">{error}</div>}

        <div style={styles.fieldGroup}>
          <label htmlFor="email-input" style={styles.label}>Email Address</label>
          <input
            id="email-input"
            name="email"
            type="email"
            required
            placeholder="e.g. developer@triageflow.dev"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.fieldGroup}>
          <label htmlFor="password-input" style={styles.label}>Password</label>
          <input
            id="password-input"
            name="password"
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={styles.input}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            ...styles.submitBtn,
            opacity: loading ? 0.7 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Verifying...' : 'Sign In'}
        </button>
      </form>

      <div style={styles.divider}>
        <span style={styles.dividerLine}></span>
        <span style={styles.dividerText}>Demo Accounts</span>
        <span style={styles.dividerLine}></span>
      </div>

      <div style={styles.demoButtonsGrid}>
        <button
          type="button"
          onClick={() => handleFillDemo('admin@triageflow.dev')}
          style={styles.demoBtn}
        >
          <span style={styles.demoBtnLabel}>Admin</span>
          <span style={styles.demoBtnEmail}>admin@triageflow.dev</span>
        </button>
        <button
          type="button"
          onClick={() => handleFillDemo('pm@triageflow.dev')}
          style={styles.demoBtn}
        >
          <span style={styles.demoBtnLabel}>PM (Manager)</span>
          <span style={styles.demoBtnEmail}>pm@triageflow.dev</span>
        </button>
        <button
          type="button"
          onClick={() => handleFillDemo('qa@triageflow.dev')}
          style={styles.demoBtn}
        >
          <span style={styles.demoBtnLabel}>QA / Tester</span>
          <span style={styles.demoBtnEmail}>qa@triageflow.dev</span>
        </button>
        <button
          type="button"
          onClick={() => handleFillDemo('developer@triageflow.dev')}
          style={styles.demoBtn}
        >
          <span style={styles.demoBtnLabel}>Developer</span>
          <span style={styles.demoBtnEmail}>developer@triageflow.dev</span>
        </button>
        <button
          type="button"
          onClick={() => handleFillDemo('reporter@triageflow.dev')}
          style={styles.demoBtn}
          // Span 2 columns on mobile if necessary
        >
          <span style={styles.demoBtnLabel}>Reporter</span>
          <span style={styles.demoBtnEmail}>reporter@triageflow.dev</span>
        </button>
      </div>
    </div>
  );
}

const styles = {
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.25rem',
    width: '100%',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.4rem',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: 500,
    color: 'var(--text-muted)',
  },
  input: {
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-main)',
    fontSize: '0.95rem',
    transition: 'border-color 0.2s ease',
  },
  submitBtn: {
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    backgroundColor: 'var(--primary)',
    color: '#ffffff',
    fontWeight: 600,
    fontSize: '1rem',
    border: 'none',
    marginTop: '0.5rem',
    boxShadow: '0 4px 10px rgba(139, 92, 246, 0.15)',
    cursor: 'pointer',
  },
  errorAlert: {
    padding: '0.75rem 1rem',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '8px',
    color: 'var(--danger)',
    fontSize: '0.9rem',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    margin: '1.5rem 0',
  },
  dividerLine: {
    flexGrow: 1,
    height: '1px',
    backgroundColor: 'var(--border-color)',
  },
  dividerText: {
    padding: '0 1rem',
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
    fontWeight: 600,
    letterSpacing: '0.05em',
  },
  demoButtonsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.75rem',
    width: '100%',
  },
  demoBtn: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-start',
    padding: '0.6rem 0.8rem',
    backgroundColor: 'var(--bg-card-hover)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    textAlign: 'left' as const,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  demoBtnLabel: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--text-main)',
  },
  demoBtnEmail: {
    fontSize: '0.65rem',
    color: 'var(--text-muted)',
    marginTop: '0.1rem',
  },
};

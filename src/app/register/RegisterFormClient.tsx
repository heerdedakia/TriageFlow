'use client';

import { useState } from 'react';

interface RegisterFormClientProps {
  registerAction: (prevState: any, formData: FormData) => Promise<{ error?: string } | undefined>;
}

export default function RegisterFormClient({ registerAction }: RegisterFormClientProps) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('REPORTER');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('password', password);
    formData.append('role', role);

    const res = await registerAction(null, formData);
    if (res && res.error) {
      setError(res.error);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      {error && <div style={styles.errorAlert}>{error}</div>}

      <div style={styles.fieldGroup}>
        <label htmlFor="name-input" style={styles.label}>Full Name</label>
        <input
          id="name-input"
          name="name"
          type="text"
          required
          placeholder="e.g. Rachel Reporter"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={styles.input}
        />
      </div>

      <div style={styles.fieldGroup}>
        <label htmlFor="email-input" style={styles.label}>Email Address</label>
        <input
          id="email-input"
          name="email"
          type="email"
          required
          placeholder="e.g. reporter@triageflow.dev"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
        />
      </div>

      <div style={styles.fieldGroup}>
        <label htmlFor="password-input" style={styles.label}>Password (min. 6 chars)</label>
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

      <div style={styles.fieldGroup}>
        <label htmlFor="role-select" style={styles.label}>Select Workspace Role</label>
        <select
          id="role-select"
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          style={styles.select}
        >
          <option value="REPORTER">Reporter</option>
          <option value="DEVELOPER">Developer</option>
          <option value="QA">QA / Tester</option>
          <option value="PROJECT_MANAGER">Project Manager</option>
        </select>
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
        {loading ? 'Creating account...' : 'Create Account'}
      </button>
    </form>
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
    color: '#9ca3af',
  },
  input: {
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    backgroundColor: 'rgba(15, 17, 26, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#ffffff',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },
  select: {
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    backgroundColor: 'rgba(15, 17, 26, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#ffffff',
    fontSize: '0.95rem',
    outline: 'none',
    cursor: 'pointer',
    transition: 'border-color 0.2s ease',
  },
  submitBtn: {
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    backgroundColor: '#6366f1',
    color: '#ffffff',
    fontWeight: 600,
    fontSize: '1rem',
    border: 'none',
    marginTop: '0.5rem',
    boxShadow: '0 0 15px rgba(99, 102, 241, 0.3)',
  },
  errorAlert: {
    padding: '0.75rem 1rem',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '8px',
    color: '#fc8181',
    fontSize: '0.9rem',
  },
};

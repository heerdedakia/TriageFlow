'use client';

import { useState } from 'react';

interface ComponentFormClientProps {
  projectId: string;
  createComponentAction: (prevState: any, formData: FormData) => Promise<{ error?: string; success?: boolean }>;
}

export default function ComponentFormClient({ projectId, createComponentAction }: ComponentFormClientProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('projectId', projectId);

    const res = await createComponentAction(null, formData);
    if (res && res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      setSuccess(true);
      setName('');
      setDescription('');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h3 style={styles.title}>➕ Add Project Component</h3>
      
      {error && <div style={styles.errorAlert}>{error}</div>}
      {success && <div style={styles.successAlert}>Component created successfully!</div>}

      <div style={styles.fieldGroup}>
        <label htmlFor="comp-name" style={styles.label}>Component Name</label>
        <input
          id="comp-name"
          type="text"
          required
          placeholder="e.g. Authentication"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={styles.input}
        />
      </div>

      <div style={styles.fieldGroup}>
        <label htmlFor="comp-desc" style={styles.label}>Description</label>
        <textarea
          id="comp-desc"
          rows={3}
          placeholder="What features fall under this..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={styles.textarea}
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
        {loading ? 'Adding...' : 'Add Component'}
      </button>
    </form>
  );
}

const styles = {
  form: {
    backgroundColor: 'rgba(17, 19, 28, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },
  title: {
    fontSize: '1.1rem',
    fontWeight: 600,
    color: '#ffffff',
    marginBottom: '0.25rem',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.35rem',
  },
  label: {
    fontSize: '0.8rem',
    color: '#9ca3af',
    fontWeight: 500,
  },
  input: {
    padding: '0.6rem 0.8rem',
    borderRadius: '6px',
    backgroundColor: 'rgba(15, 17, 26, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#ffffff',
    fontSize: '0.9rem',
    outline: 'none',
  },
  textarea: {
    padding: '0.6rem 0.8rem',
    borderRadius: '6px',
    backgroundColor: 'rgba(15, 17, 26, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#ffffff',
    fontSize: '0.9rem',
    outline: 'none',
    resize: 'vertical' as const,
  },
  submitBtn: {
    padding: '0.6rem 1rem',
    borderRadius: '6px',
    backgroundColor: '#0d9488',
    color: '#ffffff',
    fontWeight: 600,
    fontSize: '0.9rem',
    border: 'none',
    boxShadow: '0 0 10px rgba(13, 148, 136, 0.2)',
  },
  errorAlert: {
    padding: '0.6rem 0.8rem',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '6px',
    color: '#fc8181',
    fontSize: '0.85rem',
  },
  successAlert: {
    padding: '0.6rem 0.8rem',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: '6px',
    color: '#a7f3d0',
    fontSize: '0.85rem',
  },
};

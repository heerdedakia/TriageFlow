'use client';

import { useEffect } from 'react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AdminError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh', width: '100%' }}>
      <div className="glass-panel" style={{ padding: '3rem', maxWidth: '500px', width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1.5rem', alignItems: 'center' }}>
        <div style={{ fontSize: '3rem' }}>⚠️</div>
        <h2 style={{ color: 'var(--text-main)', fontSize: '1.5rem', fontWeight: 600 }}>Admin Panel Error</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', wordBreak: 'break-word' }}>
          {error.message || 'Failed to load admin controls.'}
        </p>
        <button
          onClick={() => reset()}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#ef4444',
            color: 'var(--text-main)',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'background-color 0.2s ease',
          }}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#dc2626')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#ef4444')}
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';

interface ResponsiveLayoutProps {
  role: string;
  children: React.ReactNode;
}

export default function ResponsiveLayout({ role, children }: ResponsiveLayoutProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Hamburger menu */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
        aria-expanded={isOpen}
        style={styles.hamburger}
      >
        {isOpen ? '✕' : '☰'}
      </button>

      {/* Overlay when sidebar open on mobile */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={styles.overlay}
          aria-hidden="true"
        />
      )}

      <div style={styles.bodyWrapper}>
        {/* Left Sidebar */}
        <aside
          aria-label="Sidebar navigation"
          style={{
            ...styles.sidebar,
            transform: isOpen ? 'translateX(0)' : undefined,
          }}
          className={`sidebar-aside ${isOpen ? 'open' : ''}`}
        >
          <nav aria-label="Main navigation" style={styles.nav}>
            <ul style={styles.navList}>
              <li>
                <Link href="/dashboard" style={styles.navLink} onClick={() => setIsOpen(false)}>
                  <span style={styles.icon}>📊</span> Dashboard
                </Link>
              </li>
              <li>
                <Link href="/projects" style={styles.navLink} onClick={() => setIsOpen(false)}>
                  <span style={styles.icon}>📁</span> Projects & Components
                </Link>
              </li>
              <li>
                <Link href="/issues" style={styles.navLink} onClick={() => setIsOpen(false)}>
                  <span style={styles.icon}>🐛</span> Issues Directory
                </Link>
              </li>
              
              {role === 'ADMIN' && (
                <li>
                  <Link href="/admin" style={styles.navLink} onClick={() => setIsOpen(false)}>
                    <span style={styles.icon}>⚙️</span> Admin Controls
                  </Link>
                </li>
              )}
            </ul>
          </nav>

          <div style={styles.sidebarFooter}>
            <Link href="/issues/new" style={styles.reportBtn} onClick={() => setIsOpen(false)}>
              ➕ Report Issue
            </Link>
          </div>
        </aside>

        {/* Page Content */}
        <main aria-label="Main content" style={styles.mainContent}>
          <div style={styles.contentContainer}>
            {children}
          </div>
        </main>
      </div>
    </>
  );
}

const styles = {
  bodyWrapper: {
    display: 'flex',
    flexGrow: 1,
    height: 'calc(100vh - 64px)',
    position: 'relative' as const,
  },
  hamburger: {
    display: 'none', // Hidden on desktop via media queries
    position: 'fixed' as const,
    top: '16px',
    left: '16px',
    zIndex: 110,
    background: 'rgba(31, 41, 55, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: 'var(--text-main)',
    fontSize: '1.25rem',
    padding: '0.4rem 0.6rem',
    borderRadius: '6px',
    cursor: 'pointer',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(4px)',
  },
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: 80,
  },
  sidebar: {
    width: '240px',
    backgroundColor: '#0d0f17',
    borderRight: '1px solid rgba(255, 255, 255, 0.07)',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'space-between',
    padding: '1.5rem',
    transition: 'transform 0.3s ease, visibility 0.3s ease',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  navList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.5rem',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.75rem 1rem',
    color: 'var(--text-muted)',
    borderRadius: '8px',
    fontWeight: 500,
    fontSize: '0.9rem',
    transition: 'all 0.2s ease',
  },
  icon: {
    marginRight: '0.75rem',
    fontSize: '1.1rem',
  },
  sidebarFooter: {
    marginTop: 'auto',
  },
  reportBtn: {
    display: 'block',
    textAlign: 'center' as const,
    padding: '0.75rem',
    backgroundColor: 'var(--primary)',
    color: 'var(--text-main)',
    fontWeight: 600,
    borderRadius: '8px',
    fontSize: '0.9rem',
    boxShadow: '0 0 15px rgba(139, 92, 246, 0.25)',
  },
  mainContent: {
    flexGrow: 1,
    overflowY: 'auto' as const,
    padding: '2rem',
  },
  contentContainer: {
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
  },
};

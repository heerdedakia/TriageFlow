import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getNotifications } from '@/app/actions/notifications';
import HeaderNav from '@/app/components/HeaderNav';
import Link from 'next/link';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const notifications = await getNotifications();

  return (
    <div style={styles.container}>
      {/* Top Header */}
      <HeaderNav user={session} notifications={notifications} />

      <div style={styles.bodyWrapper}>
        {/* Left Sidebar */}
        <aside style={styles.sidebar}>
          <nav style={styles.nav}>
            <ul style={styles.navList}>
              <li>
                <Link href="/dashboard" style={styles.navLink}>
                  <span style={styles.icon}>📊</span> Dashboard
                </Link>
              </li>
              <li>
                <Link href="/projects" style={styles.navLink}>
                  <span style={styles.icon}>📁</span> Projects & Components
                </Link>
              </li>
              <li>
                <Link href="/issues" style={styles.navLink}>
                  <span style={styles.icon}>🐛</span> Issues Directory
                </Link>
              </li>
              
              {session.role === 'ADMIN' && (
                <li>
                  <Link href="/admin" style={styles.navLink}>
                    <span style={styles.icon}>⚙️</span> Admin Controls
                  </Link>
                </li>
              )}
            </ul>
          </nav>

          <div style={styles.sidebarFooter}>
            <Link href="/issues/new" style={styles.reportBtn}>
              ➕ Report Issue
            </Link>
          </div>
        </aside>

        {/* Page Content */}
        <main style={styles.mainContent}>
          <div style={styles.contentContainer}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    backgroundColor: '#090a0f',
  },
  bodyWrapper: {
    display: 'flex',
    flexGrow: 1,
    height: 'calc(100vh - 64px)',
  },
  sidebar: {
    width: '240px',
    backgroundColor: '#0d0f17',
    borderRight: '1px solid rgba(255, 255, 255, 0.07)',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'space-between',
    padding: '1.5rem',
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
    color: '#9ca3af',
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
    backgroundColor: '#6366f1',
    color: '#ffffff',
    fontWeight: 600,
    borderRadius: '8px',
    fontSize: '0.9rem',
    boxShadow: '0 0 15px rgba(99, 102, 241, 0.25)',
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

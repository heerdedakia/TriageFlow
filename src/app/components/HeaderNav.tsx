'use client';

import { useState } from 'react';
import { logoutUser } from '@/app/actions/auth';
import { markNotificationRead } from '@/app/actions/notifications';
import { SessionUser } from '@/lib/session';
import { Notification } from '@prisma/client';
import Link from 'next/link';

interface HeaderNavProps {
  user: SessionUser;
  notifications: Notification[];
}

export default function HeaderNav({ user, notifications: initialNotifications }: HeaderNavProps) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications || []);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const unreadCount = (notifications || []).filter(n => !n.isRead).length;

  const handleNotifClick = async (id: string) => {
    // Optimistic update
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
    );
    await markNotificationRead(id);
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'ADMIN': return { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)' };
      case 'PROJECT_MANAGER': return { backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' };
      case 'QA': return { backgroundColor: 'rgba(236, 72, 153, 0.15)', color: '#fbcfe8', border: '1px solid rgba(236, 72, 153, 0.3)' };
      case 'DEVELOPER': return { backgroundColor: 'var(--primary-glow)', color: '#ddd6fe', border: '1px solid rgba(139, 92, 246, 0.3)' };
      default: return { backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#bfdbfe', border: '1px solid rgba(59, 130, 246, 0.3)' };
    }
  };

  const formatRole = (role: string) => {
    if (role === 'PROJECT_MANAGER') return 'PM';
    if (role === 'QA') return 'QA Tester';
    return role.charAt(0) + role.slice(1).toLowerCase();
  };

  return (
    <header style={styles.header}>
      <div style={styles.left}>
        <div style={styles.logo}>
          <span style={styles.logoBug}>Triage</span>
          <span style={styles.logoDtr}>Flow</span>
        </div>
      </div>

      <div style={styles.right}>
        {/* Role tag */}
        <span style={{ ...styles.roleTag, ...getRoleBadgeStyle(user.role) }}>
          {formatRole(user.role)}
        </span>

        {/* Notifications Dropdown */}
        <div style={styles.dropdownContainer}>
          <button
            type="button"
            onClick={() => {
              setNotifOpen(!notifOpen);
              setProfileOpen(false);
            }}
            style={styles.navIconBtn}
          >
            🔔
            {unreadCount > 0 && (
              <span style={styles.notifBadge}>{unreadCount}</span>
            )}
          </button>

          {notifOpen && (
            <div style={styles.notifDropdown}>
              <div style={styles.dropdownHeader}>
                <h3>Notifications</h3>
                {unreadCount > 0 && <span style={styles.unreadSummary}>{unreadCount} unread</span>}
              </div>
              <div style={styles.dropdownBody}>
                {!notifications || notifications.length === 0 ? (
                  <p style={styles.emptyNotifs}>No notifications yet.</p>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotifClick(notif.id)}
                      style={{
                        ...styles.notifItem,
                        backgroundColor: notif.isRead ? 'transparent' : 'rgba(139, 92, 246, 0.05)',
                      }}
                    >
                      <p style={styles.notifTitle}>{notif.title}</p>
                      <p style={styles.notifContent}>{notif.content}</p>
                      {notif.link ? (
                        <Link href={notif.link} onClick={() => setNotifOpen(false)} style={styles.notifLink}>
                          View Issue →
                        </Link>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User profile dropdown */}
        <div style={styles.dropdownContainer}>
          <button
            type="button"
            onClick={() => {
              setProfileOpen(!profileOpen);
              setNotifOpen(false);
            }}
            style={styles.profileBtn}
          >
            <div style={styles.avatar}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span style={styles.userName}>{user.name}</span>
            <span style={styles.arrow}>▼</span>
          </button>

          {profileOpen && (
            <div style={styles.profileDropdown}>
              <div style={styles.profileHeader}>
                <p style={styles.profileName}>{user.name}</p>
                <p style={styles.profileEmail}>{user.email}</p>
              </div>
              <div style={styles.profileBody}>
                <form action={logoutUser}>
                  <button type="submit" style={styles.logoutBtn}>
                    🚪 Sign Out
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

const styles = {
  header: {
    height: '64px',
    backgroundColor: '#0d0f17',
    borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 2rem',
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
  },
  left: {
    display: 'flex',
    alignItems: 'center',
  },
  logo: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    letterSpacing: '-0.03em',
  },
  logoBug: {
    color: 'var(--text-main)',
  },
  logoDtr: {
    color: 'var(--primary)',
    marginLeft: '0.2rem',
    background: 'rgba(139, 92, 246, 0.1)',
    padding: '0.15rem 0.4rem',
    borderRadius: '4px',
    fontSize: '0.8rem',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
  },
  roleTag: {
    fontSize: '0.75rem',
    fontWeight: 600,
    padding: '0.2rem 0.6rem',
    borderRadius: '100px',
    letterSpacing: '0.02em',
  },
  dropdownContainer: {
    position: 'relative' as const,
  },
  navIconBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: '1.2rem',
    cursor: 'pointer',
    position: 'relative' as const,
    padding: '0.25rem',
  },
  notifBadge: {
    position: 'absolute' as const,
    top: '-3px',
    right: '-3px',
    backgroundColor: '#ef4444',
    color: 'var(--text-main)',
    fontSize: '0.65rem',
    fontWeight: 'bold',
    borderRadius: '50%',
    width: '15px',
    height: '15px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifDropdown: {
    position: 'absolute' as const,
    top: '40px',
    right: 0,
    width: '320px',
    maxHeight: '400px',
    backgroundColor: '#11131c',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  dropdownHeader: {
    padding: '1rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unreadSummary: {
    fontSize: '0.75rem',
    color: '#f87171',
    fontWeight: 500,
  },
  dropdownBody: {
    overflowY: 'auto' as const,
    maxHeight: '300px',
  },
  emptyNotifs: {
    padding: '2rem 1rem',
    textAlign: 'center' as const,
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
  },
  notifItem: {
    padding: '1rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.25rem',
    transition: 'background-color 0.2s ease',
  },
  notifTitle: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: 'var(--text-main)',
  },
  notifContent: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  notifLink: {
    fontSize: '0.75rem',
    color: 'var(--primary)',
    fontWeight: 500,
    alignSelf: 'flex-end',
    marginTop: '0.25rem',
  },
  profileBtn: {
    background: 'transparent',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    cursor: 'pointer',
    color: 'var(--text-main)',
  },
  avatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary)',
    color: 'var(--text-main)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '0.85rem',
  },
  userName: {
    fontSize: '0.9rem',
    fontWeight: 500,
    color: 'var(--text-main)',
  },
  arrow: {
    fontSize: '0.6rem',
    color: 'var(--text-muted)',
  },
  profileDropdown: {
    position: 'absolute' as const,
    top: '40px',
    right: 0,
    width: '220px',
    backgroundColor: '#11131c',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
    overflow: 'hidden',
  },
  profileHeader: {
    padding: '1rem',
    borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
  },
  profileName: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: 'var(--text-main)',
  },
  profileEmail: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  profileBody: {
    padding: '0.5rem',
  },
  logoutBtn: {
    width: '100%',
    padding: '0.6rem 0.8rem',
    background: 'transparent',
    border: 'none',
    color: '#ef4444',
    textAlign: 'left' as const,
    cursor: 'pointer',
    borderRadius: '8px',
    fontSize: '0.85rem',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
};

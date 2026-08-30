'use client';

import { useState } from 'react';
import { Role } from '@prisma/client';
import { SessionUser } from '@/lib/session';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
}

interface AdminPanelClientProps {
  users: UserRow[];
  currentUser: SessionUser;
  updateRoleAction: (userId: string, role: Role) => Promise<{ error?: string; success?: boolean }>;
}

export default function AdminPanelClient({
  users: initialUsers,
  currentUser,
  updateRoleAction,
}: AdminPanelClientProps) {
  const [users, setUsers] = useState(initialUsers);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleRoleChange = async (userId: string, newRole: Role) => {
    setError(null);
    setSuccessMsg(null);
    setUpdatingId(userId);

    const res = await updateRoleAction(userId, newRole);
    if (res && res.error) {
      setError(res.error);
      setUpdatingId(null);
    } else {
      setUsers(prev =>
        prev.map(u => (u.id === userId ? { ...u, role: newRole } : u))
      );
      setSuccessMsg('User role updated successfully!');
      setUpdatingId(null);
    }
  };

  const getRoleStyle = (role: Role) => {
    switch (role) {
      case 'ADMIN': return { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5' };
      case 'PROJECT_MANAGER': return { backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' };
      case 'QA': return { backgroundColor: 'rgba(236, 72, 153, 0.15)', color: '#fbcfe8' };
      case 'DEVELOPER': return { backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#ddd6fe' };
      default: return { backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#bfdbfe' };
    }
  };

  return (
    <div style={styles.container}>
      {error && <div style={styles.errorAlert}>{error}</div>}
      {successMsg && <div style={styles.successAlert}>{successMsg}</div>}

      <div style={styles.tableCard} className="glass-panel">
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeaderRow}>
                <th style={styles.tableTh}>Name</th>
                <th style={styles.tableTh}>Email Address</th>
                <th style={styles.tableTh}>Current Role</th>
                <th style={styles.tableTh}>Manage Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === currentUser.id;
                return (
                  <tr key={u.id} style={styles.tableRow}>
                    <td style={styles.tableTdName}>
                      {u.name} {isSelf && <span style={styles.selfBadge}>(You)</span>}
                    </td>
                    <td style={styles.tableTdEmail}>{u.email}</td>
                    <td style={styles.tableTd}>
                      <span style={{ ...styles.roleBadge, ...getRoleStyle(u.role) }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={styles.tableTd}>
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                        disabled={isSelf || updatingId === u.id}
                        style={styles.roleSelect}
                      >
                        {Object.values(Role).map((role) => (
                          <option key={role} value={role}>
                            {role.replace('_', ' ')}
                          </option>
                        ))}
                      </select>
                      {updatingId === u.id && <span style={styles.loadingText}>Updating...</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },
  errorAlert: {
    padding: '0.75rem 1rem',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '8px',
    color: '#fc8181',
    fontSize: '0.9rem',
  },
  successAlert: {
    padding: '0.75rem 1rem',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.2)',
    borderRadius: '8px',
    color: '#a7f3d0',
    fontSize: '0.9rem',
  },
  tableCard: {
    backgroundColor: 'rgba(17, 19, 28, 0.65)',
    border: '1px solid rgba(255, 255, 255, 0.07)',
    borderRadius: '12px',
    padding: '1.5rem',
  },
  tableWrapper: {
    overflowX: 'auto' as const,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    textAlign: 'left' as const,
  },
  tableHeaderRow: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  },
  tableTh: {
    padding: '0.75rem 1rem',
    color: '#9ca3af',
    fontWeight: 600,
    fontSize: '0.85rem',
  },
  tableRow: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
  },
  tableTdName: {
    padding: '1rem',
    color: '#ffffff',
    fontWeight: 600,
    fontSize: '0.9rem',
  },
  selfBadge: {
    fontSize: '0.75rem',
    color: '#6b7280',
    fontWeight: 400,
    marginLeft: '0.25rem',
  },
  tableTdEmail: {
    padding: '1rem',
    color: '#9ca3af',
    fontSize: '0.85rem',
  },
  tableTd: {
    padding: '1rem',
    fontSize: '0.85rem',
  },
  roleBadge: {
    fontSize: '0.7rem',
    fontWeight: 600,
    padding: '0.15rem 0.5rem',
    borderRadius: '4px',
  },
  roleSelect: {
    padding: '0.35rem 0.5rem',
    borderRadius: '6px',
    backgroundColor: 'rgba(15, 17, 26, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    color: '#ffffff',
    fontSize: '0.8rem',
    outline: 'none',
  },
  loadingText: {
    marginLeft: '0.5rem',
    fontSize: '0.75rem',
    color: '#0d9488',
  },
};

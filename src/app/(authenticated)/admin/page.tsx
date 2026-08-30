import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import AdminPanelClient from './AdminPanelClient';
import { updateUserRole } from '@/app/actions/users';

export default async function AdminControlsPage() {
  const session = await getSession();
  
  // Extra server side double check for administrator role
  if (!session || session.role !== Role.ADMIN) {
    redirect('/dashboard');
  }

  // Fetch all users details in workspace
  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: { name: 'asc' },
  });

  return (
    <div style={styles.container}>
      <div>
        <h1 style={styles.title}>Admin controls</h1>
        <p style={styles.subtitle}>Manage permissions and assign roles to workspace members</p>
      </div>

      <AdminPanelClient
        users={users}
        currentUser={session}
        updateRoleAction={updateUserRole}
      />
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.5rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 800,
    letterSpacing: '-0.03em',
  },
  subtitle: {
    fontSize: '0.95rem',
    color: 'var(--text-muted)',
  },
};

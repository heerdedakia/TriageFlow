import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getNotifications } from '@/app/actions/notifications';
import HeaderNav from '@/app/components/HeaderNav';
import ResponsiveLayout from '@/app/components/ResponsiveLayout';

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

      <ResponsiveLayout role={session.role}>
        {children}
      </ResponsiveLayout>
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
};

import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import GuidedReportClient from './GuidedReportClient';
import { createIssue } from '@/app/actions/issues';

interface NewIssuePageProps {
  searchParams: {
    projectId?: string;
  };
}

export default async function NewIssuePage({ searchParams }: NewIssuePageProps) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  // Fetch projects and components for classification select menus
  const projects = await db.project.findMany({
    include: {
      components: {
        select: { id: true, name: true, description: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  const initialProjectId = searchParams.projectId || '';

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Guided Bug Reporter</h1>
        <p style={styles.subtitle}>Fill in details step-by-step to file a high-quality, actionable issue report</p>
      </div>

      <div style={styles.formContainer}>
        <GuidedReportClient
          projects={projects}
          initialProjectId={initialProjectId}
          createIssueAction={createIssue}
        />
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.5rem',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '1rem',
  },
  title: {
    fontSize: '2rem',
    fontWeight: 800,
    letterSpacing: '-0.03em',
  },
  subtitle: {
    fontSize: '0.95rem',
    color: '#9ca3af',
  },
  formContainer: {
    // adapts based on styling
  },
};

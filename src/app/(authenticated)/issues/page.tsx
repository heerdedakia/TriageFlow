import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import IssuesSearchClient from './IssuesSearchClient';
import { saveFilter, deleteFilter } from '@/app/actions/filters';

import { Role } from '@prisma/client';

interface IssuesPageProps {
  searchParams: {
    status?: string;
    projectId?: string;
  };
}

export default async function IssuesPage({ searchParams }: IssuesPageProps) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  // Fetch gated list of issues: Reporters only see their own issues
  const issues = await db.issue.findMany({
    where: session.role === Role.REPORTER ? { reporterId: session.id } : undefined,
    include: {
      project: { select: { id: true, name: true, key: true } },
      component: { select: { id: true, name: true } },
      reporter: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Fetch classification lookup arrays
  const projects = await db.project.findMany({
    select: { id: true, name: true, key: true },
    orderBy: { name: 'asc' },
  });

  const components = await db.component.findMany({
    select: { id: true, name: true, projectId: true },
    orderBy: { name: 'asc' },
  });

  const users = await db.user.findMany({
    select: { id: true, name: true, role: true },
    orderBy: { name: 'asc' },
  });

  const savedFilters = await db.savedFilter.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Issues Directory</h1>
          <p style={styles.subtitle}>Grep, search, filter, and save issue presets dynamically</p>
        </div>
      </div>

      <IssuesSearchClient
        initialIssues={issues}
        projects={projects}
        components={components}
        users={users}
        initialSavedFilters={savedFilters}
        currentUser={session}
        saveFilterAction={saveFilter}
        deleteFilterAction={deleteFilter}
        initialStatus={searchParams.status || ''}
        initialProjectId={searchParams.projectId || ''}
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
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
};

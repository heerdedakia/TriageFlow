import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import WorkspaceClient from './WorkspaceClient';
import { transitionIssueStatus, assignIssue } from '@/app/actions/issues';
import { addComment } from '@/app/actions/comments';
import { addAttachment } from '@/app/actions/attachments';
import Link from 'next/link';

interface IssueDetailPageProps {
  params: {
    key: string;
  };
}

export default async function IssueDetailPage({ params }: IssueDetailPageProps) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  // Fetch issue with projects, components, reporter, assignee, comments, activities, and attachments
  const issue = await db.issue.findUnique({
    where: { key: params.key },
    include: {
      project: true,
      component: true,
      reporter: true,
      assignee: true,
      attachments: {
        orderBy: { createdAt: 'desc' },
      },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: {
          author: { select: { name: true, role: true } },
        },
      },
      activities: {
        orderBy: { createdAt: 'asc' },
        include: {
          actor: { select: { name: true } },
        },
      },
    },
  });

  if (!issue) {
    notFound();
  }

  // Enforce Reporter security: can only access issues reported by them
  if (session.role === Role.REPORTER && issue.reporterId !== session.id) {
    redirect('/dashboard');
  }

  // Fetch all users for selection in assignee list
  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      role: true,
    },
    orderBy: { name: 'asc' },
  });

  return (
    <div style={styles.container}>
      {/* Breadcrumbs */}
      <div style={styles.breadcrumbs}>
        <Link href="/issues" style={styles.breadcrumbLink}>Issues</Link>
        <span style={styles.breadcrumbDivider}>/</span>
        <span style={styles.breadcrumbActive}>{issue.key}</span>
      </div>

      <WorkspaceClient
        issue={issue}
        users={users}
        currentUser={session}
        transitionAction={transitionIssueStatus}
        assignAction={assignIssue}
        commentAction={addComment}
        attachmentAction={addAttachment}
      />
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },
  breadcrumbs: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.85rem',
    color: '#9ca3af',
  },
  breadcrumbLink: {
    color: '#818cf8',
  },
  breadcrumbDivider: {
    color: '#4b5563',
  },
  breadcrumbActive: {
    color: '#ffffff',
    fontWeight: 500,
  },
};

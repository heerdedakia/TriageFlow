import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { Role } from '@prisma/client';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import ComponentFormClient from './ComponentFormClient';
import { createComponent } from '@/app/actions/projects';
import { formatDate } from '@/lib/date';

interface ProjectDetailPageProps {
  params: {
    id: string;
  };
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const isAuthorized = session.role === Role.ADMIN || session.role === Role.PROJECT_MANAGER;

  // Fetch project details, components, and all issues inside this project
  const project = await db.project.findUnique({
    where: { id: params.id },
    include: {
      lead: { select: { name: true, email: true } },
      components: {
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { issues: true } },
        },
      },
      issues: {
        where: session.role === Role.REPORTER ? { reporterId: session.id } : undefined,
        orderBy: { createdAt: 'desc' },
        include: {
          component: { select: { name: true } },
          assignee: { select: { name: true } },
          reporter: { select: { name: true } },
        },
      },
    },
  });

  if (!project) {
    notFound();
  }

  return (
    <div style={styles.container}>
      {/* Breadcrumbs */}
      <div style={styles.breadcrumbs}>
        <Link href="/projects" style={styles.breadcrumbLink}>Projects</Link>
        <span style={styles.breadcrumbDivider}>/</span>
        <span style={styles.breadcrumbActive}>{project.name}</span>
      </div>

      {/* Project Banner Header */}
      <div style={styles.banner}>
        <div style={styles.bannerHeader}>
          <span style={styles.keyBadge}>{project.key}</span>
          <h1 style={styles.projectName}>{project.name}</h1>
        </div>
        <p style={styles.bannerDesc}>{project.description || 'No description provided for this project.'}</p>
        <div style={styles.bannerMeta}>
          <span style={styles.metaItem}>👤 Project Lead: <strong>{project.lead.name}</strong> ({project.lead.email})</span>
          <span style={styles.metaDivider}>|</span>
          <span style={styles.metaItem}>🗓️ Created: <strong>{formatDate(project.createdAt)}</strong></span>
        </div>
      </div>

      <div style={styles.layoutGrid}>
        {/* Components list and Issues summary */}
        <div style={styles.mainSection}>
          {/* Components Card */}
          <div style={styles.card}>
            <h2>🧱 Project Components</h2>
            {project.components.length === 0 ? (
              <p style={styles.emptyText}>No components have been registered for this project yet.</p>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.tableTh}>Component Name</th>
                      <th style={styles.tableTh}>Description</th>
                      <th style={{ ...styles.tableTh, textAlign: 'center' }}>Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {project.components.map((comp) => (
                      <tr key={comp.id} style={styles.tableRow}>
                        <td style={styles.compNameTd}>{comp.name}</td>
                        <td style={styles.compDescTd}>{comp.description || 'N/A'}</td>
                        <td style={styles.compIssuesCountTd}>{comp._count.issues}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Project Issues Card */}
          <div style={styles.card}>
            <div style={styles.cardHeaderWithCta}>
              <h2>🐛 Issues in {project.key}</h2>
              <Link href={`/issues/new?projectId=${project.id}`} style={styles.reportCta}>
                Report Bug in Project
              </Link>
            </div>

            {project.issues.length === 0 ? (
              <p style={styles.emptyText}>No issues reported for this project. Keep it up!</p>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.tableTh}>Key</th>
                      <th style={styles.tableTh}>Summary</th>
                      <th style={styles.tableTh}>Component</th>
                      <th style={styles.tableTh}>Status</th>
                      <th style={styles.tableTh}>Severity</th>
                      <th style={styles.tableTh}>Assignee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {project.issues.map((issue) => (
                      <tr key={issue.id} style={styles.tableRow}>
                        <td style={styles.issueKeyTd}>
                          <Link href={`/issues/${issue.key}`} style={styles.issueLink}>
                            {issue.key}
                          </Link>
                        </td>
                        <td style={styles.issueTitleTd}>
                          <Link href={`/issues/${issue.key}`} style={styles.issueTitleLink}>
                            {issue.title}
                          </Link>
                        </td>
                        <td style={styles.issueCompTd}>
                          {issue.component?.name || 'Global'}
                        </td>
                        <td style={styles.issueStatusTd}>
                          <span style={{ ...styles.statusDot, backgroundColor: getStatusColor(issue.status) }}></span>
                          <span>{issue.status}</span>
                        </td>
                        <td style={styles.issueTd}>
                          <span style={{ ...styles.severityBadge, ...getSeverityStyle(issue.severity) }}>
                            {issue.severity}
                          </span>
                        </td>
                        <td style={styles.issueAssigneeTd}>
                          {issue.assignee?.name || <span style={{ color: '#6b7280' }}>Unassigned</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Component Creation */}
        {isAuthorized && (
          <aside style={styles.sidebar}>
            <ComponentFormClient projectId={project.id} createComponentAction={createComponent} />
          </aside>
        )}
      </div>
    </div>
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case 'NEW': return '#3b82f6';
    case 'TRIAGED': return '#06b6d4';
    case 'ASSIGNED': return '#8b5cf6';
    case 'IN_PROGRESS': return '#f59e0b';
    case 'RESOLVED': return '#10b981';
    case 'VERIFICATION': return '#ec4899';
    default: return '#6b7280';
  }
}

function getSeverityStyle(sev: string) {
  switch (sev) {
    case 'CRITICAL': return { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5' };
    case 'HIGH': return { backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' };
    case 'MEDIUM': return { backgroundColor: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee' };
    default: return { backgroundColor: 'rgba(156, 163, 175, 0.15)', color: '#9ca3af' };
  }
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.5rem',
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
  banner: {
    backgroundColor: 'rgba(17, 19, 28, 0.65)',
    border: '1px solid rgba(255, 255, 255, 0.07)',
    borderRadius: '16px',
    padding: '2.5rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
  },
  bannerHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  keyBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    color: '#a5b4fc',
    fontSize: '0.9rem',
    fontWeight: 700,
    padding: '0.25rem 0.65rem',
    borderRadius: '6px',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    letterSpacing: '0.02em',
  },
  projectName: {
    fontSize: '2rem',
    fontWeight: 800,
    margin: 0,
  },
  bannerDesc: {
    color: '#9ca3af',
    fontSize: '1rem',
    lineHeight: '1.6',
    maxWidth: '850px',
  },
  bannerMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    fontSize: '0.8rem',
    color: '#6b7280',
    marginTop: '0.5rem',
  },
  metaItem: {
    color: '#9ca3af',
  },
  metaDivider: {
    color: '#374151',
  },
  layoutGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 320px',
    gap: '2rem',
    alignItems: 'start',
  },
  mainSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2rem',
  },
  sidebar: {
    position: 'sticky' as const,
    top: '80px',
  },
  card: {
    backgroundColor: 'rgba(17, 19, 28, 0.65)',
    border: '1px solid rgba(255, 255, 255, 0.07)',
    borderRadius: '12px',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1.25rem',
  },
  cardHeaderWithCta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportCta: {
    padding: '0.5rem 1rem',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    color: '#a5b4fc',
    border: '1px solid rgba(99, 102, 241, 0.3)',
    borderRadius: '6px',
    fontSize: '0.85rem',
    fontWeight: 500,
    transition: 'all 0.2s ease',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: '0.9rem',
    textAlign: 'center' as const,
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
    transition: 'background-color 0.2s ease',
  },
  compNameTd: {
    padding: '1rem',
    color: '#ffffff',
    fontWeight: 600,
    fontSize: '0.9rem',
  },
  compDescTd: {
    padding: '1rem',
    color: '#9ca3af',
    fontSize: '0.85rem',
  },
  compIssuesCountTd: {
    padding: '1rem',
    textAlign: 'center' as const,
    color: '#ffffff',
    fontWeight: 700,
    fontSize: '0.9rem',
  },
  issueKeyTd: {
    padding: '1rem',
    fontSize: '0.85rem',
  },
  issueLink: {
    color: '#818cf8',
    fontWeight: 600,
  },
  issueTitleTd: {
    padding: '1rem',
    maxWidth: '220px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  issueTitleLink: {
    color: '#ffffff',
    fontWeight: 500,
  },
  issueCompTd: {
    padding: '1rem',
    fontSize: '0.85rem',
    color: '#d1d5db',
  },
  issueStatusTd: {
    padding: '1rem',
    fontSize: '0.85rem',
    color: '#d1d5db',
    display: 'flex',
    alignItems: 'center',
  },
  statusDot: {
    display: 'inline-block',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    marginRight: '0.4rem',
  },
  severityBadge: {
    fontSize: '0.7rem',
    fontWeight: 700,
    padding: '0.15rem 0.4rem',
    borderRadius: '4px',
    textTransform: 'uppercase' as const,
  },
  issueAssigneeTd: {
    padding: '1rem',
    fontSize: '0.85rem',
    color: '#d1d5db',
  },
  issueTd: {
    padding: '1rem',
  },
};

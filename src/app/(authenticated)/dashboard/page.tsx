import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import { Role, IssueStatus, Severity, Priority } from '@prisma/client';
import Link from 'next/link';
import { formatDate } from '@/lib/date';
import { getSlaStatus } from '@/lib/sla';

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  // 1. Fetch Global Stats for Analytics panel
  const totalIssuesCount = await db.issue.count();
  
  // Status breakdown
  const statusCounts = await db.issue.groupBy({
    by: ['status'],
    _count: true,
  });
  
  // Severity breakdown
  const severityCounts = await db.issue.groupBy({
    by: ['severity'],
    _count: true,
  });

  // Calculate Aging
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const newIssuesCount = await db.issue.count({
    where: { createdAt: { gte: oneDayAgo } },
  });

  const midIssuesCount = await db.issue.count({
    where: {
      createdAt: {
        gte: sevenDaysAgo,
        lt: oneDayAgo,
      },
    },
  });

  const oldIssuesCount = await db.issue.count({
    where: { createdAt: { lt: sevenDaysAgo } },
  });

  // Map database groupings to client structures
  const statusMap = statusCounts.reduce((acc, curr) => {
    acc[curr.status] = curr._count;
    return acc;
  }, {} as Record<IssueStatus, number>);

  const severityMap = severityCounts.reduce((acc, curr) => {
    acc[curr.severity] = curr._count;
    return acc;
  }, {} as Record<Severity, number>);

  // Initialize missing statuses with zero
  Object.values(IssueStatus).forEach((status) => {
    if (!statusMap[status]) statusMap[status] = 0;
  });

  // Initialize missing severities with zero
  Object.values(Severity).forEach((sev) => {
    if (!severityMap[sev]) severityMap[sev] = 0;
  });

  // 2. Fetch Role-Specific Dashboard Data
  let roleDashboardContent = null;

  switch (session.role) {
    case Role.ADMIN: {
      const totalUsers = await db.user.count();
      const usersByRole = await db.user.groupBy({
        by: ['role'],
        _count: true,
      });
      const recentIssues = await db.issue.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { project: true, reporter: true },
      });

      roleDashboardContent = (
        <div style={styles.roleDashboard}>
          <div style={styles.metricsGrid}>
            <div style={styles.metricCard}>
              <span style={styles.metricIcon}>👥</span>
              <div>
                <p style={styles.metricVal}>{totalUsers}</p>
                <p style={styles.metricLabel}>Total Users Registered</p>
              </div>
            </div>
            {usersByRole.map((ur) => (
              <div key={ur.role} style={styles.metricCard}>
                <span style={styles.metricIcon}>🛡️</span>
                <div>
                  <p style={styles.metricVal}>{ur._count}</p>
                  <p style={styles.metricLabel}>{ur.role}s</p>
                </div>
              </div>
            ))}
          </div>

          <div style={styles.sectionHeader}>
            <h2>Workspace Overview (Admin)</h2>
            <Link href="/admin" style={styles.headerActionBtn}>Manage User Roles →</Link>
          </div>

          <div style={styles.card}>
            <h3>Recently Reported Workspace Issues</h3>
            <IssueTable issues={recentIssues} />
          </div>
        </div>
      );
      break;
    }

    case Role.PROJECT_MANAGER: {
      const projectsCount = await db.project.count();
      const openIssuesCount = await db.issue.count({
        where: { status: { not: IssueStatus.CLOSED } },
      });
      const unassignedCount = await db.issue.count({
        where: { assigneeId: null, status: { not: IssueStatus.CLOSED } },
      });
      const agingIssues = await db.issue.findMany({
        where: {
          status: { not: IssueStatus.CLOSED },
          updatedAt: { lt: sevenDaysAgo },
        },
        orderBy: { updatedAt: 'asc' },
        take: 5,
        include: { project: true, assignee: true },
      });

      roleDashboardContent = (
        <div style={styles.roleDashboard}>
          <div style={styles.metricsGrid}>
            <div style={styles.metricCard}>
              <span style={styles.metricIcon}>📂</span>
              <div>
                <p style={styles.metricVal}>{projectsCount}</p>
                <p style={styles.metricLabel}>Active Projects</p>
              </div>
            </div>
            <div style={styles.metricCard}>
              <span style={styles.metricIcon}>⚠️</span>
              <div>
                <p style={styles.metricVal}>{openIssuesCount}</p>
                <p style={styles.metricLabel}>Total Open Issues</p>
              </div>
            </div>
            <div style={styles.metricCard}>
              <span style={styles.metricIcon}>👤</span>
              <div>
                <p style={styles.metricVal}>{unassignedCount}</p>
                <p style={styles.metricLabel}>Unassigned Issues</p>
              </div>
            </div>
          </div>

          <div style={styles.sectionHeader}>
            <h2>Project Management Board</h2>
            <Link href="/projects" style={styles.headerActionBtn}>Create New Project →</Link>
          </div>

          <div style={styles.card}>
            <h3>Aging Open Issues (No update in 7+ Days)</h3>
            {agingIssues.length === 0 ? (
              <p style={styles.emptyText}>No aging issues found. All open issues have recent updates!</p>
            ) : (
              <IssueTable issues={agingIssues} />
            )}
          </div>
        </div>
      );
      break;
    }

    case Role.QA: {
      const readyForTest = await db.issue.findMany({
        where: { status: IssueStatus.VERIFICATION },
        include: { project: true, assignee: true },
        orderBy: { updatedAt: 'desc' },
      });

      const reportedByMeCount = await db.issue.count({
        where: { reporterId: session.id },
      });

      roleDashboardContent = (
        <div style={styles.roleDashboard}>
          <div style={styles.metricsGrid}>
            <div style={styles.metricCard}>
              <span style={styles.metricIcon}>🧪</span>
              <div>
                <p style={styles.metricVal}>{readyForTest.length}</p>
                <p style={styles.metricLabel}>Ready for QA Verification</p>
              </div>
            </div>
            <div style={styles.metricCard}>
              <span style={styles.metricIcon}>📝</span>
              <div>
                <p style={styles.metricVal}>{reportedByMeCount}</p>
                <p style={styles.metricLabel}>Bugs Reported By Me</p>
              </div>
            </div>
          </div>

          <div style={styles.sectionHeader}>
            <h2>QA Testing Queue</h2>
            <Link href="/issues/new" style={styles.headerActionBtn}>➕ Guided Bug Report</Link>
          </div>

          <div style={styles.card}>
            <h3>Pending Verification Checks</h3>
            {readyForTest.length === 0 ? (
              <p style={styles.emptyText}>No issues are currently pending testing. Good job!</p>
            ) : (
              <IssueTable issues={readyForTest} />
            )}
          </div>
        </div>
      );
      break;
    }

    case Role.DEVELOPER: {
      const myIssues = await db.issue.findMany({
        where: {
          assigneeId: session.id,
          status: { not: IssueStatus.CLOSED },
        },
        include: { project: true, reporter: true },
        orderBy: { priority: 'desc' },
      });

      const inProgressCount = myIssues.filter(i => i.status === IssueStatus.IN_PROGRESS).length;

      roleDashboardContent = (
        <div style={styles.roleDashboard}>
          <div style={styles.metricsGrid}>
            <div style={styles.metricCard}>
              <span style={styles.metricIcon}>🛠️</span>
              <div>
                <p style={styles.metricVal}>{myIssues.length}</p>
                <p style={styles.metricLabel}>My Assigned Issues</p>
              </div>
            </div>
            <div style={styles.metricCard}>
              <span style={styles.metricIcon}>⚡</span>
              <div>
                <p style={styles.metricVal}>{inProgressCount}</p>
                <p style={styles.metricLabel}>Active In Progress</p>
              </div>
            </div>
          </div>

          <div style={styles.sectionHeader}>
            <h2>My Development Task List</h2>
            <Link href="/issues" style={styles.headerActionBtn}>Browse Issues Directory →</Link>
          </div>

          <div style={styles.card}>
            <h3>My Active Issues</h3>
            {myIssues.length === 0 ? (
              <p style={styles.emptyText}>You have no open assigned issues. Check the inbox to pick up work!</p>
            ) : (
              <IssueTable issues={myIssues} />
            )}
          </div>
        </div>
      );
      break;
    }

    case Role.REPORTER:
    default: {
      const myReported = await db.issue.findMany({
        where: { reporterId: session.id },
        include: { project: true, assignee: true },
        orderBy: { createdAt: 'desc' },
      });

      const activeBugsCount = myReported.filter(i => i.status !== IssueStatus.CLOSED).length;

      roleDashboardContent = (
        <div style={styles.roleDashboard}>
          <div style={styles.metricsGrid}>
            <div style={styles.metricCard}>
              <span style={styles.metricIcon}>🖊️</span>
              <div>
                <p style={styles.metricVal}>{myReported.length}</p>
                <p style={styles.metricLabel}>My Reported Issues</p>
              </div>
            </div>
            <div style={styles.metricCard}>
              <span style={styles.metricIcon}>🔴</span>
              <div>
                <p style={styles.metricVal}>{activeBugsCount}</p>
                <p style={styles.metricLabel}>Active Unresolved Bugs</p>
              </div>
            </div>
          </div>

          <div style={styles.sectionHeader}>
            <h2>My Reported Bugs</h2>
            <Link href="/issues/new" style={styles.headerActionBtn}>Report Another Issue →</Link>
          </div>

          <div style={styles.card}>
            <h3>Issues I Logged</h3>
            {myReported.length === 0 ? (
              <p style={styles.emptyText}>{"You haven't reported any issues yet. Click report above to add one."}</p>
            ) : (
              <IssueTable issues={myReported} />
            )}
          </div>
        </div>
      );
      break;
    }
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.pageTitle}>Welcome back, {session.name}</h1>
      
      {/* Dynamic Analytics & Aging Section */}
      <section style={styles.analyticsSection}>
        <div style={styles.analyticsCard}>
          <h3>Issue Aging</h3>
          <div style={styles.agingGrid}>
            <div style={styles.agingItem}>
              <span style={{ ...styles.agingBadge, backgroundColor: 'rgba(167, 139, 250, 0.15)', color: '#34d399' }}>Last 24h</span>
              <span style={styles.agingVal}>{newIssuesCount}</span>
            </div>
            <div style={styles.agingItem}>
              <span style={{ ...styles.agingBadge, backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>2-7 Days</span>
              <span style={styles.agingVal}>{midIssuesCount}</span>
            </div>
            <div style={styles.agingItem}>
              <span style={{ ...styles.agingBadge, backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5' }}>8+ Days</span>
              <span style={styles.agingVal}>{oldIssuesCount}</span>
            </div>
          </div>
        </div>

        <div style={styles.analyticsCard}>
          <h3>Severity Distribution</h3>
          <div style={styles.statBreakdownGrid}>
            {Object.entries(severityMap).map(([sev, count]) => (
              <div key={sev} style={styles.breakdownItem}>
                <span style={styles.breakdownLabel}>{sev}</span>
                <span style={styles.breakdownVal}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={styles.analyticsCard}>
          <h3>Workflow Status Breakdown</h3>
          <div style={styles.statBreakdownGrid}>
            {Object.entries(statusMap).map(([status, count]) => (
              <Link
                key={status}
                href={`/issues?status=${status}`}
                style={{
                  ...styles.breakdownItem,
                  textDecoration: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={styles.breakdownLabel}>{status.replace('_', ' ')}</span>
                <span style={styles.breakdownVal}>{count}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Role specific view */}
      <section style={styles.dashboardSection}>
        {roleDashboardContent}
      </section>
    </div>
  );
}

function IssueTable({ issues }: { issues: any[] }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW': return '#3b82f6';
      case 'TRIAGED': return '#06b6d4';
      case 'ASSIGNED': return 'var(--primary)';
      case 'IN_PROGRESS': return '#f59e0b';
      case 'RESOLVED': return 'var(--secondary)';
      case 'VERIFICATION': return '#ec4899';
      default: return '#6b7280';
    }
  };

  const getSeverityStyle = (sev: string) => {
    switch (sev) {
      case 'CRITICAL': return { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5' };
      case 'HIGH': return { backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' };
      case 'MEDIUM': return { backgroundColor: 'rgba(6, 182, 212, 0.15)', color: '#22d3ee' };
      default: return { backgroundColor: 'rgba(156, 163, 175, 0.15)', color: 'var(--text-muted)' };
    }
  };

  const getSlaBadge = (status: 'ok' | 'at-risk' | 'breached') => {
    switch (status) {
      case 'breached':
        return <span style={{ ...styles.slaBadge, backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.3)' }}>🔴 BREACHED</span>;
      case 'at-risk':
        return <span style={{ ...styles.slaBadge, backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>🟡 AT RISK</span>;
      case 'ok':
        return <span style={{ ...styles.slaBadge, backgroundColor: 'rgba(167, 139, 250, 0.15)', color: '#34d399', border: '1px solid rgba(167, 139, 250, 0.3)' }}>🟢 ON TRACK</span>;
    }
  };

  return (
    <div style={styles.tableWrapper}>
      <table style={styles.table}>
        <thead>
          <tr style={styles.tableHeaderRow}>
            <th style={styles.tableTh}>ID</th>
            <th style={styles.tableTh}>Summary</th>
            <th style={styles.tableTh}>Status</th>
            <th style={styles.tableTh}>Severity</th>
            <th style={styles.tableTh}>SLA</th>
            <th style={styles.tableTh}>Owner</th>
            <th style={styles.tableTh}>Updated</th>
          </tr>
        </thead>
        <tbody>
          {issues.map((issue) => {
            const slaStatus = getSlaStatus(issue.severity, issue.createdAt);
            return (
              <tr key={issue.id} style={styles.tableRow}>
                <td style={styles.tableTdKey}>
                  <Link href={`/issues/${issue.key}`} style={styles.issueLink}>
                    {issue.key}
                  </Link>
                </td>
                <td style={styles.tableTdSummary}>
                  <Link href={`/issues/${issue.key}`} style={styles.issueLinkText}>
                    {issue.title}
                  </Link>
                </td>
                <td style={styles.tableTd}>
                  <span style={{ ...styles.statusDot, backgroundColor: getStatusColor(issue.status) }}></span>
                  <span style={styles.statusLabel}>{issue.status}</span>
                </td>
                <td style={styles.tableTd}>
                  <span style={{ ...styles.severityBadge, ...getSeverityStyle(issue.severity) }}>
                    {issue.severity}
                  </span>
                </td>
                <td style={styles.tableTd}>
                  {getSlaBadge(slaStatus)}
                </td>
                <td style={styles.tableTdOwner}>
                  {issue.assignee?.name || issue.reporter?.name || 'Unassigned'}
                </td>
                <td style={styles.tableTdDate}>
                  {formatDate(issue.updatedAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2rem',
  },
  pageTitle: {
    fontSize: '2rem',
    fontWeight: 800,
    letterSpacing: '-0.03em',
  },
  analyticsSection: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1.5rem',
  },
  analyticsCard: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },
  agingGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1rem',
  },
  agingItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '0.4rem',
    backgroundColor: 'var(--bg-card-hover)',
    padding: '0.75rem',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.04)',
  },
  agingBadge: {
    fontSize: '0.65rem',
    fontWeight: 700,
    padding: '0.2rem 0.5rem',
    borderRadius: '100px',
    textTransform: 'uppercase' as const,
  },
  agingVal: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--text-main)',
  },
  statBreakdownGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '0.6rem',
    maxHeight: '150px',
    overflowY: 'auto' as const,
    paddingRight: '0.25rem',
  },
  breakdownItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.4rem 0.6rem',
    backgroundColor: 'rgba(255,255,255,0.01)',
    borderRadius: '6px',
    border: '1px solid rgba(255,255,255,0.03)',
  },
  breakdownLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  breakdownVal: {
    fontSize: '0.85rem',
    fontWeight: 700,
    color: 'var(--text-main)',
  },
  dashboardSection: {
    marginTop: '1rem',
  },
  roleDashboard: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2rem',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '1.25rem',
  },
  metricCard: {
    backgroundColor: 'rgba(17, 19, 28, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '10px',
    padding: '1.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  metricIcon: {
    fontSize: '1.8rem',
  },
  metricVal: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--text-main)',
    lineHeight: 1.1,
  },
  metricLabel: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerActionBtn: {
    fontSize: '0.9rem',
    color: '#818cf8',
    fontWeight: 500,
  },
  card: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '2rem',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },
  emptyText: {
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
    textAlign: 'center' as const,
    padding: '2rem',
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
    color: 'var(--text-muted)',
    fontWeight: 600,
    fontSize: '0.85rem',
  },
  tableRow: {
    borderBottom: '1px solid var(--border-color)',
  },
  tableTdKey: {
    padding: '1rem',
    fontSize: '0.9rem',
  },
  tableTdSummary: {
    padding: '1rem',
    maxWidth: '300px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  issueLink: {
    color: '#818cf8',
    fontWeight: 600,
  },
  issueLinkText: {
    color: 'var(--text-main)',
    fontWeight: 500,
  },
  tableTd: {
    padding: '1rem',
    fontSize: '0.9rem',
  },
  statusDot: {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginRight: '0.5rem',
  },
  statusLabel: {
    fontSize: '0.85rem',
    color: 'var(--text-main)',
  },
  severityBadge: {
    fontSize: '0.75rem',
    fontWeight: 600,
    padding: '0.15rem 0.5rem',
    borderRadius: '4px',
    textTransform: 'uppercase' as const,
  },
  tableTdOwner: {
    padding: '1rem',
    fontSize: '0.9rem',
    color: 'var(--text-main)',
  },
  tableTdDate: {
    padding: '1rem',
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
  },
  slaBadge: {
    fontSize: '0.7rem',
    fontWeight: 700,
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
    textTransform: 'uppercase' as const,
    whiteSpace: 'nowrap' as const,
  },
};

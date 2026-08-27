import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { Role } from '@prisma/client';
import Link from 'next/link';
import ProjectFormClient from './ProjectFormClient';
import { createProject } from '@/app/actions/projects';

export default async function ProjectsPage() {
  const session = await getSession();
  const isAuthorized = session && (session.role === Role.ADMIN || session.role === Role.PROJECT_MANAGER);

  // Fetch all projects along with lead details and counts of components/issues
  const projects = await db.project.findMany({
    include: {
      lead: { select: { name: true } },
      _count: {
        select: {
          components: true,
          issues: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Projects & Components</h1>
          <p style={styles.subtitle}>Select a project to manage its components and view all issues</p>
        </div>
      </div>

      <div style={styles.layoutGrid}>
        {/* Project cards list */}
        <div style={styles.projectsListSection}>
          {projects.length === 0 ? (
            <div style={styles.emptyCard}>
              <p style={styles.emptyText}>No projects created yet. Start by adding one!</p>
            </div>
          ) : (
            <div style={styles.projectsGrid}>
              {projects.map((project) => (
                <div key={project.id} style={styles.projectCard}>
                  <div style={styles.cardHeader}>
                    <span style={styles.keyBadge}>{project.key}</span>
                    <h3 style={styles.projectTitle}>
                      <Link href={`/projects/${project.id}`} style={styles.projectLink}>
                        {project.name}
                      </Link>
                    </h3>
                  </div>
                  <p style={styles.description}>{project.description || 'No description provided.'}</p>
                  
                  <div style={styles.cardFooter}>
                    <span style={styles.leadInfo}>👤 Lead: {project.lead.name}</span>
                    <div style={styles.statsGroup}>
                      <span style={styles.statTag} title="Components count">
                        🧱 {project._count.components} Components
                      </span>
                      <span style={styles.statTag} title="Issues count">
                        🐛 {project._count.issues} Issues
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Creation Panel */}
        {isAuthorized && (
          <div style={styles.creationSidebar}>
            <ProjectFormClient createProjectAction={createProject} />
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2rem',
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
  layoutGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 320px',
    gap: '2rem',
    alignItems: 'start',
  },
  projectsListSection: {
    // adapts on mobile
  },
  creationSidebar: {
    position: 'sticky' as const,
    top: '80px',
  },
  projectsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
    gap: '1.5rem',
  },
  projectCard: {
    backgroundColor: 'rgba(17, 19, 28, 0.65)',
    border: '1px solid rgba(255, 255, 255, 0.07)',
    borderRadius: '12px',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'space-between',
    gap: '1rem',
    transition: 'all 0.2s ease',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  keyBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    color: '#a5b4fc',
    fontSize: '0.75rem',
    fontWeight: 700,
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
    letterSpacing: '0.02em',
    border: '1px solid rgba(99, 102, 241, 0.25)',
  },
  projectTitle: {
    fontSize: '1.2rem',
    fontWeight: 650,
    margin: 0,
  },
  projectLink: {
    color: '#ffffff',
  },
  description: {
    fontSize: '0.85rem',
    color: '#9ca3af',
    lineHeight: '1.5',
    minHeight: '40px',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    paddingTop: '0.75rem',
    marginTop: '0.5rem',
  },
  leadInfo: {
    fontSize: '0.8rem',
    color: '#d1d5db',
  },
  statsGroup: {
    display: 'flex',
    gap: '0.5rem',
  },
  statTag: {
    fontSize: '0.75rem',
    color: '#9ca3af',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    padding: '0.15rem 0.4rem',
    borderRadius: '4px',
  },
  emptyCard: {
    padding: '4rem 2rem',
    backgroundColor: 'rgba(17, 19, 28, 0.4)',
    border: '1px dashed rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    textAlign: 'center' as const,
  },
  emptyText: {
    color: '#6b7280',
  },
};

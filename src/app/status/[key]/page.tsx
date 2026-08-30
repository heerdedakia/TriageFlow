import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export default async function PublicStatusPage({ params }: { params: { key: string } }) {
  const issue = await db.issue.findUnique({
    where: { key: params.key.toUpperCase() },
    include: {
      project: true,
      reporter: { select: { name: true } },
    }
  });

  if (!issue) {
    notFound();
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div className="glass-panel" style={{ maxWidth: '600px', width: '100%', padding: '2rem' }}>
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', color: '#ffffff' }}>{issue.key}</h1>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#e5e7eb', fontWeight: 500 }}>{issue.title}</h2>
          </div>
          <span style={{ 
            padding: '0.25rem 0.75rem', 
            borderRadius: '999px', 
            fontSize: '0.85rem', 
            fontWeight: 600,
            backgroundColor: 'rgba(139, 92, 246, 0.1)',
            color: '#818cf8',
            border: '1px solid rgba(139, 92, 246, 0.2)'
          }}>
            {issue.status}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
          <div>
            <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: '#9ca3af' }}>Project</p>
            <p style={{ margin: 0, color: '#f3f4f6' }}>{issue.project.name}</p>
          </div>
          <div>
            <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: '#9ca3af' }}>Reported By</p>
            <p style={{ margin: 0, color: '#f3f4f6' }}>{issue.reporter.name}</p>
          </div>
          <div>
            <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: '#9ca3af' }}>Created</p>
            <p style={{ margin: 0, color: '#f3f4f6' }}>{new Date(issue.createdAt).toLocaleDateString()}</p>
          </div>
          <div>
            <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: '#9ca3af' }}>Last Updated</p>
            <p style={{ margin: 0, color: '#f3f4f6' }}>{new Date(issue.updatedAt).toLocaleDateString()}</p>
          </div>
        </div>

        <div style={{ padding: '1rem', backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#9ca3af', fontWeight: 600 }}>Description</p>
          <p style={{ margin: 0, color: '#d1d5db', lineHeight: 1.6, fontSize: '0.95rem' }}>{issue.description}</p>
        </div>

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <Link href="/login" style={{ color: '#818cf8', textDecoration: 'none', fontSize: '0.9rem' }}>
            Login to view full details
          </Link>
        </div>
      </div>
    </div>
  );
}

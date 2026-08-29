export default function ProjectsLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="skeleton" style={{ height: '2.5rem', width: '180px', borderRadius: '6px' }} />
        <div className="skeleton" style={{ height: '2.5rem', width: '150px', borderRadius: '6px' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: '180px' }}>
            <div className="skeleton" style={{ height: '1.8rem', width: '70%', borderRadius: '4px' }} />
            <div className="skeleton" style={{ height: '1.2rem', width: '40%', borderRadius: '4px' }} />
            <hr style={{ border: '0', borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: 'auto' }} />
            <div className="skeleton" style={{ height: '1rem', width: '80%', borderRadius: '4px' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

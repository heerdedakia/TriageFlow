export default function ProjectDetailLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
      <div className="skeleton" style={{ height: '2.5rem', width: '250px', borderRadius: '6px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Components Panel */}
        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="skeleton" style={{ height: '1.8rem', width: '40%', borderRadius: '4px' }} />
          <hr style={{ border: '0', borderTop: '1px solid rgba(255,255,255,0.07)' }} />
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: '3rem', width: '100%', borderRadius: '6px' }} />
          ))}
        </div>
        {/* Issues Panel */}
        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="skeleton" style={{ height: '1.8rem', width: '40%', borderRadius: '4px' }} />
          <hr style={{ border: '0', borderTop: '1px solid rgba(255,255,255,0.07)' }} />
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: '3.5rem', width: '100%', borderRadius: '6px' }} />
          ))}
        </div>
      </div>
    </div>
  );
}

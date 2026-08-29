export default function IssuesLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="skeleton" style={{ height: '2.5rem', width: '200px', borderRadius: '6px' }} />
        <div className="skeleton" style={{ height: '2.5rem', width: '150px', borderRadius: '6px' }} />
      </div>
      <div style={{ display: 'flex', gap: '2rem' }}>
        {/* Filter sidebar skeleton */}
        <div className="glass-panel" style={{ width: '250px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', flexShrink: 0 }}>
          <div className="skeleton" style={{ height: '1.5rem', width: '80%', borderRadius: '4px' }} />
          <div className="skeleton" style={{ height: '2rem', width: '100%', borderRadius: '4px' }} />
          <div className="skeleton" style={{ height: '1.5rem', width: '60%', borderRadius: '4px' }} />
          <div className="skeleton" style={{ height: '2rem', width: '100%', borderRadius: '4px' }} />
        </div>
        {/* Main list table skeleton */}
        <div className="glass-panel" style={{ flexGrow: 1, padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="skeleton" style={{ height: '2rem', width: '100%', borderRadius: '4px' }} />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton" style={{ height: '3.5rem', width: '100%', borderRadius: '6px' }} />
          ))}
        </div>
      </div>
    </div>
  );
}

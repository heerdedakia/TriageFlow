export default function IssueDetailLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
      <div className="skeleton" style={{ height: '2.5rem', width: '300px', borderRadius: '6px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        {/* Main Content Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="skeleton" style={{ height: '2rem', width: '40%', borderRadius: '4px' }} />
            <div className="skeleton" style={{ height: '6rem', width: '100%', borderRadius: '6px' }} />
          </div>
          <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="skeleton" style={{ height: '1.8rem', width: '20%', borderRadius: '4px' }} />
            <div className="skeleton" style={{ height: '4rem', width: '100%', borderRadius: '6px' }} />
          </div>
        </div>
        {/* Details Sidebar */}
        <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', height: 'fit-content' }}>
          <div className="skeleton" style={{ height: '1.8rem', width: '60%', borderRadius: '4px' }} />
          <hr style={{ border: '0', borderTop: '1px solid rgba(255,255,255,0.07)' }} />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div className="skeleton" style={{ height: '1.2rem', width: '30%', borderRadius: '4px' }} />
              <div className="skeleton" style={{ height: '1.2rem', width: '50%', borderRadius: '4px' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

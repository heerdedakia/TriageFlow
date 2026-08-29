export default function AdminLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
      <div className="skeleton" style={{ height: '2.5rem', width: '220px', borderRadius: '6px' }} />
      <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="skeleton" style={{ height: '1.8rem', width: '30%', borderRadius: '4px' }} />
        <hr style={{ border: '0', borderTop: '1px solid rgba(255,255,255,0.07)' }} />
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="skeleton" style={{ height: '1.2rem', width: '25%', borderRadius: '4px' }} />
            <div className="skeleton" style={{ height: '2rem', width: '150px', borderRadius: '4px' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

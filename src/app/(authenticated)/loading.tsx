export default function AuthenticatedLoading() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="skeleton" style={{ height: '2.5rem', width: '30%', borderRadius: '6px' }} />
        <div className="skeleton" style={{ height: '1.2rem', width: '70%', borderRadius: '4px' }} />
      </div>
    </div>
  );
}

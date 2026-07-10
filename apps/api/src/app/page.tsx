import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GoldOS API',
};

export default function ApiRootPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: '32rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>GoldOS API</h1>
        <p style={{ marginTop: '1rem', color: '#4b5563', lineHeight: 1.6 }}>
          REST API service for the GoldOS enterprise platform. Use <code>/api/health</code> for
          health checks and <code>/api/v1</code> for API metadata.
        </p>
      </div>
    </main>
  );
}

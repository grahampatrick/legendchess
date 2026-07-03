'use client';

/** Last-resort error boundary — the game should never strand a player silently. */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: '#161512', color: '#bababa', fontFamily: 'system-ui' }}>
        <main style={{ maxWidth: 480, margin: '20vh auto', textAlign: 'center' }}>
          <h1 style={{ color: '#efefef' }}>♞ Something broke.</h1>
          <p>The legend is unharmed — your daily progress is saved on this device.</p>
          <button
            onClick={reset}
            style={{
              background: '#629924',
              color: '#fff',
              border: 'none',
              padding: '10px 18px',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}

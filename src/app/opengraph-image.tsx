import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'WeGather — Free Group Scheduling';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #faf5ff 0%, #ede9fe 50%, #f5f3ff 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Calendar icon */}
        <div
          style={{
            width: 120,
            height: 120,
            borderRadius: 28,
            background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 32,
            boxShadow: '0 20px 60px rgba(124,58,237,0.3)',
          }}
        >
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
            <path
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: '#134e4a',
            letterSpacing: '-2px',
            marginBottom: 16,
          }}
        >
          WeGather
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 32,
            color: '#0f766e',
            fontWeight: 500,
            letterSpacing: '-0.5px',
          }}
        >
          Free group scheduling. No accounts needed.
        </div>

        {/* Feature pills */}
        <div
          style={{
            display: 'flex',
            gap: 16,
            marginTop: 48,
          }}
        >
          {['Find a time', 'Everyone marks availability', 'Pick the best slot'].map((label) => (
            <div
              key={label}
              style={{
                padding: '10px 24px',
                background: 'white',
                borderRadius: 100,
                fontSize: 22,
                color: '#134e4a',
                fontWeight: 600,
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}

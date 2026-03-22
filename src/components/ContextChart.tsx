'use client';

interface ContextChartProps {
  bars: number[]; // Array of percentages 0-100
}

export function ContextChart({ bars }: ContextChartProps) {
  return (
    <div className="panel panel-chart">
      <span className="label">Context Window Saturation vs. Generation Speed</span>
      <div
        style={{
          flexGrow: 1,
          border: '1px solid var(--text-main)',
          marginTop: '1rem',
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-end',
          padding: '10px',
          gap: '4px',
          minHeight: '200px',
        }}
      >
        <div style={{ position: 'absolute', top: '10px', left: '10px', fontSize: '0.75rem' }}>
          TOKENS
        </div>
        <div style={{ position: 'absolute', bottom: '-20px', right: '10px', fontSize: '0.75rem' }}>
          TIME
        </div>
        {bars.map((height, i) => (
          <div key={i} className="bar" style={{ height: `${height}%`, width: '20px' }} />
        ))}
      </div>
    </div>
  );
}

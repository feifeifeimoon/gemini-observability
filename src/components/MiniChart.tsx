'use client';

interface MiniChartProps {
  bars: number[]; // Array of percentages 0-100
}

export function MiniChart({ bars }: MiniChartProps) {
  return (
    <div className="mini-chart">
      {bars.map((height, i) => (
        <div key={i} className="bar" style={{ height: `${height}%` }} />
      ))}
    </div>
  );
}

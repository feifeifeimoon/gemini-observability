'use client';

interface DataPoint {
  label: string;
  values: {
    key: string;
    value: number; // percentage 0-100
    color?: string;
  }[];
}

interface TimeSeriesChartProps {
  title: string;
  data: DataPoint[];
  height?: number;
  stacked?: boolean;
}

export function TimeSeriesChart({ title, data, height = 200, stacked = true }: TimeSeriesChartProps) {
  // Find unique keys for legend
  const keys = Array.from(new Set(data.flatMap(d => d.values.map(v => v.key))));
  
  return (
    <div className="panel panel-chart" style={{ gridColumn: 'span 6' }}>
      <span className="label">{title}</span>
      
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
          minHeight: `${height}px`,
        }}
      >
        {data.map((point, i) => (
          <div 
            key={i} 
            className="flex-1 flex flex-col justify-end h-full group"
            style={{ gap: '1px' }}
          >
            {point.values.map((v, j) => (
              <div
                key={j}
                className="w-full relative"
                style={{
                  height: `${v.value}%`,
                  backgroundColor: v.color || 'var(--text-main)',
                  opacity: 0.8 + (j * 0.1),
                }}
              >
                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-black text-white text-[10px] p-1 whitespace-nowrap z-10">
                  {point.label}: {v.key}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      
      {/* Legend */}
      <div className="flex gap-4 mt-4 flex-wrap">
        {keys.map((key, i) => (
          <div key={i} className="flex items-center gap-2 text-[10px] uppercase font-bold">
            <div 
              style={{ 
                width: '8px', 
                height: '8px', 
                backgroundColor: 'var(--text-main)',
                opacity: 0.8 + (i * 0.1) 
              }} 
            />
            {key}
          </div>
        ))}
      </div>
    </div>
  );
}

'use client';

interface DataPoint {
  label: string;
  values: {
    key: string;
    value: number;
  }[];
}

interface TimeSeriesChartProps {
  title: string;
  data: DataPoint[];
  height?: number;
  variant?: 'bar' | 'line' | 'distribution';
  unit?: string;
  className?: string;
  style?: React.CSSProperties;
}

const COLORS = [
  'var(--text-main)', 
  '#f04db4', 
  '#ec5d25', 
  '#829cb6', 
  '#7188a1', 
  '#555555'
];

export function TimeSeriesChart({ title, data, height = 140, variant = 'bar', unit = '', className = '', style = {} }: TimeSeriesChartProps) {
  const keys = Array.from(new Set(data.flatMap(d => d.values.map(v => v.key))));
  const allValues = data.flatMap(d => d.values.map(v => v.value));
  const maxVal = Math.max(...allValues, 1);

  const getLinePath = (key: string) => {
    if (data.length < 2) return '';
    const points = data.map((d, i) => {
      const val = d.values.find(v => v.key === key)?.value || 0;
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - (val / maxVal) * 100;
      return `${x},${y}`;
    });
    return `M ${points.join(' L ')}`;
  };

  return (
    <div className={`panel panel-chart flex flex-col ${className}`} style={{ gridColumn: 'span 6', padding: '12px', ...style }}>
      <div className="flex justify-between items-center mb-2">
        <span className="label" style={{ margin: 0, fontSize: '10px' }}>{title}</span>
        {unit && <span className="text-[9px] opacity-40 uppercase font-bold">{unit}</span>}
      </div>
      
      <div
        style={{
          flexGrow: 1,
          border: '1px solid var(--text-main)',
          position: 'relative',
          padding: '4px',
          height: `${height}px`,
          minHeight: `${height}px`,
        }}
      >
        {variant === 'line' ? (
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full relative z-0">
            {keys.map((key, i) => (
              <path
                key={i}
                d={getLinePath(key)}
                fill="none"
                stroke={COLORS[i % COLORS.length]}
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
                opacity={0.8}
              />
            ))}
          </svg>
        ) : (
          <div className="flex items-end gap-[2px] h-full w-full">
            {data.map((point, i) => (
              <div key={i} className="flex-1 flex flex-row items-end h-full group relative" style={{ gap: '1px' }}>
                {point.values.map((v, j) => {
                  const colorIndex = variant === 'distribution' ? keys.indexOf(v.key) : j;
                  const color = COLORS[Math.max(0, colorIndex) % COLORS.length];
                  
                  return (
                    <div
                      key={j}
                      className="flex-1 relative"
                      style={{
                        height: `${(v.value / maxVal) * 100}%`,
                        backgroundColor: color,
                        opacity: variant === 'distribution' ? 0.9 : 0.6 + (j * 0.2),
                      }}
                    />
                  );
                })}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-6 hidden group-hover:flex flex-col items-center bg-black text-white text-[9px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-20 pointer-events-none">
                  <div className="font-bold border-b border-gray-600 pb-[2px] mb-[2px] w-full text-center">{point.label}</div>
                  {point.values.map((v, j) => (
                     <div key={j} className="flex justify-between w-full gap-2">
                       <span>{variant === 'distribution' ? '' : v.key + ':'}</span>
                       <span>{v.value}{unit}</span>
                     </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="flex justify-between mt-1 text-[8px] opacity-60 uppercase overflow-hidden whitespace-nowrap" style={{ height: '12px' }}>
        {variant !== 'distribution' && data.map((d, i) => {
          const step = Math.max(1, Math.floor(data.length / 5));
          if (i === 0 || i === data.length - 1 || i % step === 0) {
            return <div key={i} className="flex-1 text-center truncate">{d.label}</div>;
          }
           return <div key={i} className="flex-1" />;
        })}
        {variant === 'distribution' && data.map((d, i) => (
          <div key={i} className="flex-1 text-center px-[1px] truncate">{d.label}</div>
        ))}
      </div>
      
      <div className="flex gap-3 mt-2 flex-wrap">
        {keys.map((key, i) => (
          <div key={i} className="flex items-center gap-1 text-[9px] uppercase font-bold opacity-80">
            <div style={{ width: '6px', height: '6px', backgroundColor: COLORS[i % COLORS.length] }} />
            {key}
          </div>
        ))}
      </div>
    </div>
  );
}

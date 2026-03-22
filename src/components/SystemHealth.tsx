interface SystemHealthProps {
  items: {
    label: string;
    value: string;
    isHighlighted?: boolean;
  }[];
}

export function SystemHealth({ items }: SystemHealthProps) {
  return (
    <div className="panel panel-status">
      <span className="label">System Health</span>
      <div style={{ marginTop: '1rem' }}>
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderBottom: isLast ? 'none' : '1px solid #ccc',
                padding: '8px 0',
                marginTop: isLast ? '16px' : undefined,
              }}
            >
              <span style={{ textTransform: 'uppercase' }}>{item.label}</span>
              {item.isHighlighted ? (
                <span className="status-err" style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                  {item.value}
                </span>
              ) : (
                <span style={{ fontWeight: item.label === 'API Connection' ? 'bold' : undefined }}>
                  {item.value}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

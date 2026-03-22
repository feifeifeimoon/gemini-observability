interface LogEntryData {
  time: string;
  message: string;
  status: string;
  isError?: boolean;
}

interface StreamEventLogProps {
  entries: LogEntryData[];
}

export function StreamEventLog({ entries }: StreamEventLogProps) {
  return (
    <div className="panel panel-logs">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span className="label" style={{ margin: 0 }}>Stream Event Log</span>
        <span className="label" style={{ margin: 0, fontFamily: 'var(--font-mono)' }}>
          TAIL -F /VAR/LOG/GEMINI
        </span>
      </div>

      <div style={{ background: '#d4d4d4', padding: '16px', flexGrow: 1, overflowY: 'auto', maxHeight: '400px' }}>
        {entries.map((entry, i) => (
          <div key={i} className="log-entry">
            <span className="log-time">{entry.time}</span>
            <span className="log-message">{entry.message}</span>
            <span className={`log-status ${entry.isError ? 'status-err' : 'status-ok'}`}>
              {entry.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

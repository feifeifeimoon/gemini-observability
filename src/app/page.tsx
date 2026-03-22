import prisma from '@/lib/db';
import { MiniChart } from '@/components/MiniChart';
import { SystemHealth } from '@/components/SystemHealth';
import { StreamEventLog } from '@/components/StreamEventLog';
import { AutoRefresh } from '@/components/AutoRefresh';
import { TimeSeriesChart } from '@/components/TimeSeriesChart';

export default async function DashboardPage() {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const recentSessions = await prisma.session.findMany({
    where: {
      started_at: { gte: twentyFourHoursAgo },
    },
    include: {
      spans: {
        include: {
          tool_calls: true
        }
      },
    },
    orderBy: { started_at: 'desc' },
  });

  // Basic stats
  const totalSessions = recentSessions.length;
  const totalTokens = recentSessions.reduce((acc, s) => acc + s.total_input_tokens + s.total_output_tokens, 0);
  const totalCost = recentSessions.reduce((acc, s) => acc + s.estimated_cost, 0);

  // Time-series bucketing (24 buckets for 24h)
  const bucketCount = 24;
  const bucketSize = (24 * 60 * 60 * 1000) / bucketCount;
  
  const getBucketIdx = (date: Date) => {
    const age = now.getTime() - date.getTime();
    return Math.min(bucketCount - 1, Math.max(0, Math.floor(age / bucketSize)));
  };

  // 1. Sessions Over Time
  const sessionBuckets = new Array(bucketCount).fill(0);
  recentSessions.forEach(s => {
    sessionBuckets[getBucketIdx(s.started_at)]++;
  });
  const sessionData = sessionBuckets.reverse().map((count, i) => ({
    label: `${i}h`,
    values: [{ key: 'Sessions', value: (count / (Math.max(...sessionBuckets, 1))) * 100 }]
  }));

  // 2. Tokens Over Time (Input vs Output)
  const tokenInBuckets = new Array(bucketCount).fill(0);
  const tokenOutBuckets = new Array(bucketCount).fill(0);
  recentSessions.forEach(s => {
    const idx = getBucketIdx(s.started_at);
    tokenInBuckets[idx] += s.total_input_tokens;
    tokenOutBuckets[idx] += s.total_output_tokens;
  });
  const maxTokens = Math.max(...tokenInBuckets, ...tokenOutBuckets, 1);
  const tokenData = tokenInBuckets.map((_, i) => ({
    label: `${i}h`,
    values: [
      { key: 'Input', value: (tokenInBuckets[i] / maxTokens) * 50 },
      { key: 'Output', value: (tokenOutBuckets[i] / maxTokens) * 50 },
    ]
  })).reverse();

  // 3. API Calls by Model
  const modelCalls: Record<string, number[]> = {};
  recentSessions.forEach(s => {
    const idx = getBucketIdx(s.started_at);
    if (!modelCalls[s.model_name]) modelCalls[s.model_name] = new Array(bucketCount).fill(0);
    modelCalls[s.model_name][idx]++;
  });
  const maxModelCalls = Math.max(...Object.values(modelCalls).flatMap(b => b), 1);
  const apiCallData = new Array(bucketCount).fill(0).map((_, i) => ({
    label: `${i}h`,
    values: Object.entries(modelCalls).map(([model, buckets]) => ({
      key: model,
      value: (buckets[i] / maxModelCalls) * 100
    }))
  })).reverse();

  // 4. Tool Calls Over Time
  const toolCallsMap: Record<string, number[]> = {};
  recentSessions.forEach(s => {
    const idx = getBucketIdx(s.started_at);
    s.spans.forEach(sp => {
      sp.tool_calls.forEach(tc => {
        if (!toolCallsMap[tc.name]) toolCallsMap[tc.name] = new Array(bucketCount).fill(0);
        toolCallsMap[tc.name][idx]++;
      });
    });
  });
  const maxToolCalls = Math.max(...Object.values(toolCallsMap).flatMap(b => b), 1);
  const toolCallData = new Array(bucketCount).fill(0).map((_, i) => ({
    label: `${i}h`,
    values: Object.entries(toolCallsMap).map(([tool, buckets]) => ({
      key: tool,
      value: (buckets[i] / maxToolCalls) * 100
    }))
  })).reverse();

  // Error rate calculation
  const totalSpans = recentSessions.reduce((acc, s) => acc + s.spans.length, 0);
  const errorSpans = recentSessions.reduce((acc, s) => acc + s.spans.filter(sp => sp.status === 'ERROR').length, 0);
  const errorRate = totalSpans > 0 ? ((errorSpans / totalSpans) * 100).toFixed(2) : '0.00';

  const healthItems = [
    { label: 'Status', value: 'ACTIVE' },
    { label: 'Sessions (24h)', value: totalSessions.toString() },
    { label: 'Error Rate', value: `${errorRate}%`, isHighlighted: Number(errorRate) > 5 },
    { label: 'Estimated Cost', value: `$${totalCost.toFixed(4)}` },
  ];

  return (
    <>
      <AutoRefresh interval={3000} />
      <div className="ambient-background" />
      <div className="noise-overlay" />

      <main className="dashboard-container">
        {/* Header */}
        <div className="panel panel-header">
          <div className="flex justify-between items-start">
            <div>
              <span className="label">Live Telemetry</span>
              <h1>Gemini CLI Dashboard</h1>
              <p className="block-text opacity-70 mt-2">
                Monitoring local instance metrics and traces via OTLP/HTTP.
              </p>
            </div>
            <div className="text-right">
              <span className="label">Active Model</span>
              <div className="font-bold text-xl uppercase">Gemini 1.5 Multi</div>
            </div>
          </div>
        </div>

        {/* Section: Usage */}
        <div className="col-span-12 mt-4 mb-2">
          <h2 className="text-xs font-black uppercase tracking-widest opacity-50">Usage Metrics</h2>
        </div>

        <div className="panel panel-metric">
          <span className="label">Total Sessions</span>
          <div className="value">{formatNumber(totalSessions)}</div>
          <MiniChart bars={sessionBuckets.slice(0, 12).map(v => (v / Math.max(...sessionBuckets, 1)) * 100)} />
        </div>

        <div className="panel panel-metric">
          <span className="label">Total Tokens</span>
          <div className="value">{formatNumber(totalTokens)}</div>
          <MiniChart bars={tokenInBuckets.slice(0, 12).map(v => (v / Math.max(...tokenInBuckets, 1)) * 100)} />
        </div>

        <TimeSeriesChart title="Sessions Over Time (24h)" data={sessionData} height={120} />
        <TimeSeriesChart title="Token Volume (Input/Output)" data={tokenData} height={120} />

        {/* Section: API & Tools */}
        <div className="col-span-12 mt-8 mb-2">
          <h2 className="text-xs font-black uppercase tracking-widest opacity-50">API & Tool Analytics</h2>
        </div>

        <TimeSeriesChart title="API Calls by Model" data={apiCallData} height={150} />
        <TimeSeriesChart title="Tool Execution Frequency" data={toolCallData} height={150} />

        <div className="panel panel-status" style={{ gridColumn: 'span 4' }}>
          <SystemHealth items={healthItems} />
        </div>

        <div className="panel panel-logs" style={{ gridColumn: 'span 8' }}>
          <span className="label">Recent Activity</span>
          <StreamEventLog entries={buildLogEntries(recentSessions)} />
        </div>
      </main>
    </>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
}

function buildLogEntries(sessions: any[]) {
  return sessions.flatMap(s => 
    s.spans.slice(0, 5).map((sp: any) => ({
      time: new Date(sp.started_at).toLocaleTimeString([], { hour12: false }),
      message: `${sp.name} (${s.model_name})`,
      status: sp.status === 'ERROR' ? '500 ERR' : '200 OK',
      isError: sp.status === 'ERROR'
    }))
  ).sort((a, b) => b.time.localeCompare(a.time)).slice(0, 10);
}

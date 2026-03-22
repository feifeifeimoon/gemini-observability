import prisma from '@/lib/db';
import { MiniChart } from '@/components/MiniChart';
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

  const totalSessions = recentSessions.length;
  const totalTokens = recentSessions.reduce((acc, s) => acc + s.total_input_tokens + s.total_output_tokens, 0);
  const totalCost = recentSessions.reduce((acc, s) => acc + s.estimated_cost, 0);

  const bucketCount = 24;
  const bucketSize = (24 * 60 * 60 * 1000) / bucketCount;
  
  const getBucketIdx = (date: Date) => {
    const age = now.getTime() - date.getTime();
    return Math.min(bucketCount - 1, Math.max(0, Math.floor(age / bucketSize)));
  };

  // --- USAGE MODULE DATA ---
  const sessionsUsageBuckets = new Array(bucketCount).fill(0);
  const tokensUsageBuckets: Record<string, number[]> = { cache: new Array(bucketCount).fill(0), input: new Array(bucketCount).fill(0), output: new Array(bucketCount).fill(0), thought: new Array(bucketCount).fill(0) };
  const linesUsageBuckets: Record<string, number[]> = { added: new Array(bucketCount).fill(0), removed: new Array(bucketCount).fill(0) };

  let totalLinesChanges = 0;

  recentSessions.forEach(s => {
    const idx = getBucketIdx(s.started_at);
    sessionsUsageBuckets[idx]++;
    tokensUsageBuckets.input[idx] += s.total_input_tokens || 0;
    tokensUsageBuckets.output[idx] += s.total_output_tokens || 0;
    
    s.spans.forEach(sp => {
      try {
        const attrs = JSON.parse(sp.attributes || '{}');
        if (attrs['gen_ai.usage.cache_read_tokens']) {
          tokensUsageBuckets.cache[idx] += Number(attrs['gen_ai.usage.cache_read_tokens']) || 0;
        }
        if (attrs.lines_added) {
          const added = Number(attrs.lines_added);
          linesUsageBuckets.added[idx] += added;
          totalLinesChanges += added;
        }
        if (attrs.lines_removed) {
          const removed = Number(attrs.lines_removed);
          linesUsageBuckets.removed[idx] += removed;
          totalLinesChanges += removed;
        }
      } catch (e) {}
    });
  });

  const sessionsUsageData = new Array(bucketCount).fill(0).map((_, i) => ({
    label: `${i}h`,
    values: [{ key: 'sessions', value: sessionsUsageBuckets[i] }]
  })).reverse();

  const tokensUsageData = new Array(bucketCount).fill(0).map((_, i) => ({
    label: `${i}h`,
    values: Object.entries(tokensUsageBuckets).map(([k, buckets]) => ({ key: k, value: buckets[i] }))
  })).reverse();

  const linesUsageData = new Array(bucketCount).fill(0).map((_, i) => ({
    label: `${i}h`,
    values: Object.entries(linesUsageBuckets).map(([k, buckets]) => ({ key: k, value: buckets[i] }))
  })).reverse();

  // 1. API Calls Trends (Line)
  const modelCalls: Record<string, number[]> = {};
  recentSessions.forEach(s => {
    const idx = getBucketIdx(s.started_at);
    if (!modelCalls[s.model_name]) modelCalls[s.model_name] = new Array(bucketCount).fill(0);
    modelCalls[s.model_name][idx]++;
  });
  const apiCallData = new Array(bucketCount).fill(0).map((_, i) => ({
    label: `${i}h`,
    values: Object.entries(modelCalls).map(([model, buckets]) => ({
      key: model,
      value: buckets[i]
    }))
  })).reverse();

  const extractToolName = (sp: any) => {
    if (sp.tool_calls && sp.tool_calls.length > 0 && sp.tool_calls[0].name) {
      return sp.tool_calls[0].name;
    }
    try {
      const attrs = JSON.parse(sp.attributes || '{}');
      return attrs._toolName || attrs['gen_ai.tool.name'] || 'unknown';
    } catch {
      return 'unknown';
    }
  };

  // 2. Tool Calls Distribution (One bar per tool - TOTAL)
  const toolTotals: Record<string, number> = {};
  recentSessions.forEach(s => {
    s.spans.filter(sp => sp.name === 'tool_call').forEach(sp => {
      const toolName = extractToolName(sp);
      toolTotals[toolName] = (toolTotals[toolName] || 0) + 1;
    });
  });
  const toolCallData = Object.entries(toolTotals).map(([name, count]) => ({
    label: name,
    values: [{ key: name, value: count }]
  }));

  // 3. API Latency p99 (Line)
  const apiLatencyBuckets: Record<string, number[][]> = {};
  recentSessions.forEach(s => {
    const idx = getBucketIdx(s.started_at);
    if (!apiLatencyBuckets[s.model_name]) apiLatencyBuckets[s.model_name] = Array.from({ length: bucketCount }, () => []);
    s.spans.filter(sp => sp.name === 'llm_call' || sp.name === 'model.generate').forEach(sp => {
      apiLatencyBuckets[s.model_name][idx].push(sp.duration_ms);
    });
  });
  const apiLatencyData = new Array(bucketCount).fill(0).map((_, i) => ({
    label: `${i}h`,
    values: Object.entries(apiLatencyBuckets).map(([model, buckets]) => ({
      key: model,
      value: calculateP99(buckets[i])
    }))
  })).reverse();

  // 4. Tool Latency p99 (Line)
  const toolLatencyBuckets: Record<string, number[][]> = {};
  recentSessions.forEach(s => {
    const idx = getBucketIdx(s.started_at);
    s.spans.filter(sp => sp.name === 'tool_call').forEach(sp => {
      const toolName = extractToolName(sp);
      if (!toolLatencyBuckets[toolName]) toolLatencyBuckets[toolName] = Array.from({ length: bucketCount }, () => []);
      toolLatencyBuckets[toolName][idx].push(sp.duration_ms);
    });
  });
  const toolLatencyData = new Array(bucketCount).fill(0).map((_, i) => ({
    label: `${i}h`,
    values: Object.entries(toolLatencyBuckets).map(([tool, buckets]) => ({
      key: tool,
      value: calculateP99(buckets[i])
    }))
  })).reverse();

  return (
    <>
      <AutoRefresh interval={3000} />
      <div className="ambient-background" />
      <div className="noise-overlay" />

      <main className="dashboard-container">
        {/* Header */}
        <div className="panel panel-header" style={{ padding: '16px' }}>
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Gemini Observability</h1>
        </div>

        {/* Section: Usage Module */}
        <div style={{ gridColumn: 'span 12', padding: '8px 4px 0 4px' }}>
          <h2 style={{ fontSize: '1.25rem', margin: 0, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '-0.02em' }}>Usage</h2>
        </div>

        {/* Top row: 3 charts */}
        <TimeSeriesChart title="Sessions" data={sessionsUsageData} height={140} variant="line" className="col-span-4" style={{ gridColumn: 'span 4', padding: '12px' }} />
        <TimeSeriesChart title="Tokens" data={tokensUsageData} height={140} variant="line" className="col-span-4" style={{ gridColumn: 'span 4', padding: '12px' }} />
        <TimeSeriesChart title="Lines Changes" data={linesUsageData} height={140} variant="line" className="col-span-4" style={{ gridColumn: 'span 4', padding: '12px' }} />

        {/* Bottom row: 3 metrics */}
        <div className="panel" style={{ gridColumn: 'span 4', padding: '16px 20px' }}>
          <span style={{ fontSize: '0.9rem', color: '#111', fontWeight: 500 }}>Total Sessions</span>
          <div style={{ color: '#1e8e3e', fontSize: '3.5rem', fontWeight: 500, marginTop: '8px', lineHeight: 1 }}>
            {formatNumber(totalSessions)}
          </div>
        </div>
        <div className="panel" style={{ gridColumn: 'span 4', padding: '16px 20px' }}>
          <span style={{ fontSize: '0.9rem', color: '#111', fontWeight: 500 }}>Total Tokens</span>
          <div style={{ color: '#1e8e3e', fontSize: '3.5rem', fontWeight: 500, marginTop: '8px', lineHeight: 1 }}>
            {formatNumber(totalTokens)}
          </div>
        </div>
        <div className="panel relative" style={{ gridColumn: 'span 4', padding: '16px 20px' }}>
          <span style={{ fontSize: '0.9rem', color: '#111', fontWeight: 500 }}>Total Lines Changes</span>
          <div className="absolute top-4 right-4 flex gap-2 text-gray-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
          </div>
          <div style={{ color: '#1e8e3e', fontSize: '3.5rem', fontWeight: 500, marginTop: '8px', lineHeight: 1 }}>
            {formatNumber(totalLinesChanges)}
          </div>
        </div>

        {/* Section: API & Tools */}
        <div style={{ gridColumn: 'span 12', padding: '8px 4px 0 4px' }}>
          <h2 style={{ fontSize: '1.25rem', margin: 0, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '-0.02em' }}>API & Tools</h2>
        </div>

        <TimeSeriesChart title="API Calls" data={apiCallData} height={140} variant="line" unit=" reqs" />
        <TimeSeriesChart title="Tool Distribution" data={toolCallData} height={140} variant="distribution" unit=" total" />
        <TimeSeriesChart title="API Latency (p99)" data={apiLatencyData} height={140} variant="line" unit="ms" />
        <TimeSeriesChart title="Tool Latency (p99)" data={toolLatencyData} height={140} variant="line" unit="ms" />
      </main>
    </>
  );
}

function calculateP99(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * 0.99);
  return sorted[idx];
}

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return num.toString();
}

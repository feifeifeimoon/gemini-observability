import Link from 'next/link';
import { notFound } from 'next/navigation';
import prisma from '@/lib/db';
import { TraceWaterfall } from '@/components/TraceWaterfall';
import { 
  ArrowLeft, 
  Cpu, 
  Clock, 
  DollarSign, 
  Activity, 
  CheckCircle, 
  XCircle,
  Calendar
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const dynamic = 'force-dynamic';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await prisma.session.findUnique({
    where: { id },
    include: {
      spans: {
        include: {
          tool_calls: true
        },
        orderBy: {
          started_at: 'asc'
        }
      }
    }
  });

  if (!session) {
    notFound();
  }

  const hasError = session.spans.some(span => span.status === 'ERROR');
  const status = hasError ? 'error' : 'ok';
  const totalTokens = session.total_input_tokens + session.total_output_tokens;
  
  // Calculate duration from the spans if available
  let sessionDuration = 0;
  if (session.spans.length > 0) {
    const startTimes = session.spans
      .map(s => s.started_at ? new Date(s.started_at).getTime() : null)
      .filter((t): t is number => t !== null);
    
    const endTimes = session.spans
      .map(s => (s.started_at ? new Date(s.started_at).getTime() : 0) + s.duration_ms)
      .filter(t => t > 0);

    if (startTimes.length > 0 && endTimes.length > 0) {
      sessionDuration = Math.max(...endTimes) - Math.min(...startTimes);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans">
      <header className="sticky top-0 z-10 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-black/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/"
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              <ArrowLeft size={20} />
            </Link>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">Session Details</h1>
              <span className="text-xs text-zinc-500 font-mono bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800">
                {session.id}
              </span>
            </div>
          </div>
          
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border",
            status === 'ok' 
              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50" 
              : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50"
          )}>
            {status === 'ok' ? <CheckCircle size={14} /> : <XCircle size={14} />}
            {status === 'ok' ? 'Successful' : 'Failed'}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Summary Header Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-1">
            <div className="flex items-center gap-2 text-zinc-500 text-xs font-medium uppercase tracking-wider">
              <Cpu size={14} />
              Model
            </div>
            <div className="text-lg font-bold truncate">{session.model_name}</div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-1">
            <div className="flex items-center gap-2 text-zinc-500 text-xs font-medium uppercase tracking-wider">
              <Activity size={14} />
              Total Tokens
            </div>
            <div className="text-lg font-bold">{totalTokens.toLocaleString()}</div>
            <div className="text-xs text-zinc-500">
              {session.total_input_tokens.toLocaleString()} in / {session.total_output_tokens.toLocaleString()} out
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-1">
            <div className="flex items-center gap-2 text-zinc-500 text-xs font-medium uppercase tracking-wider">
              <DollarSign size={14} />
              Estimated Cost
            </div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              ${session.estimated_cost.toFixed(4)}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-1">
            <div className="flex items-center gap-2 text-zinc-500 text-xs font-medium uppercase tracking-wider">
              <Clock size={14} />
              Duration
            </div>
            <div className="text-lg font-bold">{sessionDuration}ms</div>
            <div className="flex items-center gap-1 text-xs text-zinc-500">
              <Calendar size={12} />
              {new Date(session.started_at).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Trace Waterfall */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Activity size={18} className="text-blue-500" />
              Execution Trace
            </h2>
          </div>
          
          <TraceWaterfall 
            spans={session.spans.map(s => ({
              ...s,
              started_at: s.started_at ? s.started_at.toISOString() : null
            }))} 
            sessionStartedAt={session.started_at.toISOString()} 
          />
        </section>
      </main>
    </div>
  );
}

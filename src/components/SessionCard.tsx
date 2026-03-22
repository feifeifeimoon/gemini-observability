import Link from 'next/link';
import { CheckCircle, XCircle, Clock, DollarSign, Activity, Cpu } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SessionCardProps {
  session: {
    id: string;
    started_at: Date;
    model_name: string;
    total_input_tokens: number;
    total_output_tokens: number;
    estimated_cost: number;
    _count?: {
      spans: number;
    };
    // We can pass an optional status if we want, or derive it
    status?: 'ok' | 'error';
  };
}

export function SessionCard({ session }: SessionCardProps) {
  const status = session.status || 'ok';
  const totalTokens = session.total_input_tokens + session.total_output_tokens;
  
  return (
    <Link 
      href={`/sessions/${session.id}`}
      className="block p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-blue-500 dark:hover:border-blue-500 transition-colors group"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-full",
            status === 'ok' ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
          )}>
            {status === 'ok' ? <CheckCircle size={18} /> : <XCircle size={18} />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Cpu size={14} className="text-zinc-400" />
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate max-w-[200px]">
                {session.model_name}
              </h3>
              <span className="text-xs text-zinc-500 font-mono">
                {session.id.substring(0, 8)}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {new Date(session.started_at).toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <Activity size={12} />
                {session._count?.spans || 0} spans
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              {totalTokens.toLocaleString()} tokens
            </div>
            <div className="text-xs text-zinc-500">
              {session.total_input_tokens.toLocaleString()} in / {session.total_output_tokens.toLocaleString()} out
            </div>
          </div>
          
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 group-hover:border-blue-200 dark:group-hover:border-blue-900/50 transition-colors">
            <DollarSign size={14} className="text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {session.estimated_cost.toFixed(4)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

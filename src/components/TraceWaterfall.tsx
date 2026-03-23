'use client';

import React, { useState, useMemo } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Terminal, 
  Cpu, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Activity,
  Code
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}



interface Span {
  id: string;
  parent_span_id: string | null;
  name: string;
  status: string;
  duration_ms: number;
  started_at: Date | string | null;

  attributes: string;
}

interface TraceWaterfallProps {
  spans: Span[];
  sessionStartedAt: Date | string;
}

interface SpanTreeNode extends Span {
  children: SpanTreeNode[];
  depth: number;
  startTime: number; // ms since session start
}

export function TraceWaterfall({ spans, sessionStartedAt }: TraceWaterfallProps) {
  const [expandedSpans, setExpandedSpans] = useState<Record<string, boolean>>({});
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});

  const toggleSpan = (id: string) => {
    setExpandedSpans(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleTool = (id: string) => {
    setExpandedTools(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const sessionStartMs = new Date(sessionStartedAt).getTime();

  // Build the tree and calculate total duration
  const { rootNodes, maxEndTime } = useMemo(() => {
    const spanMap = new Map<string, SpanTreeNode>();
    
    // Sort spans by start time if available
    const sortedSpans = [...spans].sort((a, b) => {
      const timeA = a.started_at ? new Date(a.started_at).getTime() : 0;
      const timeB = b.started_at ? new Date(b.started_at).getTime() : 0;
      return timeA - timeB;
    });

    sortedSpans.forEach(span => {
      const startTime = span.started_at ? new Date(span.started_at).getTime() - sessionStartMs : 0;
      spanMap.set(span.id, { 
        ...span, 
        children: [], 
        depth: 0, 
        startTime: Math.max(0, startTime) 
      });
    });

    const roots: SpanTreeNode[] = [];
    let absoluteMaxEndTime = 0;

    spanMap.forEach(node => {
      absoluteMaxEndTime = Math.max(absoluteMaxEndTime, node.startTime + node.duration_ms);
      
      if (node.parent_span_id && spanMap.has(node.parent_span_id)) {
        const parent = spanMap.get(node.parent_span_id)!;
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });

    // Assign depths
    const assignDepth = (node: SpanTreeNode, depth: number) => {
      node.depth = depth;
      node.children.forEach(child => assignDepth(child, depth + 1));
    };

    roots.forEach(root => assignDepth(root, 0));

    return { rootNodes: roots, maxEndTime: absoluteMaxEndTime };
  }, [spans, sessionStartMs]);

  // Flatten the tree for rendering while respecting expansion state
  const getVisibleNodes = (nodes: SpanTreeNode[], visible: SpanTreeNode[] = []) => {
    nodes.forEach(node => {
      visible.push(node);
      if (expandedSpans[node.id] !== false && node.children.length > 0) { // Default expanded
        getVisibleNodes(node.children, visible);
      }
    });
    return visible;
  };

  // For this view, we'll just show all spans in order of their start time but with indentation
  const flattenedNodes = useMemo(() => {
    const result: SpanTreeNode[] = [];
    const traverse = (nodes: SpanTreeNode[]) => {
      nodes.sort((a, b) => a.startTime - b.startTime).forEach(node => {
        result.push(node);
        traverse(node.children);
      });
    };
    traverse(rootNodes);
    return result;
  }, [rootNodes]);

  const totalDuration = maxEndTime || 1;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Activity size={18} className="text-blue-500" />
          Trace Waterfall
        </h3>
        <span className="text-xs text-zinc-500 font-mono">
          Total Duration: {totalDuration}ms
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-800 text-[10px] uppercase tracking-wider font-bold text-zinc-500 bg-zinc-50/50 dark:bg-zinc-900/30">
            <div className="w-1/3 p-2 border-r border-zinc-200 dark:border-zinc-800">Span / Operation</div>
            <div className="w-[100px] p-2 border-r border-zinc-200 dark:border-zinc-800 text-center">Duration</div>
            <div className="flex-1 p-2 relative">
              Timeline
              <div className="absolute top-0 bottom-0 left-0 right-0 flex pointer-events-none">
                {[0, 25, 50, 75, 100].map(p => (
                  <div key={p} className="h-full border-l border-zinc-200/50 dark:border-zinc-800/50" style={{ left: `${p}%` }} />
                ))}
              </div>
            </div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
            {flattenedNodes.map(node => {
              const isTool = node.name === 'tool.execute' || node.name === 'tool_call';
              
              // Extract tool info from attributes
              let tcParams = { name: '', input: '', output: '' };
              try {
                const attrs = JSON.parse(node.attributes || '{}');
                tcParams.name = attrs['gen_ai.tool.name'] || '';
                tcParams.input = attrs['gen_ai.input.messages'] || '';
                tcParams.output = attrs['gen_ai.output.messages'] || '';
              } catch (e) {}

              const hasToolCalls = isTool && !!tcParams.name;
              const isError = node.status === 'ERROR';

              return (
                <div key={node.id} className="group">
                  <div className={cn(
                    "flex hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors",
                    isTool && "bg-emerald-50/20 dark:bg-emerald-900/5"
                  )}>
                    {/* Operation Name */}
                    <div className="w-1/3 p-2 border-r border-zinc-100 dark:border-zinc-800/50 flex items-center gap-2 overflow-hidden">
                      <div style={{ width: `${node.depth * 20}px` }} className="flex-shrink-0" />
                      {isTool ? (
                        <Terminal size={14} className="text-emerald-500 flex-shrink-0" />
                      ) : (
                        <Cpu size={14} className="text-blue-500 flex-shrink-0" />
                      )}
                      <span className={cn(
                        "text-sm font-medium truncate",
                        isTool ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-900 dark:text-zinc-100",
                        isError && "text-red-600 dark:text-red-400"
                      )}>
                        {isTool && hasToolCalls ? `${node.name}: ${tcParams.name}` : node.name}
                      </span>
                      {isError && <AlertCircle size={12} className="text-red-500" />}
                    </div>

                    {/* Duration */}
                    <div className="w-[100px] p-2 border-r border-zinc-100 dark:border-zinc-800/50 text-center flex items-center justify-center">
                      <span className="text-xs font-mono text-zinc-500">
                        {node.duration_ms}ms
                      </span>
                    </div>

                    {/* Timeline */}
                    <div className="flex-1 p-2 relative flex items-center">
                      {/* Grid Lines */}
                      <div className="absolute top-0 bottom-0 left-0 right-0 flex pointer-events-none">
                        {[0, 25, 50, 75, 100].map(p => (
                          <div key={p} className="h-full border-l border-zinc-100/50 dark:border-zinc-800/50" style={{ left: `${p}%` }} />
                        ))}
                      </div>

                      {/* Bar */}
                      <div 
                        className={cn(
                          "h-5 rounded-sm relative z-10 min-w-[2px]",
                          isTool ? "bg-emerald-500/40 dark:bg-emerald-500/30 border border-emerald-500/50" : "bg-blue-500/40 dark:bg-blue-500/30 border border-blue-500/50",
                          isError && "bg-red-500/40 dark:bg-red-500/30 border border-red-500/50"
                        )}
                        style={{ 
                          left: `${(node.startTime / totalDuration) * 100}%`,
                          width: `${Math.max(0.5, (node.duration_ms / totalDuration) * 100)}%`
                        }}
                      >
                        {node.duration_ms > 50 && (
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-zinc-600 dark:text-zinc-300 pointer-events-none">
                            {node.duration_ms}ms
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tool Call Details */}
                  {hasToolCalls && (
                    <div className="bg-zinc-50 dark:bg-zinc-900/80 border-t border-zinc-100 dark:border-zinc-800/50">
                      <div 
                        className="flex items-center gap-2 p-2 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors"
                        onClick={() => toggleTool(node.id)}
                      >
                        <div style={{ width: `${(node.depth + 1) * 20}px` }} className="flex-shrink-0" />
                        {expandedTools[node.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <Code size={14} className="text-purple-500" />
                        <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                          Tool Call: {tcParams.name}
                        </span>
                      </div>
                      
                      {expandedTools[node.id] && (
                        <div className="p-4 pt-0">
                          <div style={{ marginLeft: `${(node.depth + 2) * 20}px` }} className="space-y-3">
                            <div>
                              <div className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Input</div>
                              <pre className="text-xs p-3 bg-zinc-900 dark:bg-black text-zinc-300 rounded-lg overflow-x-auto max-h-60 border border-zinc-800">
                                {formatJson(tcParams.input)}
                              </pre>
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Output</div>
                              <pre className="text-xs p-3 bg-zinc-900 dark:bg-black text-zinc-300 rounded-lg overflow-x-auto max-h-60 border border-zinc-800">
                                {formatJson(tcParams.output)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatJson(str: string) {
  try {
    const parsed = JSON.parse(str);
    return JSON.stringify(parsed, null, 2);
  } catch (e) {
    return str;
  }
}

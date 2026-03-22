import prisma from '../db'
import { calculateCost } from './cost-calculator';

export interface OtlpTracePayload {
  resourceSpans: ResourceSpan[];
}

interface ResourceSpan {
  resource: {
    attributes: KeyValue[];
  };
  scopeSpans: ScopeSpan[];
}

interface ScopeSpan {
  scope?: {
    name: string;
    version?: string;
  };
  spans: OtelSpan[];
}

interface OtelSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: number;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  attributes: KeyValue[];
  status: {
    code: number;
    message?: string;
  };
}

interface KeyValue {
  key: string;
  value: Value;
}

interface Value {
  stringValue?: string;
  intValue?: string;
  doubleValue?: number;
  boolValue?: boolean;
}

function getValue(v: Value): any {
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.intValue !== undefined) return parseInt(v.intValue, 10);
  if (v.doubleValue !== undefined) return v.doubleValue;
  if (v.boolValue !== undefined) return v.boolValue;
  return null;
}

function flattenAttributes(attributes: KeyValue[]): Record<string, any> {
  const result: Record<string, any> = {};
  for (const attr of attributes) {
    result[attr.key] = getValue(attr.value);
  }
  return result;
}

export async function processTracePayload(payload: OtlpTracePayload) {
  if (!payload || !payload.resourceSpans) return;

  for (const resourceSpan of payload.resourceSpans) {
    const resourceAttrs = flattenAttributes(resourceSpan.resource.attributes);
    const model_name = resourceAttrs['model_name'] || 'unknown-model';

    for (const scopeSpan of resourceSpan.scopeSpans) {
      if (!scopeSpan.spans) continue;

      for (const otelSpan of scopeSpan.spans) {
        try {
          const traceId = otelSpan.traceId;
          const spanId = otelSpan.spanId;
          const parentSpanId = otelSpan.parentSpanId;
          const name = otelSpan.name;
          
          // Safer timestamp parsing
          const startTime = BigInt(otelSpan.startTimeUnixNano);
          const endTime = BigInt(otelSpan.endTimeUnixNano);
          const duration_ms = Number((endTime - startTime) / 1_000_000n);
          const startedAt = new Date(Number(startTime / 1_000_000n));
          
          const attributes = flattenAttributes(otelSpan.attributes);
          const status = otelSpan.status.code === 1 ? 'OK' : (otelSpan.status.code === 2 ? 'ERROR' : 'UNSET');

          // Extract token usage
          const inputTokens = Number(attributes['gen_ai.usage.input_tokens'] || 0);
          const outputTokens = Number(attributes['gen_ai.usage.output_tokens'] || 0);
          const cost = calculateCost(model_name, inputTokens, outputTokens);

          // Manual session management to avoid upsert issues
          const existingSession = await prisma.session.findUnique({ where: { id: traceId } });
          
          if (existingSession) {
            await prisma.session.update({
              where: { id: traceId },
              data: {
                total_input_tokens: existingSession.total_input_tokens + inputTokens,
                total_output_tokens: existingSession.total_output_tokens + outputTokens,
                estimated_cost: existingSession.estimated_cost + cost,
              }
            });
          } else {
            await prisma.session.create({
              data: {
                id: traceId,
                model_name: model_name,
                started_at: startedAt,
                total_input_tokens: inputTokens,
                total_output_tokens: outputTokens,
                estimated_cost: cost,
              }
            });
          }

          // Manual span management
          const existingSpan = await prisma.span.findUnique({ where: { id: spanId } });
          if (existingSpan) {
            await prisma.span.update({
              where: { id: spanId },
              data: {
                status,
                attributes: JSON.stringify(attributes),
                duration_ms,
                started_at: startedAt,
              }
            });
          } else {
            await prisma.span.create({
              data: {
                id: spanId,
                session_id: traceId,
                parent_span_id: parentSpanId || null,
                traceId: traceId,
                name: name,
                status: status,
                attributes: JSON.stringify(attributes),
                duration_ms: duration_ms,
                started_at: startedAt,
              }
            });
          }

          // Special handling for tool.execute
          if (name === 'tool.execute') {
            const toolName = attributes['tool_name'] || 'unknown';
            const input = attributes['input'] || '{}';
            const output = attributes['output'] || '{}';

            const existingToolCall = await prisma.toolCall.findFirst({
              where: { span_id: spanId }
            });

            const toolData = {
              span_id: spanId,
              name: String(toolName),
              input: typeof input === 'string' ? input : JSON.stringify(input),
              output: typeof output === 'string' ? output : JSON.stringify(output),
            };

            if (existingToolCall) {
              await prisma.toolCall.update({
                where: { id: existingToolCall.id },
                data: toolData
              });
            } else {
              await prisma.toolCall.create({
                data: toolData
              });
            }
          }
        } catch (innerError) {
          console.error('Error processing individual span:', innerError);
        }
      }
    }
  }
}

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
  if (!attributes) return result;
  for (const attr of attributes) {
    result[attr.key] = getValue(attr.value);
  }
  return result;
}

export async function processTracePayload(payload: OtlpTracePayload) {
  if (!payload || !payload.resourceSpans) return;

  for (const resourceSpan of payload.resourceSpans) {
    const resourceAttrs = flattenAttributes(resourceSpan.resource.attributes);
    let current_model_name = resourceAttrs['model_name'] || 'unknown-model';

    for (const scopeSpan of resourceSpan.scopeSpans) {
      if (!scopeSpan.spans) continue;

      for (const otelSpan of scopeSpan.spans) {
        try {
          const traceId = otelSpan.traceId;
          const spanId = otelSpan.spanId;
          const parentSpanId = otelSpan.parentSpanId;
          const name = otelSpan.name;
          
          const startTime = BigInt(otelSpan.startTimeUnixNano);
          const endTime = BigInt(otelSpan.endTimeUnixNano);
          const duration_ms = Number((endTime - startTime) / 1_000_000n);
          const startedAt = new Date(Number(startTime / 1_000_000n));
          
          const attributes = flattenAttributes(otelSpan.attributes);
          const status = otelSpan.status.code === 1 ? 'OK' : (otelSpan.status.code === 2 ? 'ERROR' : 'UNSET');

          const span_model = attributes['gen_ai.request.model'];
          if (span_model && current_model_name === 'unknown-model') {
            current_model_name = span_model;
          }

          const inputTokens = Number(attributes['gen_ai.usage.input_tokens'] || 0);
          const outputTokens = Number(attributes['gen_ai.usage.output_tokens'] || 0);
          const cost = calculateCost(current_model_name, inputTokens, outputTokens);

          // Session management
          await prisma.session.upsert({
            where: { id: traceId },
            update: {
              model_name: current_model_name !== 'unknown-model' ? current_model_name : undefined,
              total_input_tokens: { increment: inputTokens },
              total_output_tokens: { increment: outputTokens },
              estimated_cost: { increment: cost },
            },
            create: {
              id: traceId,
              model_name: current_model_name,
              started_at: startedAt,
              total_input_tokens: inputTokens,
              total_output_tokens: outputTokens,
              estimated_cost: cost,
            }
          });

          // Span management
          await prisma.span.upsert({
            where: { id: spanId },
            update: {
              status,
              attributes: JSON.stringify(attributes),
              duration_ms,
              started_at: startedAt,
            },
            create: {
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

          // Strict Tool Call Extraction
          if (name === 'tool_call') {
            const toolName = attributes['gen_ai.tool.name'];
            const input = attributes['gen_ai.input.messages'];
            const output = attributes['gen_ai.output.messages'];

            if (toolName) {
              // Clear previous tool calls for this span to avoid unique constraint issues if we had them
              // and ensure we only have one tool record per spanId.
              await prisma.toolCall.deleteMany({ where: { span_id: spanId } });
              
              await prisma.toolCall.create({
                data: {
                  span_id: spanId,
                  name: String(toolName),
                  input: typeof input === 'string' ? input : JSON.stringify(input),
                  output: typeof output === 'string' ? output : JSON.stringify(output),
                }
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

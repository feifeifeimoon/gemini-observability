export interface ModelRate {
  input_rate_per_1m: number;
  output_rate_per_1m: number;
}

export const MODEL_RATES: Record<string, ModelRate> = {
  'gemini-1.5-pro': {
    input_rate_per_1m: 3.50,
    output_rate_per_1m: 10.50,
  },
  'gemini-1.5-flash': {
    input_rate_per_1m: 0.075,
    output_rate_per_1m: 0.30,
  },
  'unknown-model': {
    input_rate_per_1m: 0,
    output_rate_per_1m: 0,
  },
};

export function getModelRate(modelName: string): ModelRate {
  // Try to find an exact match or a partial match
  const modelKey = Object.keys(MODEL_RATES).find(key => modelName.includes(key));
  return MODEL_RATES[modelKey || 'unknown-model'];
}

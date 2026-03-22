import { getModelRate } from '../constants/model-rates';

export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const rate = getModelRate(model);
  
  const inputCost = (inputTokens / 1_000_000) * rate.input_rate_per_1m;
  const outputCost = (outputTokens / 1_000_000) * rate.output_rate_per_1m;
  
  return inputCost + outputCost;
}

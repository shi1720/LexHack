/**
 * Accuracy benchmark against a frozen, human-labelled set of 420 applications.
 * Article 15(3): the declared accuracy level and its metric appear in the
 * instructions for use.
 */
export const GROUND_TRUTH_SET = 'evals/fixtures/screening-golden-2026Q2.jsonl';
export const ACCURACY_THRESHOLD = 0.82;

export interface EvalCase { resumeText: string; postingId: string; humanLabel: 'advance' | 'reject' }

export function accuracy(predictions: string[], labels: string[]): number {
  const correct = predictions.filter((p, i) => p === labels[i]).length;
  return correct / labels.length;
}

export function precisionRecall(predictions: string[], labels: string[]) {
  const tp = predictions.filter((p, i) => p === 'advance' && labels[i] === 'advance').length;
  const fp = predictions.filter((p, i) => p === 'advance' && labels[i] !== 'advance').length;
  const fn = predictions.filter((p, i) => p !== 'advance' && labels[i] === 'advance').length;
  return { precision: tp / (tp + fp), recall: tp / (tp + fn) };
}

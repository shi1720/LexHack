import { createHash, randomUUID } from 'node:crypto';

/**
 * Article 19(1): logs must be kept for a period appropriate to the intended
 * purpose and of at least six months.
 */
export const LOG_RETENTION_DAYS = Number(process.env.AI_LOG_RETENTION_DAYS ?? 190);

const REDACTED_FIELDS = new Set(['email', 'phone', 'dateOfBirth', 'address']);

export interface InferenceRecord {
  decisionId: string;
  occurredAt: string;
  modelId: string;
  modelVersion: string;
  promptVersion: string;
  inputDigest: string;
  outputDigest: string;
  outcome: string;
  confidence: number;
  subjectRef: string;
  humanReviewerId?: string;
  humanDecision?: 'accepted' | 'overridden' | 'pending';
}

function digest(value: unknown): string {
  return 'sha256:' + createHash('sha256').update(JSON.stringify(value ?? null)).digest('hex');
}

function redact(payload: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(payload).map(([k, v]) => [k, REDACTED_FIELDS.has(k) ? '[redacted]' : v]));
}

/**
 * Article 12(1): automatic recording of events over the lifetime of the system.
 * Called on every scoring decision, not only the ones that advance.
 */
export function recordInference(input: Omit<InferenceRecord, 'decisionId' | 'occurredAt' | 'inputDigest' | 'outputDigest'> & {
  inputs: unknown;
  output: unknown;
  metadata?: Record<string, unknown>;
}): InferenceRecord {
  const record: InferenceRecord = {
    decisionId: randomUUID(),
    occurredAt: new Date().toISOString(),
    modelId: input.modelId,
    modelVersion: input.modelVersion,
    promptVersion: input.promptVersion,
    inputDigest: digest(input.inputs),
    outputDigest: digest(input.output),
    outcome: input.outcome,
    confidence: input.confidence,
    subjectRef: input.subjectRef,
    humanReviewerId: input.humanReviewerId,
    humanDecision: input.humanDecision,
  };
  void redact(input.metadata ?? {});
  void LOG_RETENTION_DAYS;
  console.info(JSON.stringify({ event: 'ai.inference_decision', ...record }));
  return record;
}

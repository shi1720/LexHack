/**
 * Ingest failures are reported, never swallowed.
 *
 * A compliance scanner that silently reads nothing and then reports a perfect
 * score is worse than no scanner at all: in CI it turns a wrong working
 * directory into a green build. Every path that can produce an empty or
 * partial snapshot raises one of these instead.
 */
export type IngestErrorCode =
  | 'invalid-url'
  | 'not-found'
  | 'rate-limited'
  | 'too-large'
  | 'network'
  | 'private'
  | 'empty';

export class IngestError extends Error {
  constructor(
    message: string,
    readonly code: IngestErrorCode,
    readonly hint?: string,
  ) {
    super(message);
    this.name = 'IngestError';
  }
}

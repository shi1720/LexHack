import type { ControlResult, ScanReport } from '@annex/engine';

/**
 * The one place a language model is allowed near this product.
 *
 * Annex's determinations are rule-based and offline, on purpose: an auditor
 * cannot accept "the model thought so" as evidence, and a scan that depends on
 * an API key is a scan that fails during a demo. But there is one job a model
 * does better than a rules engine, and it is not deciding anything — it is
 * translating a finding that already exists into language the person who has
 * to act on it will actually read.
 *
 * So: the model never sees the decision to make, only the decision already
 * made. It cannot change a status, a score or a citation. Every output is
 * labelled as model-written in the UI, and the feature degrades to a clear
 * explanation of itself when no key is configured.
 */

export const NARRATIVE_MODEL = 'claude-sonnet-4-5';

export interface NarrativeResult {
  available: boolean;
  text: string;
  model?: string;
  audience: Audience;
}

export type Audience = 'engineer' | 'executive' | 'auditor';

const AUDIENCE_BRIEF: Record<Audience, string> = {
  engineer:
    'a senior engineer on the team that owns this code. Be concrete about what to change and where. Assume they know the codebase and nothing about the regulation.',
  executive:
    'a founder or executive with no legal or engineering background. Explain what the obligation protects, what happens if it is ignored, and roughly what the fix costs in engineering time. No jargon, no article numbers in the first sentence.',
  auditor:
    'a conformity assessor reading the technical documentation. Be precise, use the article numbers, and say plainly what evidence exists and what does not.',
};

function apiKey(): string | undefined {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  return key && key.length > 10 ? key : undefined;
}

export function narrativeAvailable(): boolean {
  return Boolean(apiKey());
}

const UNAVAILABLE = (audience: Audience): NarrativeResult => ({
  available: false,
  audience,
  text:
    'Plain-language explanations are an optional add-on and no ANTHROPIC_API_KEY is configured. Everything else on this page — the classification, the status, the evidence, the citations and the ledger — is produced without any model and is unaffected. Set ANTHROPIC_API_KEY to enable this one feature.',
});

/**
 * Rewrite a finding for a specific reader. The model receives the finding as
 * settled fact and is instructed not to re-decide it.
 */
export async function explainControl(
  control: ControlResult,
  report: ScanReport,
  audience: Audience,
): Promise<NarrativeResult> {
  const key = apiKey();
  if (!key) return UNAVAILABLE(audience);

  const evidence = control.evidence
    .map((e) => (e.kind === 'absence' ? `NEGATIVE FINDING: ${e.snippet}` : `${e.path}:${e.line}  ${e.snippet.trim()}`))
    .join('\n');

  const prompt = [
    'You are writing for ' + AUDIENCE_BRIEF[audience],
    '',
    'A deterministic static analysis has ALREADY decided the following. Your job is to explain it, not to re-decide it.',
    'Do not contradict the status. Do not invent evidence. Do not cite an article that is not listed below.',
    'Three short paragraphs at most. No preamble, no headings, no bullet points.',
    '',
    `SYSTEM: ${report.profile.name}`,
    `INTENDED PURPOSE: ${report.profile.purpose || '(not stated by the operator)'}`,
    `CLASSIFICATION: ${report.classification.summary}`,
    '',
    `OBLIGATION: ${control.title}`,
    `STATUS (settled, do not change): ${control.status}`,
    `IN FORCE: ${control.inForce ? `yes, since ${control.appliesFrom}` : `no, applies from ${control.appliesFrom}`}`,
    `WHAT THE LAW REQUIRES: ${control.obligation}`,
    `CITATIONS: ${control.citations.map((c) => `${c.short} ${c.locator} — ${c.title}`).join('; ')}`,
    `WHAT THE SCAN FOUND: ${control.finding}`,
    control.gap ? `HOW TO CLOSE IT: ${control.gap}` : '',
    evidence ? `EVIDENCE:\n${evidence}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: NARRATIVE_MODEL,
        max_tokens: 600,
        temperature: 0.2,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return {
        available: false,
        audience,
        text: `The explanation service returned HTTP ${res.status}. The scan itself is unaffected — it never calls a model. ${detail.slice(0, 200)}`,
      };
    }

    const body = (await res.json()) as { content: { type: string; text?: string }[] };
    const text = body.content
      .filter((c) => c.type === 'text')
      .map((c) => c.text ?? '')
      .join('')
      .trim();

    return { available: true, text, model: NARRATIVE_MODEL, audience };
  } catch (err) {
    return {
      available: false,
      audience,
      text: `Could not reach the explanation service: ${(err as Error).message}. The scan itself is unaffected — it never calls a model.`,
    };
  }
}

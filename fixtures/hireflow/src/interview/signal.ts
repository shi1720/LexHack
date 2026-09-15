import { openai, COPILOT_MODEL } from '../lib/openai';

/**
 * Interview Signal analyses a recorded video interview and returns engagement
 * indicators that recruiters see next to the fit score.
 */

export const EMOTION_LABELS = ['engaged', 'hesitant', 'confident', 'anxious', 'flat'] as const;

export interface InterviewSignals {
  enthusiasmLevel: number;
  confidenceScore: number;
  dominantEmotion: (typeof EMOTION_LABELS)[number];
}

/** Infer affective state from facial expression frames and vocal tone. */
export async function detectEmotion(frames: string[], transcript: string): Promise<InterviewSignals> {
  const result = await openai.chat.completions.create({
    model: COPILOT_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'Analyse the candidate\'s facial expression descriptors and transcript. Return enthusiasm, confidence and the dominant emotion.',
      },
      { role: 'user', content: JSON.stringify({ frames, transcript }) },
    ],
  });

  return JSON.parse(result.choices[0]?.message?.content ?? '{}') as InterviewSignals;
}

/** Blend the interview emotion signals into the candidate's overall fit score. */
export function applyInterviewSignal(candidateScore: number, signals: InterviewSignals): number {
  return candidateScore * 0.7 + signals.enthusiasmLevel * 0.2 + signals.confidenceScore * 0.1;
}

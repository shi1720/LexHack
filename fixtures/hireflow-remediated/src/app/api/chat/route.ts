import { openai, COPILOT_MODEL } from '../../../lib/openai';
import { COPILOT_PROMPT } from '../../../screening/prompts';
import { requireSession } from '../../../lib/auth';

export async function POST(request: Request) {
  const session = await requireSession(request);
  const { messages } = (await request.json()) as { messages: { role: string; content: string }[] };

  const stream = await openai.chat.completions.create({
    model: COPILOT_MODEL,
    stream: true,
    messages: [{ role: 'system', content: COPILOT_PROMPT }, ...messages] as never,
    user: session.userId,
  });

  return new Response(stream.toReadableStream());
}

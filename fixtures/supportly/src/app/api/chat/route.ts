import { anthropic, SUPPORT_MODEL, SYSTEM_PROMPT } from '../../../lib/claude';
import { retrieveArticles } from '../../../lib/retrieval';

export async function POST(request: Request) {
  const { messages, brand } = (await request.json()) as { messages: { role: string; content: string }[]; brand: string };
  const context = await retrieveArticles(brand, messages.at(-1)?.content ?? '');

  const reply = await anthropic.messages.create({
    model: SUPPORT_MODEL,
    max_tokens: 800,
    system: SYSTEM_PROMPT.replace('{{brand}}', brand) + '\n\n' + context,
    messages: messages as never,
  });

  return Response.json({ reply });
}

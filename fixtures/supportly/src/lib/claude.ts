import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const SUPPORT_MODEL = 'claude-sonnet-4-5';

export const SYSTEM_PROMPT = `You are a support assistant for {{brand}}.
Answer only from the supplied help centre articles. If the answer is not there,
say so and offer to hand over to a human.`;

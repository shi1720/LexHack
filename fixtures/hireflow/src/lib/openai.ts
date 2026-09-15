import OpenAI from 'openai';
import pino from 'pino';

export const logger = pino({ name: 'hireflow' });

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const SCORING_MODEL = 'gpt-4o-mini';
export const COPILOT_MODEL = 'gpt-4o';

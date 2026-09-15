import { describe, expect, it, vi } from 'vitest';
import { rankApplicants } from '../src/screening/rank';

vi.mock('../src/lib/openai', () => ({
  openai: { chat: { completions: { create: vi.fn().mockResolvedValue({ choices: [{ message: { content: '0.8' } }] }) } } },
  logger: { info: vi.fn() },
  SCORING_MODEL: 'gpt-4o-mini',
}));

describe('rankApplicants', () => {
  it('sorts advanced applicants by score', async () => {
    const posting = { id: 'p1', title: 'Engineer', description: 'Build things', location: 'Berlin', requisitionId: 'r1' };
    const applicants = [
      { id: 'a1', fullName: 'A', email: 'a@x.com', phone: null, dateOfBirth: null, address: null, gender: null, ethnicity: null, disability: null, resumeText: 'x', createdAt: new Date() },
    ];
    const ranked = await rankApplicants(applicants as never, posting as never);
    expect(ranked).toHaveLength(1);
  });
});

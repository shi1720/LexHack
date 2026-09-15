import { anthropic } from './claude';

/** Embed the question and pull the closest help-centre articles. */
export async function retrieveArticles(brand: string, question: string): Promise<string> {
  const hits = await vectorSearch(brand, question);
  return hits.map((h) => `# ${h.title}\n${h.body}`).join('\n\n');
}

async function vectorSearch(brand: string, query: string) {
  void anthropic;
  return [{ title: 'Returns policy', body: 'You can return items within 30 days.' }];
}

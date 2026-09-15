import type { Language } from '../types.js';

const EXT_MAP: Record<string, Language> = {
  ts: 'typescript', tsx: 'typescript', mts: 'typescript', cts: 'typescript',
  js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript',
  py: 'python', pyi: 'python',
  go: 'go',
  java: 'java', kt: 'java', kts: 'java',
  rb: 'ruby',
  rs: 'rust',
  cs: 'csharp',
  php: 'php',
  sql: 'sql',
  md: 'markdown', mdx: 'markdown', rst: 'markdown', adoc: 'markdown',
  yml: 'yaml', yaml: 'yaml',
  json: 'json', jsonc: 'json',
  toml: 'toml',
  html: 'html', htm: 'html', vue: 'html', svelte: 'html',
  css: 'css', scss: 'css', sass: 'css', less: 'css',
  sh: 'shell', bash: 'shell', zsh: 'shell',
  txt: 'text', env: 'text', ini: 'text', cfg: 'text', properties: 'text',
};

/** Files with no extension that we still care about. */
const NAME_MAP: Record<string, Language> = {
  dockerfile: 'shell',
  makefile: 'shell',
  procfile: 'text',
  license: 'text',
  readme: 'markdown',
  codeowners: 'text',
};

export function detectLanguage(path: string): Language {
  const base = path.split('/').pop() ?? path;
  const lower = base.toLowerCase();
  const dot = lower.lastIndexOf('.');
  if (dot > 0) {
    const ext = lower.slice(dot + 1);
    const hit = EXT_MAP[ext];
    if (hit) return hit;
  }
  const named = NAME_MAP[lower.split('.')[0] ?? lower];
  if (named) return named;
  return 'other';
}

export const DOC_LANGUAGES: ReadonlySet<Language> = new Set<Language>(['markdown', 'text', 'html']);

/** Languages whose contents we actually parse for behavioural signals. */
export const CODE_LANGUAGES: ReadonlySet<Language> = new Set<Language>([
  'typescript', 'javascript', 'python', 'go', 'java', 'ruby', 'rust', 'csharp', 'php', 'sql',
]);

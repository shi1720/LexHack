import type { Evidence, EvidenceKind, Language, RepoSnapshot, SignalCategory, SourceFile } from '../types.js';
import { CODE_LANGUAGES, DOC_LANGUAGES } from '../ingest/languages.js';

export interface SignalSpec {
  id: string;
  label: string;
  category: SignalCategory;
  description: string;
  /**
   * Cheap lowercase substring prefilter. A file is only line-scanned when it
   * contains at least one of these. This is what keeps a full scan under a
   * second on a few thousand files.
   */
  keywords: string[];
  /** Line-level patterns. A single match is enough to emit evidence. */
  patterns: RegExp[];
  /** Restrict to matching paths. */
  paths?: RegExp;
  /** Exclude matching paths (tests, fixtures, vendored code). */
  excludePaths?: RegExp;
  /** Restrict to a language set. Defaults to code + docs. */
  scope?: 'code' | 'docs' | 'config' | 'any';
  /** Maximum evidence items retained. Keeps reports readable. */
  maxEvidence?: number;
  evidenceKind?: EvidenceKind;
  /** Extra guard evaluated against the whole file, e.g. to demand co-occurrence. */
  fileGuard?: (file: SourceFile) => boolean;
}

export interface CompiledSignal extends SignalSpec {
  maxEvidence: number;
  detect(snapshot: RepoSnapshot): Evidence[];
}

const CONFIG_LANGS: ReadonlySet<Language> = new Set<Language>(['yaml', 'json', 'toml', 'text', 'shell']);

function inScope(file: SourceFile, scope: SignalSpec['scope']): boolean {
  switch (scope) {
    case 'code':
      return CODE_LANGUAGES.has(file.lang);
    case 'docs':
      return DOC_LANGUAGES.has(file.lang);
    case 'config':
      return CONFIG_LANGS.has(file.lang);
    case 'any':
      return true;
    default:
      return CODE_LANGUAGES.has(file.lang) || DOC_LANGUAGES.has(file.lang) || CONFIG_LANGS.has(file.lang);
  }
}

/** Trim a source line to something readable in a report card. */
export function trimSnippet(line: string, max = 180): string {
  const clean = line.replace(/\t/g, '  ').trimEnd();
  const lead = clean.length - clean.trimStart().length;
  const body = clean.trimStart();
  const indent = lead > 0 ? ' '.repeat(Math.min(lead, 4)) : '';
  return (indent + body).slice(0, max);
}

export function defineSignal(spec: SignalSpec): CompiledSignal {
  const maxEvidence = spec.maxEvidence ?? 8;

  return {
    ...spec,
    maxEvidence,
    detect(snapshot: RepoSnapshot): Evidence[] {
      const evidence: Evidence[] = [];
      const perFileCap = 2;

      for (const file of snapshot.files) {
        if (evidence.length >= maxEvidence) break;
        if (!file.text || file.skipped) continue;
        if (spec.paths && !spec.paths.test(file.path)) continue;
        if (spec.excludePaths && spec.excludePaths.test(file.path)) continue;
        if (!inScope(file, spec.scope)) continue;

        const lower = file.text.toLowerCase();
        if (spec.keywords.length > 0 && !spec.keywords.some((k) => lower.includes(k))) continue;
        if (spec.fileGuard && !spec.fileGuard(file)) continue;

        const lines = file.text.split('\n');
        let fromThisFile = 0;
        for (let i = 0; i < lines.length; i++) {
          if (fromThisFile >= perFileCap || evidence.length >= maxEvidence) break;
          const line = lines[i] ?? '';
          if (line.length > 2000) continue;
          for (const pattern of spec.patterns) {
            pattern.lastIndex = 0;
            if (pattern.test(line)) {
              evidence.push({
                path: file.path,
                line: i + 1,
                snippet: trimSnippet(line),
                fileSha256: file.sha256,
                kind: spec.evidenceKind ?? (DOC_LANGUAGES.has(file.lang) ? 'doc' : 'code'),
              });
              fromThisFile++;
              break;
            }
          }
        }
      }

      return evidence;
    },
  };
}

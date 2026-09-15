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

const WEAK_PATHS = /(^|\/)(package\.json|package-lock\.json|requirements.*\.txt|pyproject\.toml|go\.mod|Cargo\.toml|yarn\.lock|pnpm-lock\.yaml)$/i;
const TEST_PATHS = /(^|\/)(tests?|__tests__|spec|e2e|fixtures?|examples?)\/|\.(test|spec)\.[tj]sx?$/i;

/** A line that *defines* behaviour is better evidence than one that displays it. */
const DEFINITION = /\b(export\s+)?(async\s+)?(function|def|class|interface|type|const|let|var)\s+\w|=>\s*\{|\w+\s*\([^)]*\)\s*(:|\{)/;

/** Lower is stronger. Source definitions beat usages, which beat manifests and prose. */
function evidenceRank(e: Evidence): number {
  if (WEAK_PATHS.test(e.path)) return 6;
  if (TEST_PATHS.test(e.path)) return 5;
  if (e.kind === 'doc') return 4;
  return DEFINITION.test(e.snippet) ? 0 : 2;
}

export function defineSignal(spec: SignalSpec): CompiledSignal {
  const maxEvidence = spec.maxEvidence ?? 8;
  const perFileCap = 2;
  const perFileScan = 60;

  return {
    ...spec,
    maxEvidence,
    detect(snapshot: RepoSnapshot): Evidence[] {
      interface Hit {
        evidence: Evidence;
        patternIndex: number;
        density: number;
      }
      const hits: Hit[] = [];

      for (const file of snapshot.files) {
        if (!file.text || file.skipped) continue;
        if (spec.paths && !spec.paths.test(file.path)) continue;
        if (spec.excludePaths && spec.excludePaths.test(file.path)) continue;
        if (!inScope(file, spec.scope)) continue;

        // Cheap whole-file prefilter. This is what keeps a full scan of a few
        // thousand files under a second: most files never reach the line loop.
        const lower = file.text.toLowerCase();
        if (spec.keywords.length > 0 && !spec.keywords.some((k) => lower.includes(k))) continue;
        if (spec.fileGuard && !spec.fileGuard(file)) continue;

        const lines = file.text.split('\n');
        const fileHits: Omit<Hit, 'density'>[] = [];

        for (let i = 0; i < lines.length && fileHits.length < perFileScan; i++) {
          const line = lines[i] ?? '';
          if (line.length > 2000) continue;
          for (let p = 0; p < spec.patterns.length; p++) {
            const pattern = spec.patterns[p]!;
            pattern.lastIndex = 0;
            if (!pattern.test(line)) continue;
            fileHits.push({
              patternIndex: p,
              evidence: {
                path: file.path,
                line: i + 1,
                snippet: trimSnippet(line),
                fileSha256: file.sha256,
                kind: spec.evidenceKind ?? (DOC_LANGUAGES.has(file.lang) ? 'doc' : 'code'),
              },
            });
            break;
          }
        }

        if (fileHits.length === 0) continue;

        // Keep the *best* lines from this file, not the first ones. A match on
        // the function that makes the decision is better evidence than a match
        // on the import statement above it, and imports come first in the file.
        const density = fileHits.length;
        fileHits
          .sort(
            (a, b) =>
              evidenceRank(a.evidence) - evidenceRank(b.evidence) || a.patternIndex - b.patternIndex,
          )
          .slice(0, perFileCap)
          .forEach((h) => hits.push({ ...h, density }));
      }

      // Best evidence first: a definition line, in a file the signal is dense
      // in, matched by the most specific pattern. Whoever reads this report
      // reads the first two citations, so those two have to be the right ones.
      return hits
        .sort(
          (a, b) =>
            evidenceRank(a.evidence) - evidenceRank(b.evidence) ||
            b.density - a.density ||
            a.patternIndex - b.patternIndex ||
            a.evidence.path.localeCompare(b.evidence.path),
        )
        .slice(0, maxEvidence)
        .map((h) => h.evidence);
    },
  };
}

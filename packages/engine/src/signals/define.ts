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
  /**
   * Ignore comment-only lines.
   *
   * "Domain signals fire on code, never on prose" was implemented one level too
   * coarsely: it excluded documentation *files*, but a sentence in a `//`
   * comment inside a TypeScript file is prose too. Annex found this by scanning
   * itself and classifying itself as an emotion-recognition system on the
   * strength of a comment explaining that one of its fixtures reintroduces
   * affect inference.
   *
   * Every domain signal sets this. Control and transparency signals do not:
   * there, a docstring reading "Human review: a reviewer can override the model
   * output" is exactly the evidence being looked for.
   */
  ignoreComments?: boolean;
}

export interface DetectionResult {
  /** The best `maxEvidence` lines, ranked. What a reader actually sees. */
  evidence: Evidence[];
  /**
   * Every line that matched, before the cap.
   *
   * These are different numbers and conflating them was a real bug: `hits` used
   * to be `evidence.length`, which saturates at `maxEvidence`, while density
   * thresholds elsewhere read it as a match count. A signal firing 400 times
   * and one firing 8 times looked identical to the classifier.
   */
  matches: number;
  /** Distinct files the signal fired in, before the cap. */
  fileCount: number;
}

export interface CompiledSignal extends SignalSpec {
  maxEvidence: number;
  detect(snapshot: RepoSnapshot): DetectionResult;
}

const CONFIG_LANGS: ReadonlySet<Language> = new Set<Language>(['yaml', 'json', 'toml', 'text', 'shell']);

/**
 * Strip prose from source, so a domain claim never rests on a sentence.
 *
 * "Domain signals fire on code, never on prose" was implemented twice and was
 * wrong both times. First it excluded documentation *files*, and a sentence in
 * a `//` comment inside a TypeScript file is prose too — Annex found that by
 * scanning itself and classifying itself as an emotion-recognition system.
 * Then it skipped lines that *begin* with a comment marker, which leaves the
 * interior of a `/* … *' + '/` block and of a Python docstring looking exactly
 * like code. A repository containing nothing but a block comment saying
 * "we deliberately do NOT do emotion detection on candidates" classified
 * high-risk, and cited that sentence as the evidence.
 *
 * This is a scanner, not a parser, and the failure mode is chosen deliberately:
 * a line carrying code *and* a trailing comment stays, because the claim rests
 * on the code half.
 */
const LINE_COMMENT = /^\s*(\/\/|#|--|;)/;
const BLOCK_OPEN = /\/\*|<!--/;

/**
 * Blank out string and template literals before looking for a comment opener.
 *
 * `export const GLOB = '/*';` is code, and reading its `/*` as the start of a
 * block comment turned every following line in the file into prose — so one
 * line at the top of a file erased the emotion-inference detection, the Annex
 * III finding and the €35m tier beneath it. `const HTML = '<!--';` did the
 * same. This is a lexer's job and this is not a lexer, but blanking quoted
 * runs is the difference between wrong on a pathological file and wrong on an
 * ordinary one.
 */
function withoutStringLiterals(line: string): string {
  let out = '';
  let quote: string | undefined;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (quote) {
      if (ch === '\\') { out += '  '; i++; continue; }
      out += ch === quote ? ch : ' ';
      if (ch === quote) quote = undefined;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; out += ch; continue; }
    out += ch;
  }
  return out;
}
const BLOCK_CLOSE = /\*\/|-->/;
const DOCSTRING = /"""|'''/;

/** Indices (0-based) of lines that are prose rather than code. */
export function commentLines(text: string, lines: string[]): Set<number> {
  const prose = new Set<number>();
  let inBlock = false;
  let inDocstring = false;
  void text;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';

    if (inBlock) {
      prose.add(i);
      if (BLOCK_CLOSE.test(withoutStringLiterals(line))) inBlock = false;
      continue;
    }
    if (inDocstring) {
      prose.add(i);
      if (DOCSTRING.test(line)) inDocstring = false;
      continue;
    }

    const trimmed = line.trim();
    if (LINE_COMMENT.test(line)) {
      prose.add(i);
      continue;
    }

    // A docstring that opens and closes on one line is a one-line comment.
    const docOpen = DOCSTRING.exec(line);
    if (docOpen && trimmed.startsWith(docOpen[0])) {
      prose.add(i);
      const rest = line.slice((docOpen.index ?? 0) + 3);
      if (!DOCSTRING.test(rest)) inDocstring = true;
      continue;
    }

    const code = withoutStringLiterals(line);
    const blockOpen = BLOCK_OPEN.exec(code);
    if (blockOpen) {
      // Only the whole-line form is prose; `foo(); /* why */` keeps its code.
      if (trimmed.startsWith('/*') || trimmed.startsWith('<!--')) prose.add(i);
      if (!BLOCK_CLOSE.test(code.slice((blockOpen.index ?? 0) + 2))) inBlock = true;
    }
  }
  return prose;
}

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
    detect(snapshot: RepoSnapshot): DetectionResult {
      interface Hit {
        evidence: Evidence;
        patternIndex: number;
        density: number;
      }
      const hits: Hit[] = [];
      const matchedFiles = new Set<string>();
      let totalMatches = 0;

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
        const prose = spec.ignoreComments ? commentLines(file.text, lines) : undefined;
        const fileHits: Omit<Hit, 'density'>[] = [];

        for (let i = 0; i < lines.length && fileHits.length < perFileScan; i++) {
          const line = lines[i] ?? '';
          if (line.length > 2000) continue;
          if (prose?.has(i)) continue;
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
        totalMatches += fileHits.length;
        matchedFiles.add(file.path);

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
      const ranked = hits.sort(
        (a, b) =>
          evidenceRank(a.evidence) - evidenceRank(b.evidence) ||
          b.density - a.density ||
          a.patternIndex - b.patternIndex ||
          a.evidence.path.localeCompare(b.evidence.path),
      );
      return {
        evidence: ranked.slice(0, maxEvidence).map((h) => h.evidence),
        matches: totalMatches,
        fileCount: matchedFiles.size,
      };
    },
  };
}

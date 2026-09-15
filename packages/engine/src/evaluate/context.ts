import type {
  Classification,
  Dependency,
  EvaluationContext,
  Evidence,
  EvidenceKind,
  RepoSnapshot,
  SignalIndex,
  SourceFile,
  SystemProfile,
} from '../types.js';
import { DOC_LANGUAGES } from '../ingest/languages.js';
import { trimSnippet } from '../signals/define.js';

const DOC_FILE = /\.(md|mdx|rst|txt|adoc)$/i;
const HEADING = /^\s{0,3}(#{1,6}\s+|={2,}\s*$|[A-Z][^\n]{0,80}\n\s*[-=]{3,}\s*$)/;

/**
 * Which document may answer which duty.
 *
 * Two versions of this were wrong in different directions. Matching the whole
 * path let `docs/ai-act/incident-reporting.md` answer the risk-management duty
 * because its *folder* was called "ai-act". Matching the base name, with
 * "readme" as an always-eligible alternative, was worse: a twelve-line README
 * of compliance phrases turned three obligations green, on a tool whose entire
 * argument is that a document a company wrote about itself cannot answer the
 * question.
 *
 * So the rule is: a document is eligible where its **name** is on topic, or
 * where the match sits under a **heading** that is on topic. A README can
 * still answer the Article 9 duty — from its "Risk management" section, which
 * is what a reader would look for. A passing mention three paragraphs into the
 * installation instructions cannot.
 */
function eligibleLines(text: string, topic: RegExp, wholeFile: boolean): (line: number) => boolean {
  if (wholeFile) return () => true;
  const lines = text.split('\n');
  const onTopic = new Set<number>();
  let active = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (HEADING.test(line) || (lines[i + 1] && /^\s*[-=]{3,}\s*$/.test(lines[i + 1] ?? ''))) {
      topic.lastIndex = 0;
      active = topic.test(line);
    }
    if (active) onTopic.add(i + 1);
  }
  return (line: number) => onTopic.has(line);
}

function docNameMatches(path: string, topic: RegExp): boolean {
  const base = path.split('/').pop() ?? path;
  topic.lastIndex = 0;
  return topic.test(base);
}

export function createContext(input: {
  snapshot: RepoSnapshot;
  signals: SignalIndex;
  classification: Classification;
  profile: SystemProfile;
}): EvaluationContext {
  const { snapshot } = input;
  const readable = snapshot.files.filter((f) => f.text && !f.skipped);

  const findFiles = (pattern: RegExp): SourceFile[] => readable.filter((f) => pattern.test(f.path));

  const grep = (
    pattern: RegExp,
    opts: { paths?: RegExp; limit?: number; kind?: EvidenceKind } = {},
  ): Evidence[] => {
    const limit = opts.limit ?? 6;
    const out: Evidence[] = [];
    for (const file of readable) {
      if (out.length >= limit) break;
      if (opts.paths && !opts.paths.test(file.path)) continue;
      // Cheap whole-file test before splitting into lines.
      if (!pattern.test(file.text)) continue;
      const lines = file.text.split('\n');
      let fromFile = 0;
      for (let i = 0; i < lines.length && out.length < limit && fromFile < 2; i++) {
        const line = lines[i] ?? '';
        pattern.lastIndex = 0;
        if (line.length <= 2000 && pattern.test(line)) {
          out.push({
            path: file.path,
            line: i + 1,
            snippet: trimSnippet(line),
            fileSha256: file.sha256,
            kind: opts.kind ?? (DOC_LANGUAGES.has(file.lang) ? 'doc' : 'code'),
          });
          fromFile++;
        }
      }
      // Multiline patterns can match the file without matching any single line.
      if (fromFile === 0 && out.length < limit) {
        out.push({
          path: file.path,
          line: 1,
          snippet: trimSnippet(lines[0] ?? file.path),
          fileSha256: file.sha256,
          kind: opts.kind ?? (DOC_LANGUAGES.has(file.lang) ? 'doc' : 'code'),
          note: 'Matched on whole-file content.',
        });
      }
    }
    return out;
  };

  /**
   * Find call sites for a module, from any other file in the tree.
   *
   * Deliberately syntactic and deliberately generous: an import of the module
   * path, or a call to one of the names it exports. Generous is the right bias
   * here — a false "this is wired in" is a missed gap, but a false "nothing
   * calls this" would nag teams whose wiring lives somewhere we cannot see, so
   * the callers below degrade to `partial` rather than `missing` when this
   * comes back empty.
   */
  const isReferenced = (file: SourceFile): { calls: Evidence[]; imports: Evidence[] } => {
    const stem = (file.path.split('/').pop() ?? '').replace(/\.[^.]+$/, '');
    if (!stem) return { calls: [], imports: [] };

    // Exported names: `export function gate(`, `def gate(`, `class Gate`, …
    const exported = new Set<string>();
    const EXPORTS = /(?:export\s+(?:async\s+)?(?:function|const|class)|^\s*(?:async\s+)?def|^\s*class)\s+([A-Za-z_]\w{3,})/gm;
    for (const m of file.text.matchAll(EXPORTS)) if (m[1]) exported.add(m[1]);

    const escaped = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const names = [...exported].slice(0, 24).map(escaped);
    const importPattern = new RegExp(
      `(?:import|require|from)\\s*\\(?['"\`][^'"\`]*${escaped(stem)}['"\`]|\\b(?:import|from)\\s+[\\w.]*${escaped(stem)}\\b`,
    );
    const callPattern = names.length ? new RegExp(`\\b(?:${names.join('|')})\\s*\\(`) : null;
    const IMPORT_STATEMENT = /^\s*(?:import\s|from\s|export\s+.*\sfrom\s|const\s+[\w{},\s]+=\s*require\()/;

    const calls: Evidence[] = [];
    const imports: Evidence[] = [];
    for (const other of readable) {
      if (calls.length >= 3 && imports.length >= 3) break;
      if (other.path === file.path) continue;
      const lines = other.text.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        if (line.length > 2000) continue;
        // A call inside an import statement is the import, not a call site.
        const isImportLine = IMPORT_STATEMENT.test(line);
        const called = !isImportLine && callPattern !== null && callPattern.test(line);
        const imported = importPattern.test(line);
        if (!called && !imported) continue;
        const evidence: Evidence = {
          path: other.path,
          line: i + 1,
          snippet: trimSnippet(line),
          fileSha256: other.sha256,
          kind: 'code',
          note: called ? `Calls into ${file.path}.` : `Imports ${file.path}.`,
        };
        if (called && calls.length < 3) calls.push(evidence);
        else if (!called && imports.length < 3) imports.push(evidence);
        if (called) break;
      }
    }
    return { calls, imports };
  };

  return {
    snapshot,
    signals: input.signals,
    classification: input.classification,
    profile: input.profile,
    findFile: (pattern) => findFiles(pattern)[0],
    findFiles,
    grep,
    grepDocs: (pattern, limit = 6, topic) => {
      if (!topic) return grep(pattern, { paths: DOC_FILE, limit, kind: 'doc' });
      const out: Evidence[] = [];
      for (const file of readable) {
        if (out.length >= limit) break;
        if (!DOC_FILE.test(file.path)) continue;
        const wholeFile = docNameMatches(file.path, topic);
        const eligible = eligibleLines(file.text, topic, wholeFile);
        const lines = file.text.split('\n');
        let fromFile = 0;
        for (let i = 0; i < lines.length && out.length < limit && fromFile < 2; i++) {
          const line = lines[i] ?? '';
          if (line.length > 2000 || !eligible(i + 1)) continue;
          pattern.lastIndex = 0;
          if (!pattern.test(line)) continue;
          out.push({
            path: file.path,
            line: i + 1,
            snippet: trimSnippet(line),
            fileSha256: file.sha256,
            kind: 'doc',
            ...(wholeFile ? {} : { note: 'Matched under an on-topic heading.' }),
          });
          fromFile++;
        }
      }
      return out;
    },
    hasDependency: (name: string | RegExp): Dependency | undefined =>
      snapshot.dependencies.find((d) => (typeof name === 'string' ? d.name === name : name.test(d.name))),
    isReferenced,
  };
}

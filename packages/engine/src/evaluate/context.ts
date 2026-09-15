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

/**
 * Turn a topic scope into a whole-path matcher that only consults the base
 * name, so `docs/ai-act/risk-management.md` matches a `risk` scope and
 * `docs/ai-act/incident-reporting.md` does not.
 */
function namedDoc(topic: RegExp): RegExp {
  return {
    test: (path: string) => {
      if (!DOC_FILE.test(path)) return false;
      const base = path.split('/').pop() ?? path;
      topic.lastIndex = 0;
      return topic.test(base);
    },
  } as RegExp;
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
    // `paths` is matched against the *file name*, never the directory. Every
    // scaffold Annex writes lives under `docs/ai-act/`, so a scope tested
    // against the whole path lets `docs/ai-act/incident-reporting.md` answer
    // the risk-management duty purely because its folder is called "ai-act".
    grepDocs: (pattern, limit = 6, paths) =>
      grep(pattern, {
        paths: paths ? namedDoc(paths) : DOC_FILE,
        limit,
        kind: 'doc',
      }),
    hasDependency: (name: string | RegExp): Dependency | undefined =>
      snapshot.dependencies.find((d) => (typeof name === 'string' ? d.name === name : name.test(d.name))),
    isReferenced,
  };
}

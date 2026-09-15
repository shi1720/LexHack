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

  return {
    snapshot,
    signals: input.signals,
    classification: input.classification,
    profile: input.profile,
    findFile: (pattern) => findFiles(pattern)[0],
    findFiles,
    grep,
    grepDocs: (pattern, limit = 6) =>
      grep(pattern, { paths: /\.(md|mdx|rst|txt|adoc)$/i, limit, kind: 'doc' }),
    hasDependency: (name: string | RegExp): Dependency | undefined =>
      snapshot.dependencies.find((d) => (typeof name === 'string' ? d.name === name : name.test(d.name))),
  };
}

#!/usr/bin/env node
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  ALL_PACKS,
  CORPUS_SIZE,
  benchmarkMarkdown,
  runBenchmark,
  buildSnapshot,
  readTar,
  ENGINE_VERSION,
  IngestError,
  MARKET_PACKS,
  buildDossier,
  controlById,
  diffReports,
  dossierToHtml,
  dossierToMarkdown,
  estimateExposure,
  ingestDirectory,
  ingestGitHub,
  ledgerFingerprint,
  packsForMarkets,
  renderPatch,
  scan,
  scoreControls,
  toAttestation,
  toMlBom,
  toSarif,
  verifyLedgerAgainstResults,
  type RepoSnapshot,
  type ScanReport,
  type SystemProfile,
  generateSigningKey,
  keyFingerprint,
  verifyLedgerSignature,
} from '@annex/engine';
import { c, SYMBOL, clearProgress, money, heading, progress, rule, scoreBar, statusBadge, tierBanner, wrap } from './ui.js';

const CLI_VERSION = '0.1.0';

// ---------------------------------------------------------------------------
// Argument parsing — small enough not to need a dependency
// ---------------------------------------------------------------------------

interface Args {
  command: string;
  positional: string[];
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): Args {
  // A leading flag means no command was given: `annex --version`, `annex -h`.
  const [first = 'help', ...tail] = argv;
  const command = first.startsWith('-') ? 'help' : first;
  const rest = first.startsWith('-') ? argv : tail;
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < rest.length; i++) {
    const token = rest[i]!;
    if (token.startsWith('--')) {
      const [key, inline] = token.slice(2).split('=');
      if (!key) continue;
      if (inline !== undefined) {
        flags[key] = inline;
      } else if (rest[i + 1] && !rest[i + 1]!.startsWith('-')) {
        flags[key] = rest[++i]!;
      } else {
        flags[key] = true;
      }
    } else if (token.startsWith('-') && token.length === 2) {
      flags[token.slice(1)] = rest[i + 1] && !rest[i + 1]!.startsWith('-') ? rest[++i]! : true;
    } else {
      positional.push(token);
    }
  }

  return { command, positional, flags };
}

const str = (v: string | boolean | undefined): string | undefined => (typeof v === 'string' ? v : undefined);
const list = (v: string | boolean | undefined): string[] | undefined => str(v)?.split(',').map((s) => s.trim()).filter(Boolean);

// ---------------------------------------------------------------------------

const HELP = `
${c.bold('annex')} ${c.grey(`v${CLI_VERSION}`)} — conformity evidence, compiled from source code.

${c.bold('USAGE')}
  annex <command> [target] [options]

${c.bold('COMMANDS')}
  ${c.cyan('scan')} [path|owner/repo]   Classify a codebase and evaluate every applicable obligation
  ${c.cyan('dossier')} [path]           Generate the Annex IV technical documentation
  ${c.cyan('fix')} [path]               Write the files that close the gaps, or emit a patch
  ${c.cyan('diff')} --base --head       Detect a substantial modification (git ref or directory)
  ${c.cyan('verify')} <report.json>     Re-derive an evidence ledger from the results it describes
  ${c.cyan('keygen')}                   Create an Ed25519 key pair for signing evidence ledgers
  ${c.cyan('packs')}                    List the rule-pack corpus
  ${c.cyan('benchmark')}                Run the labelled corpus and report accuracy, honestly
  ${c.cyan('explain')} <control-id>     Show an obligation, its citation and how it is detected

${c.bold('SCAN OPTIONS')}
  --format <fmt>       pretty (default) · json · markdown · sarif · cdxa · mlbom
  --out <file>         Write the output to a file instead of stdout
  --fail-under <n>     Exit 1 when the conformity score is below n
  --markets <list>     eu,us-nyc,us-co,us-federal          (default: eu,us-federal)
  --purpose <text>     The system's intended purpose, in one sentence
  --name <text>        System name for the report
  --turnover <eur>     Worldwide annual turnover, for exposure modelling
  --employees <n>      Headcount, for the Recommendation 2003/361/EC SME test
  --balance-sheet <n>  Balance-sheet total; the SME test needs headcount and
                       one financial figure, so unknown resolves to not-an-SME
  --no-eu-nexus        Article 2(1): the system is not placed on the Union
                       market, not put into service there, and its output is
                       not used there. Suppresses the exposure figure.
  --scope-exclusion    research · pre-market · foss   (Art. 2(6), 2(8), 2(12))
  --small-mid-cap      Article 99(6a): the operator is a small mid-cap, which
                       caps Article 99(4) and 99(5) fines at the lower of the
                       two figures — but not Article 99(3), so an Article 5
                       breach still carries the full higher-of amount
  --public-body        Article 27(1): the deployer is a body governed by public
                       law or a private entity providing a public service, which
                       owes a fundamental rights impact assessment whatever the
                       Annex III point
  --article-6-3 <limb> Claim the Article 6(3) derogation from Annex III:
                       narrow-procedural · improves-human-activity ·
                       pattern-detection · preparatory. Annex checks the one
                       limb it can — profiling closes it — and records the
                       Article 6(4) and 49(2) duties that survive.
  --sign <keyfile>     Sign the evidence ledger root with an Ed25519 private
                       key in PKCS#8 PEM (see 'annex keygen'). The chain makes
                       an edit detectable to whoever has the source; the
                       signature makes it detectable to whoever does not
  --token <pat>        GitHub token, for private repositories and rate limits
  --all                Show satisfied and not-applicable controls too
  --quiet              Suppress the progress indicator

${c.bold('DIFF OPTIONS')}
  --base <ref|dir>     The tree to compare against; --head defaults to HEAD
  --all                List every regressed control, not the first eight

${c.bold('VERIFY OPTIONS')}
  --against <dir>      Re-hash every cited file off disk, so a report that no
                       longer describes the tree it claims to describe says so
  --pubkey <file>      Check the ledger signature against a key you already
                       trust. Without it a signature is still checked, but only
                       against the key carried inside the report — which proves
                       the report has not been edited since somebody signed it,
                       not who that somebody is

${c.bold('DOSSIER OPTIONS')}
  --locale <en|de|fr>  Article 11 requires documentation in a language the
                       Member State determines. Headings are localised.
  --html               Emit print-ready HTML instead of Markdown
  --simplified         Article 11(1) simplified form for SMEs and start-ups

${c.bold('EXAMPLES')}
  ${c.grey('$')} annex scan .
  ${c.grey('$')} annex scan vercel/ai --markets eu --purpose "Chat assistant SDK"
  ${c.grey('$')} annex scan . --format sarif --out annex.sarif --fail-under 70
  ${c.grey('$')} annex dossier . --html --out dossier.html
  ${c.grey('$')} annex fix . --patch conformity.patch
  ${c.grey('$')} annex diff --base origin/main --head HEAD
  ${c.grey('$')} annex verify report.json --against .
`;

// ---------------------------------------------------------------------------

/**
 * A misspelt flag is silently ignored by every hand-rolled parser, which in a
 * compliance tool means `--fail-undr 70` is a green build. Annex names them.
 */
const GLOBAL_FLAGS = ['help', 'h', 'version', 'v', 'quiet'];
/** Everything `profileFrom` reads, so the registry cannot drift from it. */
const PROFILE_FLAGS = [
  'markets', 'purpose', 'name', 'turnover', 'employees', 'balance-sheet',
  'no-eu-nexus', 'scope-exclusion', 'article-6-3', 'public-body', 'small-mid-cap',
];
const KNOWN_FLAGS: Record<string, string[]> = {
  scan: [...PROFILE_FLAGS, 'format', 'out', 'fail-under', 'token', 'all', 'ref', 'sign'],
  dossier: [...PROFILE_FLAGS, 'locale', 'html', 'out', 'token', 'simplified', 'ref'],
  fix: [...PROFILE_FLAGS, 'patch', 'out', 'write', 'token', 'ref'],
  diff: [...PROFILE_FLAGS, 'base', 'head', 'token', 'all'],
  verify: ['against', 'pubkey'],
  keygen: ['out'],
  packs: [],
  explain: [],
  benchmark: ['format', 'out'],
  help: [],
};

/**
 * Flags that take a value. Given none, they must fail rather than fall back.
 *
 * The parser turns `--fail-under --markets eu` into `failUnder: true`, and
 * every consumer read that as "not supplied" — so a CI gate written with a
 * typo'd or dropped value passed silently, which is the exact failure the
 * unknown-flag check above exists to prevent, one step further along.
 */
const VALUE_FLAGS = new Set([
  'format', 'out', 'fail-under', 'markets', 'purpose', 'name', 'turnover', 'employees',
  'balance-sheet', 'scope-exclusion', 'article-6-3', 'token', 'ref', 'sign', 'against',
  'pubkey', 'locale', 'base', 'head', 'patch',
]);

function valuelessFlags(args: Args): string[] {
  return Object.entries(args.flags)
    .filter(([name, value]) => value === true && VALUE_FLAGS.has(name))
    .map(([name]) => name);
}

function unknownFlags(args: Args): string[] {
  const known = KNOWN_FLAGS[args.command];
  if (!known) return [];
  return Object.keys(args.flags).filter((f) => !known.includes(f) && !GLOBAL_FLAGS.includes(f));
}

// ---------------------------------------------------------------------------

async function loadSnapshot(target: string, flags: Args['flags']): Promise<RepoSnapshot> {
  // A local directory always wins: `annex scan fixtures/hireflow` should not
  // be interpreted as the GitHub repository "fixtures/hireflow".
  const localDir = await stat(resolve(target))
    .then((s) => s.isDirectory())
    .catch(() => false);
  const looksRemote =
    !localDir &&
    (/^(https?:\/\/|github\.com\/)/.test(target) || (/^[\w.-]+\/[\w.-]+$/.test(target) && !target.startsWith('.')));

  if (looksRemote) {
    const token = str(flags.token) ?? process.env.GITHUB_TOKEN;
    const { snapshot } = await ingestGitHub(target, token ? { token } : {});
    return snapshot;
  }

  const path = resolve(target);
  const snapshot = await ingestDirectory(path, { name: str(flags.name) ?? undefined });
  // Annotate with the git commit when there is one — it is what the dossier cites.
  try {
    const commit = execFileSync('git', ['-C', path, 'rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const branch = execFileSync('git', ['-C', path, 'rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return { ...snapshot, commit, ref: branch };
  } catch {
    return snapshot;
  }
}

function profileFrom(flags: Args['flags']): Partial<SystemProfile> {
  const profile: Partial<SystemProfile> = {};
  const name = str(flags.name);
  const purpose = str(flags.purpose);
  const markets = list(flags.markets);
  const turnover = str(flags.turnover);
  const employees = str(flags.employees);
  if (name) profile.name = name;
  if (purpose) profile.purpose = purpose;
  if (markets) profile.markets = markets;
  if (turnover) profile.turnoverEur = Number(turnover.replace(/[_,]/g, ''));
  if (employees) profile.employees = Number(employees);

  const balance = str(flags['balance-sheet']);
  if (balance) profile.balanceSheetEur = Number(balance.replace(/[_,]/g, ''));

  // Article 27(1) limbs (i) and (ii). Not visible in code, and without it the
  // fundamental rights impact assessment reaches only the Annex III point 5
  // use cases — so a municipality's recruitment tool owed a FRIA and was
  // never asked for one.
  if (flags['public-body']) profile.publicBodyOrPublicService = true;

  // Article 99(6a). Separate from the SME test because the inversion it gives
  // reaches paragraphs 4 and 5 and not paragraph 3.
  if (flags['small-mid-cap']) profile.smallMidCap = true;

  // Article 2(1). The gate is opt-out rather than opt-in because most people
  // scanning are asking "does this reach me", and answering "no" for them by
  // default would be the more expensive mistake.
  if (flags['no-eu-nexus']) profile.euNexus = false;

  const exclusions = list(flags['scope-exclusion'])?.filter(
    (v): v is NonNullable<SystemProfile['scopeExclusions']>[number] =>
      v === 'research' || v === 'pre-market' || v === 'foss',
  );
  if (exclusions?.length) profile.scopeExclusions = exclusions;

  const locale = str(flags.locale);
  if (locale !== undefined && !['en', 'de', 'fr'].includes(locale)) {
    throw new Error(`--locale expects one of: en, de, fr (got "${locale}").`);
  }

  const derogation = str(flags['article-6-3']);
  if (derogation) {
    const limbs = ['narrow-procedural', 'improves-human-activity', 'pattern-detection', 'preparatory'] as const;
    const claimed = limbs.find((l) => l === derogation);
    if (!claimed) {
      throw new Error(`--article-6-3 expects one of: ${limbs.join(', ')} (got "${derogation}").`);
    }
    profile.article6_3Derogation = claimed;
  }
  return profile;
}

async function emit(content: string, out: string | undefined): Promise<void> {
  if (!out) {
    process.stdout.write(content.endsWith('\n') ? content : content + '\n');
    return;
  }
  await mkdir(dirname(resolve(out)), { recursive: true });
  await writeFile(resolve(out), content, 'utf8');
  process.stderr.write(`${c.green(SYMBOL.pass)} wrote ${c.bold(out)}\n`);
}

// ---------------------------------------------------------------------------
// scan
// ---------------------------------------------------------------------------

async function runScan(args: Args): Promise<number> {
  const target = args.positional[0] ?? '.';
  const quiet = Boolean(args.flags.quiet) || str(args.flags.format) !== undefined;

  if (!quiet) process.stderr.write(`${c.grey('reading')} ${c.bold(target)}\n`);
  const snapshot = await loadSnapshot(target, args.flags);

  const signKeyPath = str(args.flags.sign);
  const signingKey = signKeyPath ? await readFile(resolve(signKeyPath), 'utf8') : undefined;

  const report = scan(snapshot, {
    profile: profileFrom(args.flags),
    remediate: true,
    ...(signingKey ? { signingKey } : {}),
    onProgress: quiet ? undefined : (phase, done, total) => progress(phase, done, total),
  });
  if (!quiet) clearProgress();

  const format = str(args.flags.format) ?? 'pretty';
  const out = str(args.flags.out);

  switch (format) {
    case 'json':
      await emit(JSON.stringify(report, null, 2), out);
      break;
    case 'sarif':
      await emit(toSarif(report), out);
      break;
    case 'cdxa':
      await emit(toAttestation(report, packsForMarkets(report.profile.markets)), out);
      break;
    case 'mlbom':
      await emit(toMlBom(report), out);
      break;
    case 'markdown':
      await emit(renderMarkdown(report), out);
      break;
    case 'pretty':
      renderPretty(report, Boolean(args.flags.all));
      break;
    default:
      process.stderr.write(c.red(`Unknown format "${format}".\n`));
      return 2;
  }

  /**
   * The gate. Everything below is about refusing to pass rather than about
   * passing, because a CI check that goes green over nothing is worse than no
   * check at all — it is a check somebody is relying on.
   */
  if (args.flags['fail-under'] === true) {
    process.stderr.write(c.red('--fail-under needs a number: --fail-under 70.\n'));
    return 2;
  }
  const floor = str(args.flags['fail-under']);
  if (floor !== undefined) {
    const value = Number(floor);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      process.stderr.write(c.red(`--fail-under expects a number from 0 to 100, got "${floor}".\n`));
      return 2;
    }

    // Every way a scan can be degenerate, named. Each of these used to produce
    // `conformity 100/100 over 0 applicable obligations` and exit 0.
    //
    // A `.annexignore` exclusion is deliberately **not** on this list, and the
    // distinction is the whole design of the flag. An exclusion is a boundary
    // the auditee *declared*: the excluded files are still ingested, still
    // hashed, still counted in the tree digest and now named in the report, so
    // a reader can see exactly what was left out and the snapshot id changes
    // the moment the list does. Truncation and an unreadable tree are
    // different — there the scan does not know what it missed.
    //
    // Refusing on any exclusion at all was the earlier behaviour and it was
    // wrong twice over. It made the flag unusable on every repository with
    // vendored code or generated files, which is most of them; and it did not
    // stop the attack it was written for, because anyone willing to exclude
    // the incriminating file is willing to drop the flag. What does stop it is
    // making the exclusion visible in an artefact the auditee cannot edit
    // without breaking the ledger — which is what the list below prints.
    const refusals: string[] = [];
    const read = report.snapshot.fileCount - report.snapshot.ignoredCount;
    if (report.snapshot.fileCount === 0) refusals.push('the snapshot contains no readable source files');
    else if (read <= 0) {
      refusals.push(`all ${report.snapshot.fileCount} files were excluded by .annexignore, so nothing was analysed`);
    }
    if (report.score === null) {
      refusals.push('no obligation applied to this repository, so there is nothing to score');
    }
    if (report.snapshot.truncated) {
      refusals.push(`the tree was truncated at ${report.snapshot.fileCount} files, so part of it was never read`);
    }
    // The cheapest way to hide a file is to make it too big to read. This
    // check existed as `const oversize = report.snapshot.sampledPaths ===
    // undefined ? 0 : 0;` — a no-op reading the wrong field — so appending
    // padding to the one file containing the prohibited practice produced
    // `100/100 over 2 applicable obligations` and exit 0 against a floor of 90.
    const oversize = report.snapshot.oversizePaths ?? [];
    if (oversize.length > 0) {
      refusals.push(
        `${oversize.length} file(s) were too large to read and were not analysed: ${oversize.slice(0, 3).join(', ')}${oversize.length > 3 ? `, and ${oversize.length - 3} more` : ''}`,
      );
    }
    if (refusals.length > 0) {
      process.stderr.write(`\n${c.red(SYMBOL.fail)} --fail-under refuses this scan:\n`);
      for (const r of refusals) process.stderr.write(c.grey(`    · ${r}\n`));
      process.stderr.write(
        c.grey('  A conformity floor is a statement about a tree that was read. Fix the scan or\n') +
          c.grey('  drop the flag; passing a gate over an unread repository is the failure this\n') +
          c.grey('  refuses to produce.\n'),
      );
      return 2;
    }

    // A floor that passes silently over a partly-read tree is the number
    // without its denominator. Where anything was excluded, the paths go
    // beside the verdict rather than in a warnings block above it.
    if (report.snapshot.ignoredCount > 0) {
      const excluded = report.snapshot.ignoredPaths ?? [];
      process.stderr.write(
        c.grey(
          `\n  ${read} of ${report.snapshot.fileCount} files were analysed; ${report.snapshot.ignoredCount} excluded by .annexignore.\n`,
        ),
      );
      for (const p of excluded.slice(0, 5)) process.stderr.write(c.grey(`    · ${p}\n`));
      if (excluded.length > 5) process.stderr.write(c.grey(`    · and ${excluded.length - 5} more, all named in the report\n`));
    }

    // `refusals` already returned for a null score; this narrows for the type.
    if (report.score !== null && report.score < value) {
      process.stderr.write(
        `\n${c.red(SYMBOL.fail)} conformity score ${c.bold(String(report.score))} is below the floor of ${c.bold(floor)}.\n`,
      );
      return 1;
    }
  }
  return 0;
}

function renderPretty(report: ScanReport, showAll: boolean): void {
  const out = process.stdout;
  const applicable = report.controls.filter((r) => r.status !== 'not_applicable');
  const failing = applicable.filter((r) => r.status !== 'satisfied');
  const live = applicable.filter((r) => r.inForce);
  const liveFailing = live.filter((r) => r.status !== 'satisfied');

  out.write('\n' + tierBanner(report.classification.tier, report.classification.summary) + '\n\n');

  out.write(`  ${c.grey('repository')}   ${c.bold(report.snapshot.name)} ${c.grey(`· ${report.snapshot.fileCount} files · ${report.durationMs} ms`)}\n`);
  out.write(`  ${c.grey('your role')}    ${report.classification.role.replace('+', ' and ')} ${c.grey('(Arts. 3(3), 3(4))')}\n`);
  // Print the denominator. A score is a fraction and the numerator alone is
  // how "100/100" ends up meaning "the two obligations that apply are met" —
  // which is a true statement and a much smaller one than it looks.
  if (report.score === null) {
    out.write(
      `  ${c.grey('conformity')}   ${c.yellow('not assessed')}  ${c.grey('no obligation in the selected markets applied to this repository')}\n`,
    );
  } else {
    out.write(
      `  ${c.grey('conformity')}   ${scoreBar(report.score)}  ${c.grey(`over ${applicable.length} applicable obligation${applicable.length === 1 ? '' : 's'}`)}\n`,
    );
    out.write(
      report.liveScore === null
        ? `  ${c.grey('in force now')} ${c.yellow('not assessed')}  ${c.grey('no obligation in the selected markets is in force yet')}\n`
        : `  ${c.grey('in force now')} ${scoreBar(report.liveScore)}  ${c.grey(`${liveFailing.length} of ${live.length} live obligations failing`)}\n`,
    );
  }
  // Coverage belongs beside the score, not in a warnings array below it. The
  // auditee writes the .annexignore, and "2 files excluded" under a green bar
  // is the whole audit in the hands of the party being audited.
  const unread = report.snapshot.ignoredCount + (report.snapshot.truncated ? 1 : 0);
  if (unread > 0) {
    out.write(
      `  ${c.grey('coverage')}     ${c.yellow(`${report.snapshot.fileCount - report.snapshot.ignoredCount} of ${report.snapshot.fileCount} files read`)}` +
        `${report.snapshot.ignoredCount > 0 ? c.grey(`  · ${report.snapshot.ignoredCount} excluded by .annexignore`) : ''}` +
        `${report.snapshot.truncated ? c.grey('  · tree truncated at the ingest limit') : ''}\n`,
    );
  }
  out.write(`  ${c.grey('ledger')}       ${c.cyan(ledgerFingerprint(report.ledger))}\n`);
  if (report.exposure.maxFine > 0) {
    // Cite whichever regime actually sets the headline ceiling — it is not
    // always the AI Act; for a system that fails GDPR too, Article 83(5) is
    // the higher number and the reader is owed the article it comes from.
    const headline = report.exposure.byRegime[0]?.citation;
    out.write(
      `  ${c.grey('exposure')}     ${c.red(c.bold(money(report.exposure.maxFine, report.exposure.currency)))} ${c.grey(
        headline ? `statutory ceiling, not a forecast (${headline.short} ${headline.locator})` : 'statutory ceiling, not a forecast',
      )}\n`,
    );
    for (const r of report.exposure.byRegime.slice(1)) {
      out.write(`               ${c.grey(`+ ${r.packName}: ${money(r.amount, r.currency)}${r.multiplier ? ` ${r.multiplier}` : ''}`)}\n`);
    }
  }

  if (report.classification.findings.length > 0) {
    out.write(heading('Classification') + '\n');
    for (const finding of report.classification.findings) {
      const cite = finding.citations[0];
      out.write(
        `  ${finding.tier === 'prohibited' ? c.red(SYMBOL.fail) : c.yellow(SYMBOL.warn)} ${c.bold(finding.title)} ${c.grey(`${Math.round(finding.confidence * 100)}% confidence`)}\n`,
      );
      if (cite) out.write(`    ${c.cyan(`${cite.short} ${cite.locator}`)} ${c.grey(cite.title)}\n`);
      for (const e of finding.evidence.slice(0, 2)) {
        out.write(`    ${c.grey(`${e.path}:${e.line}`)}  ${e.snippet.trim().slice(0, 78)}\n`);
      }
      out.write('\n');
    }
  }

  const shown = showAll ? applicable : failing;
  if (shown.length > 0) {
    out.write(heading(showAll ? 'Obligations' : 'Gaps') + '\n');
    const byPack = new Map<string, typeof shown>();
    for (const r of shown) byPack.set(r.pack, [...(byPack.get(r.pack) ?? []), r]);

    for (const [packId, controls] of byPack) {
      const pack = ALL_PACKS.find((p) => p.id === packId);
      out.write(`\n  ${c.bold(pack?.name ?? packId)} ${c.grey(`${pack?.version ?? ''} · ${pack?.jurisdiction ?? ''}`)}\n`);
      for (const control of controls) {
        const cite = control.citations[0];
        const clock = control.inForce ? c.red('IN FORCE') : c.grey(`from ${control.appliesFrom}`);
        out.write(`    ${statusBadge(control.status)} ${c.bold(control.title)}  ${clock}\n`);
        out.write(`      ${c.cyan(cite ? `${cite.short} ${cite.locator}` : control.controlId)}\n`);
        out.write(wrap(control.finding, 74, '      ') + '\n');
        if (control.gap) out.write(c.grey(wrap(`${SYMBOL.arrow} ${control.gap}`, 74, '      ')) + '\n');
        for (const e of control.evidence.filter((x) => x.kind !== 'absence').slice(0, 2)) {
          out.write(`      ${c.grey(`${e.path}:${e.line}`)}  ${e.snippet.trim().slice(0, 70)}\n`);
        }
        out.write('\n');
      }
    }
  } else if (report.score === null) {
    // "Every applicable obligation is evidenced" over an empty applicable set
    // is true in the way a vacuous statement is true, and it reads as a pass.
    out.write(
      `\n  ${c.yellow(SYMBOL.warn)} No obligation applied, so nothing was assessed. That is a statement about\n` +
        `    what Annex could read, not about this system: check the languages, the\n` +
        `    .annexignore and the selected markets before treating it as a clean result.\n`,
    );
  } else {
    out.write(`\n  ${c.green(SYMBOL.pass)} every applicable obligation is evidenced.\n`);
  }

  if (report.clock.next) {
    const n = report.clock.next;
    out.write(heading('Next deadline') + '\n');
    out.write(`  ${c.bold(n.label)} ${c.grey(`— ${n.date}, in ${n.daysAway} days`)}\n`);
    out.write(wrap(n.note, 74) + '\n');
    out.write(`  ${c.grey(`${n.controlIds.length} obligation${n.controlIds.length === 1 ? '' : 's'} attached to this date are not yet evidenced.`)}\n`);
  }

  if (report.remediation) {
    out.write(heading('Remediation available') + '\n');
    out.write(
      `  ${c.green(SYMBOL.arrow)} ${c.bold('annex fix .')} writes ${report.remediation.files.length} files and closes ${report.remediation.closes.length} obligations ${c.grey(`(score ${report.remediation.scoreBefore} → ${report.remediation.scoreAfter})`)}\n`,
    );
    for (const f of report.remediation.files) out.write(`     ${c.grey(SYMBOL.bullet)} ${f.path}\n`);
  }

  for (const warning of report.warnings) out.write(`\n  ${c.yellow(SYMBOL.warn)} ${warning}\n`);

  out.write(
    `\n${rule()}\n${c.grey(`annex ${ENGINE_VERSION} · ${CORPUS_SIZE} obligations in corpus · deterministic, offline, no model called`)}\n`,
  );
}

function renderMarkdown(report: ScanReport): string {
  const applicable = report.controls.filter((r) => r.status !== 'not_applicable');
  const lines = [
    `# AI Act conformity — ${report.snapshot.name}`,
    '',
    `**${report.classification.summary}**`,
    '',
    `| | |`,
    `|---|---|`,
    // `null` is "not assessed", and interpolating it printed the literal
    // word `null` into a markdown report — the mirror image of the `0` the
    // nullable score was introduced to stop.
    `| Conformity score | ${report.score === null ? '_not assessed_' : `**${report.score}/100**`} |`,
    `| Obligations in force today | ${report.liveScore === null ? '_not assessed_' : `${report.liveScore}/100`} |`,
    `| Role under Articles 3(3) and 3(4) | ${report.classification.role.replace('+', ' and ')} |`,
    `| Statutory maximum administrative fine | ${money(report.exposure.maxFine, report.exposure.currency)} |`,
    `| Evidence ledger | \`${ledgerFingerprint(report.ledger)}\` |`,
    `| Scanned | ${report.snapshot.fileCount} files in ${report.durationMs} ms |`,
    '',
  ];

  if (report.classification.findings.length) {
    lines.push('## Classification', '');
    for (const f of report.classification.findings) {
      const cite = f.citations[0];
      lines.push(`### ${f.title}`, '', `${cite ? `**${cite.short} ${cite.locator}** — ` : ''}${f.rationale}`, '');
      for (const e of f.evidence.slice(0, 3)) lines.push(`- \`${e.path}:${e.line}\` — \`${e.snippet.trim()}\``);
      lines.push('');
    }
  }

  lines.push('## Obligations', '', '| Status | Obligation | Citation | In force | Finding |', '|---|---|---|---|---|');
  for (const r of applicable) {
    const cite = r.citations[0];
    lines.push(
      `| ${r.status} | ${r.title} | ${cite ? `${cite.short} ${cite.locator}` : r.controlId} | ${r.inForce ? 'yes' : r.appliesFrom} | ${r.finding.replace(/\|/g, '\\|')} |`,
    );
  }
  lines.push('', `_Generated by Annex ${ENGINE_VERSION}. Ledger root \`${report.ledger.root}\`._`);
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// dossier / fix / diff / verify / packs / explain
// ---------------------------------------------------------------------------

async function runDossier(args: Args): Promise<number> {
  const snapshot = await loadSnapshot(args.positional[0] ?? '.', args.flags);
  const report = scan(snapshot, { profile: profileFrom(args.flags) });
  const locale = (str(args.flags.locale) ?? 'en') as 'en' | 'de' | 'fr';
  const dossier = buildDossier(report, { locale, simplified: Boolean(args.flags.simplified) });
  const content = args.flags.html ? dossierToHtml(dossier, report) : dossierToMarkdown(dossier, report);
  await emit(content, str(args.flags.out));

  if (!args.flags.out) return 0;
  process.stderr.write(
    `${c.grey('  ')}${dossier.evidenceCount} evidence citations · ${c.yellow(String(dossier.openCount))} open items only a human can close\n`,
  );
  return 0;
}

async function runFix(args: Args): Promise<number> {
  const target = args.positional[0] ?? '.';
  const snapshot = await loadSnapshot(target, args.flags);
  const report = scan(snapshot, { profile: profileFrom(args.flags), remediate: true });

  if (!report.remediation) {
    process.stdout.write(`${c.green(SYMBOL.pass)} nothing to fix: every gap with an available remediation is already closed.\n`);
    return 0;
  }

  const patchPath = str(args.flags.patch);
  if (patchPath) {
    await emit(renderPatch(report.remediation), patchPath);
    process.stderr.write(c.grey(`  apply with: git apply ${patchPath}\n`));
    return 0;
  }

  const root = resolve(target);
  for (const file of report.remediation.files) {
    const dest = resolve(root, file.path);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, file.contents, 'utf8');
    process.stdout.write(`${c.green(SYMBOL.pass)} ${file.path} ${c.grey(file.description)}\n`);
  }
  process.stdout.write(
    `\n${c.bold(`${report.remediation.files.length} files written`)}, closing ${report.remediation.closes.length} obligations ${c.grey(`(projected score ${report.remediation.scoreBefore} → ${report.remediation.scoreAfter})`)}\n`,
  );
  process.stdout.write(c.grey(wrap('Each file is scaffolding backed by statute, not finished compliance. The TODO markers are the points where the answer is a judgement your organisation has to make; Annex leaves them blank on purpose.', 74, '  ')) + '\n');
  return 0;
}

async function runDiff(args: Args): Promise<number> {
  const target = args.positional[0] ?? '.';
  const base = str(args.flags.base);
  const head = str(args.flags.head) ?? 'HEAD';
  if (!base) {
    process.stderr.write(c.red('annex diff needs --base <ref>.\n'));
    return 2;
  }

  const root = resolve(target);
  const profile = profileFrom(args.flags);

  /**
   * Either side may be a git ref or a directory.
   *
   * Comparing two directories is the form that works in a demo, in a tarball,
   * and in a repository with no history — and `git archive` gives us a ref's
   * tree without touching the working copy, so there is nothing to stash and
   * nothing to clean up if the scan throws.
   */
  const treeFor = async (ref: string, label: string): Promise<RepoSnapshot> => {
    const isDir = await stat(resolve(ref))
      .then((s) => s.isDirectory())
      .catch(() => false);
    if (isDir) return ingestDirectory(resolve(ref), { name: ref });

    const tar = execFileSync('git', ['-C', root, 'archive', '--format=tar', ref], {
      maxBuffer: 256 * 1024 * 1024,
    });
    return buildSnapshot({
      name: `${root.split('/').pop()}@${label}`,
      files: readTar(Buffer.from(tar)).map((e) => ({ path: e.path, bytes: e.bytes })),
    });
  };

  let beforeSnapshot: RepoSnapshot;
  let afterSnapshot: RepoSnapshot;
  try {
    beforeSnapshot = await treeFor(base, base);
    afterSnapshot = await treeFor(head, head);
  } catch (err) {
    process.stderr.write(c.red(`Could not read the tree to compare: ${(err as Error).message}\n`));
    process.stderr.write(
      c.grey('  --base and --head each take a git ref that exists locally, or a directory path.\n'),
    );
    return 2;
  }

  const before = scan(beforeSnapshot, { profile });
  const after = scan(afterSnapshot, { profile });
  const drift = diffReports(before, after);

  process.stdout.write('\n');
  process.stdout.write(
    drift.substantial
      ? `${c.bgRed(' SUBSTANTIAL MODIFICATION ')} ${c.bold(`${base} → ${head}`)}\n\n`
      : `${c.bgGreen(' NO SUBSTANTIAL MODIFICATION ')} ${c.bold(`${base} → ${head}`)}\n\n`,
  );
  process.stdout.write(wrap(drift.summary, 76) + '\n\n');
  process.stdout.write(`  ${c.grey('conformity')}  ${before.score} → ${after.score} ${drift.scoreDelta >= 0 ? c.green(`(+${drift.scoreDelta})`) : c.red(`(${drift.scoreDelta})`)}\n`);
  process.stdout.write(`  ${c.grey('tier')}        ${drift.previousTier} → ${drift.classificationChanged ? c.red(drift.currentTier) : drift.currentTier}\n\n`);

  /**
   * A tier change can regress thirty controls at once, and a pull-request
   * comment that lists all of them is read by nobody. Show the head of the
   * list and say how many are behind it; --all prints the whole thing, and
   * `--format json` on `annex scan` is there when a machine needs every row.
   */
  const showAll = Boolean(args.flags.all);
  const shown = showAll ? drift.regressed : drift.regressed.slice(0, 8);
  for (const r of shown) {
    process.stdout.write(`  ${c.red(SYMBOL.fail)} ${c.bold(r.title)} ${c.grey(`${r.from} → ${r.to}`)}\n    ${c.grey(r.controlId)}\n`);
  }
  const hidden = drift.regressed.length - shown.length;
  if (hidden > 0) {
    process.stdout.write(c.grey(`  … ${hidden} more regression${hidden === 1 ? '' : 's'}; pass --all to list them\n`));
  }
  for (const r of drift.improved) {
    process.stdout.write(`  ${c.green(SYMBOL.pass)} ${r.title} ${c.grey(`${r.from} → ${r.to}`)}\n`);
  }

  if (drift.substantial) {
    process.stdout.write(
      `\n${c.grey(wrap('Article 43(4): where a high-risk AI system is substantially modified, it must undergo a new conformity assessment. The technical documentation is now out of date.', 74, '  '))}\n`,
    );
  }
  return drift.substantial ? 1 : 0;
}

/**
 * A report is untrusted input — it arrives as a file, often from the party
 * being audited. Check its shape before touching it, so a malformed dossier
 * produces a sentence rather than a stack trace.
 */
/**
 * Validate the elements, not just the arrays.
 *
 * Checking that `controls` is an array and then dereferencing its members got
 * an internal TypeError — "Cannot read properties of undefined (reading
 * 'map')" — on a file that is simply not an Annex report. The user should be
 * told that, not handed a stack frame.
 */
function badControl(controls: unknown[]): string | null {
  for (const [i, value] of controls.entries()) {
    const c = value as Record<string, unknown> | null;
    if (!c || typeof c !== 'object') return `controls[${i}] is not an object`;
    if (typeof c.controlId !== 'string') return `controls[${i}] has no controlId`;
    if (typeof c.pack !== 'string') return `controls[${i}] has no pack`;
    if (typeof c.status !== 'string') return `controls[${i}] has no status`;
    if (typeof c.score !== 'number' || !Number.isFinite(c.score)) return `controls[${i}].score is not a number`;
    if (typeof c.weight !== 'number' || !Number.isFinite(c.weight)) return `controls[${i}].weight is not a number`;
    if (!Array.isArray(c.evidence)) return `controls[${i}] has no evidence array`;
  }
  return null;
}

function assertReportShape(value: unknown, path: string): asserts value is ScanReport {
  const r = value as Partial<ScanReport> | null;
  const problem =
    !r || typeof r !== 'object'
      ? 'not a JSON object'
      : !Array.isArray(r.controls)
        ? 'no "controls" array'
        : !Array.isArray(r.packs)
          ? 'no "packs" array'
          : !r.ledger || !Array.isArray(r.ledger.entries) || typeof r.ledger.root !== 'string'
            ? 'no evidence ledger'
            : !r.classification || typeof r.classification !== 'object'
              ? 'no classification'
              : !r.exposure || typeof r.exposure !== 'object'
                ? 'no exposure block'
                : badControl(r.controls);
  if (problem) throw new Error(`${path} is not an Annex scan report (${problem}).`);
}

/**
 * Re-hash every file the report cites, straight off disk.
 *
 * The ledger proves the report is internally consistent. It cannot, on its
 * own, prove that the *source* still says what the report says it said —
 * `fileSha256` is a number the report carries about itself. This closes that
 * loop: point `--against` at the working tree and every cited digest is
 * recomputed from the bytes actually on disk.
 */
async function reHashCitedFiles(
  report: ScanReport,
  root: string,
): Promise<{ checked: number; missing: string[]; changed: string[] }> {
  const expected = new Map<string, string>();
  for (const control of report.controls) {
    for (const e of control.evidence) {
      if (e.kind === 'absence' || !e.fileSha256) continue;
      expected.set(e.path, e.fileSha256);
    }
  }

  const missing: string[] = [];
  const changed: string[] = [];
  for (const [relPath, digest] of expected) {
    let bytes: Buffer;
    try {
      bytes = await readFile(resolve(root, relPath));
    } catch {
      missing.push(relPath);
      continue;
    }
    if (createHash('sha256').update(bytes).digest('hex') !== digest) changed.push(relPath);
  }
  return { checked: expected.size, missing, changed };
}

/**
 * Does the report's headline follow from the results the ledger covers?
 *
 * The score and the tier are *derived* values: recomputing them is cheap and
 * closes the gap between "these results are authentic" and "this document is
 * telling you the truth about them".
 */
function summaryMismatches(report: ScanReport): string[] {
  const out: string[] = [];

  const score = scoreControls(report.controls);
  if (score !== report.score) {
    out.push(`the report claims a conformity score of ${report.score}; its own controls produce ${score}`);
  }

  const live = scoreControls(report.controls.filter((r) => r.inForce));
  if (live !== report.liveScore) {
    out.push(`the report claims an in-force score of ${report.liveScore}; its own controls produce ${live}`);
  }

  const prohibited = report.controls.some(
    (r) => r.family === 'prohibition' && r.status === 'missing' && r.inForce,
  );
  if (prohibited && report.classification.tier !== 'prohibited') {
    out.push(
      `the report is tiered "${report.classification.tier}" while a prohibition that is already in force is recorded as missing`,
    );
  }

  const failing = report.controls.filter((r) => r.inForce && (r.status === 'missing' || r.status === 'partial'));
  if (failing.length > 0 && report.exposure.maxFine === 0 && report.profile.euNexus !== false) {
    out.push(`the report models no exposure while ${failing.length} in-force obligation(s) are failing`);
  }

  // The exposure is a pure function of the controls, the packs and the
  // profile, all of which the report carries — so recompute it rather than
  // checking one degenerate case. Editing `exposure.maxFine` from €15,000,000
  // to €250,000 in an unsigned report used to pass `verify` with LEDGER
  // INTACT and exit 0.
  try {
    const recomputed = estimateExposure(packsForMarkets(report.profile.markets), report.controls, report.profile);
    if (recomputed.maxFine !== report.exposure.maxFine || recomputed.currency !== report.exposure.currency) {
      out.push(
        `the report states a ceiling of ${report.exposure.maxFine} ${report.exposure.currency}; its own controls and profile produce ${recomputed.maxFine} ${recomputed.currency}`,
      );
    }
  } catch {
    // An unknown market is reported by `assertReportShape`, not here.
  }

  // The tier. A report cannot be `minimal` while the obligations that only
  // attach to a high-risk system are sitting in it marked applicable: the
  // same edit that demoted the exposure demoted `classification.tier` from
  // `high` to `minimal`, and nothing looked.
  const TIER_ORDER = ['minimal', 'transparency', 'high', 'prohibited'];
  const chapterIII = report.controls.filter(
    (r) => r.controlId.startsWith('eu-ai-act.art') && r.status !== 'not_applicable' && HIGH_RISK_ARTICLE.test(r.controlId),
  );
  if (chapterIII.length >= 3 && TIER_ORDER.indexOf(report.classification.tier) < TIER_ORDER.indexOf('high')) {
    out.push(
      `the report is tiered "${report.classification.tier}" while ${chapterIII.length} obligations that attach only to a high-risk system are recorded as applicable`,
    );
  }

  return out;
}

/** The Chapter III, Section 2 articles — the ones only a high-risk system owes. */
const HIGH_RISK_ARTICLE = /\.art(?:9|10|11|12|13|14|15|17|43|47|48)\./;

/**
 * Create a signing key pair.
 *
 * Deliberately two files with different permissions rather than one bundle:
 * the whole value of the public key is that you can hand it to somebody, and
 * the whole value of the private one is that you never do.
 */
async function runKeygen(args: Args): Promise<number> {
  const dir = str(args.flags.out) ?? '.';
  await mkdir(resolve(dir), { recursive: true });
  const { privateKey, publicKey } = generateSigningKey();
  const privatePath = resolve(dir, 'annex-signing.key');
  const publicPath = resolve(dir, 'annex-signing.pub');

  await writeFile(privatePath, privateKey, { encoding: 'utf8', mode: 0o600 });
  await writeFile(publicPath, publicKey, 'utf8');

  process.stdout.write(`\n${c.bgGreen(' SIGNING KEY ')}  ${c.bold(keyFingerprint(publicKey))}\n\n`);
  process.stdout.write(`  ${c.grey('private')}  ${privatePath} ${c.grey('(mode 0600 — never commit this)')}\n`);
  process.stdout.write(`  ${c.grey('public')}   ${publicPath} ${c.grey('(publish this next to your trust page)')}\n\n`);
  process.stdout.write(
    `${wrap('Sign a scan with: annex scan . --sign annex-signing.key ... and check one with: annex verify report.json --pubkey annex-signing.pub. A reader who has your public key can then tell that a report carries your results and not somebody else\'s, without re-running anything.', 74, '  ')}\n`,
  );
  process.stdout.write(
    `\n${wrap('What this does not do: there is no timestamp authority, so a signature says who and not when, and distributing the public key is still your problem. SECURITY.md says both in those words.', 74, '  ')}\n`,
  );
  return 0;
}

async function runVerify(args: Args): Promise<number> {
  const path = args.positional[0];
  if (!path) {
    process.stderr.write(c.red('annex verify needs a report JSON file.\n'));
    process.stderr.write(c.grey('  annex verify report.json [--against <dir>]\n'));
    return 2;
  }

  let report: ScanReport;
  try {
    const parsed: unknown = JSON.parse(await readFile(resolve(path), 'utf8'));
    assertReportShape(parsed, path);
    report = parsed;
  } catch (err) {
    process.stderr.write(c.red(`${(err as Error).message}\n`));
    return 2;
  }

  // Re-derive the whole chain from the results the report carries. This is the
  // check that matters: flip one status from "missing" to "satisfied" and the
  // entry for that control no longer hashes to the recorded value.
  const ruleVersions = Object.fromEntries(report.packs.map((p) => [p.packId, p.version]));
  const check = verifyLedgerAgainstResults(report.ledger, report.controls, ruleVersions);

  process.stdout.write('\n');
  if (!check.valid) {
    process.stdout.write(`${c.bgRed(' LEDGER BROKEN ')}\n\n`);
    process.stdout.write(`${wrap(check.reason ?? 'the ledger does not match the results it describes.', 74, '  ')}\n`);
    process.stdout.write(`  ${c.grey(`recomputed ${check.root.slice(0, 24)}… vs recorded ${check.expectedRoot.slice(0, 24)}…`)}\n`);
    return 1;
  }

  // The chain covers the control results. It does not cover the four numbers
  // anyone actually reads — the score, the tier, the exposure — which sit
  // beside it in the same JSON and are derived from those results. Leaving
  // them unchecked meant a report could be edited to say 94/100, minimal risk,
  // no exposure, over forty-five entries that all still said "missing", and
  // verify would print LEDGER INTACT and exit 0.
  const derived = summaryMismatches(report);
  if (derived.length > 0) {
    process.stdout.write(`${c.bgRed(' REPORT INCONSISTENT ')}\n\n`);
    process.stdout.write(`  The ledger is intact, so the control results are the ones it was built over —\n`);
    process.stdout.write(`  but the report's own summary does not follow from them:\n\n`);
    for (const d of derived) process.stdout.write(`  ${c.red(SYMBOL.fail)} ${d}\n`);
    process.stdout.write(`\n  ${c.grey('Re-run the scan rather than trusting the headline.')}\n`);
    return 1;
  }

  // The signature is checked before the banner, because a broken one is a
  // louder fact than an intact chain.
  const pubkeyPath = str(args.flags.pubkey);
  const expectedKey = pubkeyPath ? await readFile(resolve(pubkeyPath), 'utf8') : undefined;
  const sig = verifyLedgerSignature(
    report.ledger.signature,
    report.ledger.root,
    report.ledger.algorithm,
    report.ledger.entries.length,
    expectedKey,
    // The report's own headline, so a rewritten score or tier breaks the
    // signature rather than riding along beside an untouched chain.
    {
      score: report.score ?? -1,
      liveScore: report.liveScore ?? -1,
      tier: report.classification.tier,
      maxFine: report.exposure.maxFine,
      currency: report.exposure.currency,
    },
  );
  if (sig.status === 'invalid') {
    process.stdout.write(`${c.bgRed(' SIGNATURE INVALID ')}\n\n`);
    process.stdout.write(`${wrap(`The ledger chain is internally consistent, but ${sig.reason}.`, 74, '  ')}\n`);
    return 1;
  }

  process.stdout.write(`${c.bgGreen(' LEDGER INTACT ')}  ${c.bold(ledgerFingerprint(report.ledger))}\n\n`);
  process.stdout.write(`  ${check.checked} entries re-derived from the results they describe\n`);
  process.stdout.write(`  ${c.grey(`root ${check.expectedRoot.slice(0, 24)}…`)}\n`);

  if (sig.status === 'valid') {
    process.stdout.write(
      `  ${c.green(SYMBOL.pass)} signed by ${c.bold(keyFingerprint(sig.publicKey))} ${c.grey('(ed25519)')}\n`,
    );
    process.stdout.write(
      expectedKey
        ? `  ${c.grey('checked against the key you supplied, so this report carries that holder\'s results.')}\n`
        : `  ${c.grey('checked against the key inside the report: it has not been edited since it was')}\n` +
            `  ${c.grey('signed, but only --pubkey tells you whose key that is.')}\n`,
    );
  } else if (expectedKey) {
    process.stdout.write(`  ${c.yellow(SYMBOL.warn)} ${c.grey('this report is unsigned, so the key you supplied proves nothing about it.')}\n`);
  }

  const against = str(args.flags.against);
  if (!against) {
    process.stdout.write(
      `\n  ${c.grey('Pass --against <dir> to re-hash every cited file off disk and confirm the')}\n` +
        `  ${c.grey('source itself has not moved since the report was issued.')}\n`,
    );
    return 0;
  }

  const files = await reHashCitedFiles(report, resolve(against));
  process.stdout.write(`\n  ${c.bold('Re-read from')} ${c.cyan(against)}\n`);
  process.stdout.write(`  ${files.checked} cited file(s) re-hashed\n`);

  /**
   * Re-ingest the whole tree, not only the files the report happens to cite.
   *
   * Citations cover what Annex found; a tree can gain an entire prohibited
   * practice without touching any of them. An auditor scanned the remediated
   * fixture, added a working `detectEmotion()` in a new file, and `--against`
   * printed "every cited file still hashes" and exited 0 — while the README
   * promised "a report that no longer describes the tree it claims to
   * describe says so". The snapshot id is content-addressed over every path
   * and digest, so comparing it is the check that sentence was describing.
   */
  let treeChanged: string | undefined;
  try {
    const now = await ingestDirectory(resolve(against), { name: report.snapshot.name });
    if (now.id !== report.snapshot.id) {
      // `sampledPaths` is the first forty paths, so it can name *some* of what
      // appeared and never all of it. Say which ones it can — a reader who is
      // told "the tree changed" and not how has to go and diff it themselves —
      // and be explicit that the list is partial rather than implying it is
      // the whole set.
      const before = new Set(report.snapshot.sampledPaths ?? []);
      const added = now.files
        .map((f) => f.path)
        .filter((p2) => !before.has(p2))
        .slice(0, 3);
      const counts = `${now.fileCount} files now, ${report.snapshot.fileCount} when the report was issued`;
      treeChanged =
        added.length > 0
          ? `${counts}; not in the paths the report sampled: ${added.join(', ')}`
          : counts;
    }
  } catch (err) {
    process.stdout.write(`  ${c.yellow(SYMBOL.warn)} ${c.grey(`the tree could not be re-read (${(err as Error).message})`)}\n`);
  }

  if (treeChanged) {
    process.stdout.write(`  ${c.red(SYMBOL.fail)} the tree is not the tree this report describes — ${treeChanged}\n`);
    process.stdout.write(
      `\n${wrap('The cited files may all still match: a repository can gain an entire prohibited practice in a file this report never mentions, because a citation covers what the scan found and not what was there. Re-scan before relying on it.', 74, '  ')}\n`,
    );
    return 1;
  }

  if (files.changed.length === 0 && files.missing.length === 0) {
    process.stdout.write(
      `  ${c.green(SYMBOL.pass)} every cited file still hashes to the digest in the report, and the tree\n` +
        `    itself hashes to the snapshot the report was built from\n`,
    );
    return 0;
  }
  for (const f of files.changed) process.stdout.write(`  ${c.red(SYMBOL.fail)} changed since the report: ${f}\n`);
  for (const f of files.missing) process.stdout.write(`  ${c.red(SYMBOL.fail)} cited but not found: ${f}\n`);
  process.stdout.write(
    `\n  ${c.grey('The dossier describes a different tree than the one on disk. Re-scan before relying on it.')}\n`,
  );
  return 1;
}

async function runBenchmarkCommand(args: Args): Promise<number> {
  const summary = runBenchmark();

  if (str(args.flags.format) === 'markdown') {
    await emit(benchmarkMarkdown(summary), str(args.flags.out));
    return 0;
  }

  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
  const wrong = summary.outcomes.filter((o) => !o.tierCorrect || o.missedFindings.length || o.falseFindings.length);

  process.stdout.write(`\n${c.bold('Benchmark')} ${c.grey(`— ${summary.total} hand-labelled cases, ${summary.durationMs} ms`)}\n${rule()}\n`);
  process.stdout.write(`  ${c.grey('risk-tier accuracy  ')} ${c.bold(pct(summary.tierAccuracy))} ${c.grey(`(${summary.tierCorrect}/${summary.total})`)}\n`);
  process.stdout.write(`  ${c.grey('finding recall      ')} ${c.bold(pct(summary.recall))} ${c.grey(`(${summary.recalledFindings}/${summary.expectedFindings})`)}\n`);
  process.stdout.write(`  ${c.grey('carve-out precision ')} ${c.bold(pct(summary.carveOutPrecision))} ${c.grey(`(${summary.forbiddenChecks - summary.forbiddenViolations}/${summary.forbiddenChecks})`)}\n`);

  if (wrong.length === 0) {
    process.stdout.write(`\n  ${c.green(SYMBOL.pass)} no failures in the current corpus.\n`);
  } else {
    process.stdout.write(`\n  ${c.bold('Cases Annex gets wrong')}\n`);
    for (const o of wrong) {
      process.stdout.write(`    ${c.red(SYMBOL.fail)} ${c.bold(o.id)} ${c.grey(`expected ${o.expectedTier}, produced ${o.actualTier}`)}\n`);
      if (o.missedFindings.length) process.stdout.write(`       ${c.grey(`missed ${o.missedFindings.join(', ')}`)}\n`);
      if (o.falseFindings.length) process.stdout.write(`       ${c.grey(`false  ${o.falseFindings.join(', ')}`)}\n`);
      process.stdout.write(c.grey(wrap(o.rationale, 70, '       ')) + '\n');
    }
  }
  process.stdout.write(`\n${c.grey('Half the corpus is carve-outs: cases that look like a violation to a keyword matcher and are not.')}\n`);
  return 0;
}

function runPacks(): number {
  process.stdout.write(`\n${c.bold('Rule-pack corpus')} ${c.grey(`— ${CORPUS_SIZE} executable obligations`)}\n`);
  for (const pack of ALL_PACKS) {
    process.stdout.write(`\n  ${c.bold(pack.name)} ${c.cyan(pack.version)} ${c.grey(`· ${pack.jurisdiction} · reconciled ${pack.reconciledOn}`)}\n`);
    process.stdout.write(c.grey(wrap(pack.summary, 74, '    ')) + '\n');
    process.stdout.write(`    ${c.grey(`${pack.controls.length} obligations · ${pack.controls.filter((x) => x.tests?.length).length} with golden fixtures · ${pack.controls.filter((x) => x.remediation).length} auto-remediable`)}\n`);
    for (const m of pack.milestones) {
      const past = new Date(m.date) <= new Date();
      process.stdout.write(`      ${past ? c.red('● in force') : c.grey('○ upcoming')} ${c.bold(m.date)}  ${m.label}\n`);
    }
  }
  process.stdout.write(`\n${c.grey('Markets: ')}${Object.entries(MARKET_PACKS).map(([k, v]) => `${c.cyan(k)} ${c.grey(`(${v.label})`)}`).join(', ')}\n`);
  return 0;
}

function runExplain(args: Args): number {
  const id = args.positional[0];
  if (!id) {
    process.stderr.write(c.red('annex explain needs a control id. Run `annex packs` to list them.\n'));
    return 2;
  }
  const control = controlById(id);
  if (!control) {
    const near = ALL_PACKS.flatMap((p) => p.controls).filter((x) => x.id.includes(id)).slice(0, 5);
    process.stderr.write(c.red(`No control "${id}".\n`));
    if (near.length) process.stderr.write(c.grey(`Did you mean: ${near.map((n) => n.id).join(', ')}\n`));
    return 2;
  }

  process.stdout.write(`\n${c.bold(control.title)}\n${rule()}\n`);
  process.stdout.write(`${c.grey('id')}          ${control.id}\n`);
  process.stdout.write(`${c.grey('family')}      ${control.family}   ${c.grey('severity')} ${control.severity}   ${c.grey('weight')} ${control.weight}\n`);
  process.stdout.write(`${c.grey('applies from')} ${control.appliesFrom} ${new Date(control.appliesFrom) <= new Date() ? c.red('(in force)') : c.grey('(upcoming)')}\n`);
  process.stdout.write(`${c.grey('method')}      ${control.method}\n\n`);
  process.stdout.write(c.bold('Obligation\n'));
  process.stdout.write(wrap(control.obligation, 76) + '\n\n');
  process.stdout.write(c.bold('Citations\n'));
  for (const cite of control.citations) {
    process.stdout.write(`  ${c.cyan(`${cite.short} ${cite.locator}`)} — ${cite.title}\n  ${c.grey(cite.url)}\n`);
    if (cite.quote) process.stdout.write(c.italic(c.grey(wrap(`“${cite.quote}”`, 72, '    '))) + '\n');
    process.stdout.write('\n');
  }
  if (control.remediation) {
    process.stdout.write(c.bold('Remediation\n'));
    process.stdout.write(wrap(control.remediation.summary, 76) + '\n');
    process.stdout.write(c.grey(wrap(`Reviewer: ${control.remediation.reviewerNote}`, 74, '  ')) + '\n\n');
  }
  if (control.tests?.length) {
    process.stdout.write(c.bold('Golden fixtures\n'));
    for (const t of control.tests) process.stdout.write(`  ${c.grey(SYMBOL.bullet)} ${t.name} ${c.grey(`→ ${t.expect}`)}\n`);
    process.stdout.write('\n');
  }
  return 0;
}

// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.flags.version || args.flags.v || args.command === 'version') {
    process.stdout.write(`annex ${CLI_VERSION} (engine ${ENGINE_VERSION}, ${CORPUS_SIZE} obligations)\n`);
    return;
  }

  const stray = unknownFlags(args);
  if (stray.length) {
    process.stderr.write(
      c.red(`Unknown option${stray.length > 1 ? 's' : ''} for \`annex ${args.command}\`: ${stray.map((f) => `--${f}`).join(', ')}\n`),
    );
    process.stderr.write(c.grey('Run `annex help` for the options each command accepts.\n'));
    process.exitCode = 2;
    return;
  }

  const empty = valuelessFlags(args);
  if (empty.length) {
    process.stderr.write(
      c.red(`Option${empty.length > 1 ? 's' : ''} given without a value: ${empty.map((f) => `--${f}`).join(', ')}\n`),
    );
    process.stderr.write(
      c.grey('A flag that takes a value and is given none used to be read as absent, which\n') +
        c.grey('turned `--fail-under --markets eu` into a gate that always passed.\n'),
    );
    process.exitCode = 2;
    return;
  }

  let code = 0;
  try {
    switch (args.command) {
      case 'scan': code = await runScan(args); break;
      case 'dossier': code = await runDossier(args); break;
      case 'fix': code = await runFix(args); break;
      case 'diff': code = await runDiff(args); break;
      case 'verify': code = await runVerify(args); break;
      case 'keygen': code = await runKeygen(args); break;
      case 'packs': code = runPacks(); break;
      case 'benchmark': code = await runBenchmarkCommand(args); break;
      case 'explain': code = runExplain(args); break;
      case 'help':
      case '--help':
      case '-h':
        process.stdout.write(HELP);
        break;
      default:
        process.stderr.write(c.red(`Unknown command "${args.command}".\n`) + HELP);
        code = 2;
    }
  } catch (err) {
    clearProgress();
    if (err instanceof IngestError) {
      process.stderr.write(`\n${c.red(SYMBOL.fail)} ${err.message}\n`);
      if (err.hint) process.stderr.write(`${c.grey('  ' + err.hint)}\n`);
      code = 2;
    } else {
      process.stderr.write(`\n${c.red(SYMBOL.fail)} ${(err as Error).message}\n`);
      if (process.env.ANNEX_DEBUG) process.stderr.write(c.grey(String((err as Error).stack)) + '\n');
      code = 2;
    }
  }
  process.exitCode = code;
}

void main();

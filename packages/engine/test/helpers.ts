import { buildSnapshot } from '../src/ingest/snapshot.js';
import { scan, type ScanOptions } from '../src/scan.js';
import type { ScanReport, SystemProfile } from '../src/types.js';

/** Build a scan report from an in-memory virtual repository. */
export function scanFiles(
  files: Record<string, string>,
  profile: Partial<SystemProfile> = {},
  opts: Omit<ScanOptions, 'profile'> = {},
): ScanReport {
  const snapshot = buildSnapshot({
    name: profile.name ?? 'virtual-repo',
    files: Object.entries(files).map(([path, bytes]) => ({ path, bytes })),
  });
  return scan(snapshot, { ...opts, profile: { markets: ['eu', 'us-nyc', 'us-co', 'us-federal'], ...profile } });
}

export function statusOf(report: ScanReport, controlId: string): string {
  return report.controls.find((c) => c.controlId === controlId)?.status ?? 'absent';
}

export function firedSignals(report: ScanReport): string[] {
  return report.signals.filter((s) => s.hits > 0).map((s) => s.id);
}

/** A minimal but realistic AI product, used as the base for focused tests. */
export const BASE_APP: Record<string, string> = {
  'package.json': JSON.stringify({ name: 'app', dependencies: { openai: '^4.0.0' } }, null, 2),
  'src/model.ts': [
    "import OpenAI from 'openai';",
    'const client = new OpenAI();',
    "export const MODEL = 'gpt-4o';",
    'export async function complete(prompt: string) {',
    "  return client.chat.completions.create({ model: MODEL, messages: [{ role: 'user', content: prompt }] });",
    '}',
  ].join('\n'),
};

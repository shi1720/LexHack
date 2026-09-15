import { SAMPLES, createSystem, listSystems, runScan, updateSystem } from './systems';

/**
 * Seed the demo workspace.
 *
 * Runs synchronously on first entry so a reviewer lands on populated data
 * rather than four empty cards and a spinner. Scans take tens of milliseconds
 * each, so this costs nothing — but it is what makes the demo survive a
 * conference wifi network.
 */
export function seedDemoSystems(userId: string): void {
  const existing = listSystems(userId);
  if (existing.length >= SAMPLES.length) return;

  const have = new Set(existing.map((s) => s.source));

  for (const sample of SAMPLES) {
    if (have.has(sample.key)) continue;
    const system = createSystem({
      userId,
      name: sample.name,
      purpose: sample.purpose,
      source: sample.key,
      sourceKind: 'sample',
      markets: sample.markets,
    });
    // The remediated HireFlow is published as a trust page: it is the one with
    // something worth showing a customer's security reviewer.
    if (sample.key === 'hireflow-remediated') updateSystem(system.id, { trustPublic: true });
  }
}

/**
 * A system that has been scanned once has no history, and drift detection is
 * the one thing in this product that a questionnaire structurally cannot do.
 * So HireFlow gets two real scans: the remediated tree as it stood six weeks
 * ago, and the tree as it stands now with affect inference reintroduced.
 *
 * Both are genuine engine output over genuine snapshots. The only thing the
 * seeder fakes is the clock on the first one.
 */
const PRIOR_SCAN: Record<string, { sample: string; daysAgo: number }> = {
  hireflow: { sample: 'hireflow-remediated', daysAgo: 43 },
};

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

/** Scan every unscanned system in the workspace. Fire-and-forget from the UI. */
export async function seedDemoScans(userId: string, opts: { turnoverEur?: number; employees?: number } = {}): Promise<void> {
  for (const system of listSystems(userId)) {
    if (system.latest?.status === 'complete') continue;
    try {
      const prior = system.sourceKind === 'sample' ? PRIOR_SCAN[system.source] : undefined;
      if (prior) {
        await runScan(system, { ...opts, asSample: prior.sample, recordedAt: daysAgoIso(prior.daysAgo) });
      }
      await runScan(system, opts);
    } catch {
      /* a seed failure must never block the workspace from loading */
    }
  }
}

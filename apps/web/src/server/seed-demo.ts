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

/** Scan every unscanned system in the workspace. Fire-and-forget from the UI. */
export async function seedDemoScans(userId: string, opts: { turnoverEur?: number; employees?: number } = {}): Promise<void> {
  for (const system of listSystems(userId)) {
    if (system.latest?.status === 'complete') continue;
    try {
      await runScan(system, opts);
    } catch {
      /* a seed failure must never block the workspace from loading */
    }
  }
}

import { describe, expect, it } from 'vitest';
import { ALL_PACKS, CORPUS_SIZE } from '../src/packs/index.js';
import { buildSnapshot } from '../src/ingest/snapshot.js';
import { createSignalIndex, extractSignals } from '../src/signals/index.js';
import { classify } from '../src/classify/index.js';
import { createContext, evaluateControl } from '../src/evaluate/index.js';
import { defaultProfile } from '../src/scan.js';
import type { Control, SystemProfile } from '../src/types.js';

/**
 * The law gets a test suite.
 *
 * Every control may carry golden fixtures: a minimal virtual repository and the
 * status the control must return for it. This file runs all of them. If a
 * detector drifts — a regex gets greedier, a keyword gets dropped — the
 * corresponding obligation fails here rather than silently mis-reporting
 * somebody's conformity.
 */

function runControl(control: Control, files: Record<string, string>, profileOverrides: Partial<SystemProfile> = {}) {
  const snapshot = buildSnapshot({
    name: 'golden',
    files: Object.entries(files).map(([path, bytes]) => ({ path, bytes })),
  });
  const signals = createSignalIndex(extractSignals(snapshot));
  const profile = defaultProfile(snapshot, profileOverrides);
  const classification = classify(signals, profile);
  const ctx = createContext({ snapshot, signals, classification, profile });
  // Golden fixtures are evaluated at a date after every application date in the
  // corpus, so a control's own clock never masks a detector regression.
  return evaluateControl(control, ctx, new Date('2030-01-01T00:00:00Z'));
}

describe('rule pack corpus', () => {
  it('ships every pack with a version, a reconciliation date and at least one control', () => {
    for (const pack of ALL_PACKS) {
      expect(pack.version, pack.id).toMatch(/^\d{4}\.\d{2}\.\d+$/);
      expect(pack.reconciledOn, pack.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(pack.controls.length, pack.id).toBeGreaterThan(0);
    }
  });

  it('gives every control a citation with a locator and a URL', () => {
    for (const pack of ALL_PACKS) {
      for (const control of pack.controls) {
        expect(control.citations.length, control.id).toBeGreaterThan(0);
        for (const citation of control.citations) {
          expect(citation.locator, `${control.id} citation locator`).toBeTruthy();
          expect(citation.url, `${control.id} citation url`).toMatch(/^https?:\/\//);
          expect(citation.instrument, `${control.id} citation instrument`).toBeTruthy();
        }
      }
    }
  });

  it('gives every control an application date and a plain-English obligation', () => {
    for (const pack of ALL_PACKS) {
      for (const control of pack.controls) {
        expect(control.appliesFrom, control.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(Number.isNaN(Date.parse(control.appliesFrom)), control.id).toBe(false);
        // An obligation a reader cannot understand is not an obligation they can meet.
        expect(control.obligation.length, control.id).toBeGreaterThan(80);
      }
    }
  });

  it('uses globally unique control ids', () => {
    const ids = ALL_PACKS.flatMap((p) => p.controls.map((c) => c.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(CORPUS_SIZE);
  });

  it('namespaces every control id under its pack', () => {
    for (const pack of ALL_PACKS) {
      for (const control of pack.controls) {
        expect(control.id.startsWith(`${pack.id}.`), control.id).toBe(true);
        expect(control.pack).toBe(pack.id);
      }
    }
  });

  it('produces a remediation plan that only creates files', () => {
    for (const pack of ALL_PACKS) {
      for (const control of pack.controls) {
        if (!control.remediation) continue;
        expect(control.remediation.summary, control.id).toBeTruthy();
        expect(control.remediation.reviewerNote, control.id).toBeTruthy();
      }
    }
  });
});

describe('golden fixtures — every control that ships tests must pass them', () => {
  const cases = ALL_PACKS.flatMap((pack) =>
    pack.controls.flatMap((control) => (control.tests ?? []).map((test) => ({ control, test }))),
  );

  it('ships golden fixtures for the highest-severity controls', () => {
    expect(cases.length).toBeGreaterThanOrEqual(6);
  });

  for (const { control, test } of cases) {
    it(`${control.id} — ${test.name}`, () => {
      const result = runControl(control, test.files, test.profile ?? {});
      expect(result.status, `${control.id}: ${result.finding}`).toBe(test.expect);
    });
  }
});

describe('control evaluation is defensive', () => {
  it('never throws on an empty repository', () => {
    for (const pack of ALL_PACKS) {
      for (const control of pack.controls) {
        expect(() => runControl(control, {})).not.toThrow();
      }
    }
  });

  it('never throws on a repository of malformed files', () => {
    const junk = {
      'package.json': '{ this is not json',
      'a.ts': 'x'.repeat(5000),
      'b.py': '\n'.repeat(3000),
      'c.md': '# '.repeat(2000),
    };
    for (const pack of ALL_PACKS) {
      for (const control of pack.controls) {
        expect(() => runControl(control, junk), control.id).not.toThrow();
      }
    }
  });
});

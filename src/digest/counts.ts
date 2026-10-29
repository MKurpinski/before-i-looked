import type { DigestRow } from './types.js';

export type Counts = { ok: number; retry: number; fail: number };

// One count per job, by its last status.
export function countRows(rows: DigestRow[]): Counts {
  const counts: Counts = { ok: 0, retry: 0, fail: 0 };
  for (const r of rows) counts[r.lastStatus]++;
  return counts;
}

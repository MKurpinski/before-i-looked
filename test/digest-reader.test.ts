import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read-night.js';

function tempRuns(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'runs-'));
  for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body);
  return dir;
}

describe('readNight', () => {
  it('reads runs/2026-10-28.jsonl: 5 jobs, 1 bad line', () => {
    const night = readNight('runs', '2026-10-28');
    expect(night?.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
    expect(night?.badLines).toBe(1);
  });

  it('counts runs and retries, keeps the last status and error', () => {
    const night = readNight('runs', '2026-10-28');
    const fixtures = night?.rows.find((r) => r.job === 'fixtures/refresh');
    expect(fixtures).toMatchObject({
      owner: 'rook',
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: 'upstream 503',
      first: '2026-10-29T01:30:00+01:00',
      last: '2026-10-29T01:37:00+01:00',
    });
    expect(night?.rows.find((r) => r.job === 'notes/backup')).toMatchObject({
      lastStatus: 'fail',
      lastError: 'quota exceeded',
    });
  });

  it('keeps a row whose owner is null', () => {
    const row = readNight('runs', '2026-10-28')?.rows.find((r) => r.job === 'digest/render');
    expect(row).toMatchObject({ owner: null, runs: 1, lastStatus: 'ok' });
  });

  it('counts lines that do not parse or have the wrong shape, never throws', () => {
    const dir = tempRuns({
      '2026-01-01.jsonl': [
        '{"at":"2026-01-01T00:00:00+01:00","job":"a","status":"ok","owner":"x"}',
        'not json',
        '{"at":"2026-01-01T00:01:00+01:00","job":"a","status":"weird","owner":"x"}',
        '[]',
        '',
      ].join('\n'),
    });
    const night = readNight(dir, '2026-01-01');
    expect(night?.rows).toHaveLength(1);
    expect(night?.badLines).toBe(3);
  });

  it('returns null for a night with no file, rows [] for an empty file', () => {
    const dir = tempRuns({ '2026-01-02.jsonl': '' });
    expect(readNight(dir, '2026-01-03')).toBeNull();
    expect(readNight(dir, '2026-01-02')).toEqual({ night: '2026-01-02', rows: [], badLines: 0 });
  });

  it('rejects a night that is not a date', () => {
    expect(readNight('runs', '../rig')).toBeNull();
  });
});

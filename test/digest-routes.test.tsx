import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

process.env.LANE_MARKER = 'TEST-MARKER';

const line = (job: string, status: string, error?: string) =>
  JSON.stringify({ at: '2026-10-29T01:00:00+01:00', job, status, owner: 'rook', ...(error ? { error } : {}) });

function appWith(files: Record<string, string>) {
  const runsDir = mkdtempSync(join(tmpdir(), 'runs-'));
  for (const [name, body] of Object.entries(files)) writeFileSync(join(runsDir, name), body);
  return createApp({ adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir });
}

const NORMAL = [
  line('zeta/job', 'ok'),
  line('alpha/job', 'retry', 'e'),
  line('alpha/job', 'retry', 'e'),
  line('alpha/job', 'retry', 'e'),
  line('alpha/job', 'retry', 'e'),
  line('mid/job', 'fail', 'boom'),
].join('\n');

type Json = { night: string; rows: { job: string }[]; badLines: number };

describe('digest routes', () => {
  it('200 for a normal night, page and JSON', async () => {
    const app = appWith({ '2026-10-20.jsonl': NORMAL });
    const page = await app.request('/digest/2026-10-20');
    const api = await app.request('/api/digest/2026-10-20');
    expect(page.status).toBe(200);
    expect(api.status).toBe(200);
    const json = (await api.json()) as Json;
    expect(json.night).toBe('2026-10-20');
    expect(json.rows.map((r) => r.job)).toEqual(['alpha/job', 'mid/job', 'zeta/job']);
    expect(json.badLines).toBe(0);
  });

  it('404 for a night with no file', async () => {
    const app = appWith({});
    expect((await app.request('/digest/2026-10-21')).status).toBe(404);
    const api = await app.request('/api/digest/2026-10-21');
    expect(api.status).toBe(404);
    expect(api.headers.get('content-type')).toContain('application/json');
    await api.json();
  });

  it('empty night: page says nothing ran, JSON has no rows', async () => {
    const app = appWith({ '2026-10-22.jsonl': '' });
    const page = await app.request('/digest/2026-10-22');
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('nothing ran');
    const api = await app.request('/api/digest/2026-10-22');
    expect(api.status).toBe(200);
    expect(((await api.json()) as Json).rows).toEqual([]);
  });

  it('a bad line is counted and the rest still renders', async () => {
    const app = appWith({ '2026-10-23.jsonl': `${line('alpha/job', 'ok')}\nnot json\n${line('beta/job', 'ok')}\n` });
    const page = await app.request('/digest/2026-10-23');
    expect(page.status).toBe(200);
    const html = await page.text();
    expect(html).toContain('alpha/job');
    expect(html).toContain('beta/job');
    const json = (await (await app.request('/api/digest/2026-10-23')).json()) as Json;
    expect(json.badLines).toBe(1);
    expect(json.rows).toHaveLength(2);
  });

  it('page and JSON list the same jobs in the same order', async () => {
    const app = appWith({ '2026-10-20.jsonl': NORMAL });
    const html = await (await app.request('/digest/2026-10-20')).text();
    const json = (await (await app.request('/api/digest/2026-10-20')).json()) as Json;
    const positions = json.rows.map((r) => html.indexOf(r.job));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('page marks retries >= 3 and fail rows', async () => {
    const app = appWith({ '2026-10-20.jsonl': NORMAL });
    const html = await (await app.request('/digest/2026-10-20')).text();
    expect(html).toContain('alpha/job');
    expect(html).toContain('mid/job');
    expect(html).toContain('fail');
  });

  it('real night 2026-10-28 has 5 jobs', async () => {
    const app = createApp({ adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' });
    const page = await app.request('/digest/2026-10-28');
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('notes/backup');
    const json = (await (await app.request('/api/digest/2026-10-28')).json()) as Json;
    expect(json.rows).toHaveLength(5);
    expect(json.badLines).toBe(1);
  });
});

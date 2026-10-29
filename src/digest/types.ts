export type RunStatus = 'ok' | 'retry' | 'fail';

// One row per job in a night's run log. Times keep the offset from the log.
export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: RunStatus;
  lastError: string | null;
  first: string;
  last: string;
};

export type Night = {
  night: string;
  rows: DigestRow[];
  badLines: number;
};

// Reads runs/<night>.jsonl. Rows are sorted by job. A line that doesn't parse is counted in
// badLines, never thrown. Returns null when the night has no file (the route answers 404);
// an empty file gives rows: [].
export type ReadNight = (runsDir: string, night: string) => Night | null;

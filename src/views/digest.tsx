import type { Night } from '../digest/types.js';

const DASH = '—';

export function DigestPage({ data }: { data: Night }) {
  return (
    <>
      <h1>digest {data.night}</h1>
      {data.badLines > 0 && (
        <p class="warn">
          {data.badLines} bad {data.badLines === 1 ? 'line' : 'lines'} skipped
        </p>
      )}
      {data.rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first</th>
              <th>last</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => {
              const failed = r.lastStatus === 'fail';
              const retried = r.retries >= 3;
              const cls = [failed ? 'fail' : '', retried ? 'many-retries' : ''].filter(Boolean).join(' ');
              return (
                <tr class={cls || undefined}>
                  <td>{r.job}</td>
                  <td>{r.owner ?? DASH}</td>
                  <td>{r.runs}</td>
                  <td>
                    {r.retries}
                    {retried && <span class="warn"> [many retries]</span>}
                  </td>
                  <td>
                    {r.lastStatus}
                    {failed && <span class="warn"> [FAIL]</span>}
                  </td>
                  <td>{r.lastError ?? DASH}</td>
                  <td>{r.first}</td>
                  <td>{r.last}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}

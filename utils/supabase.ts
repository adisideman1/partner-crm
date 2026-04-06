/**
 * utils/supabase.ts — Dual-mode Supabase client
 *
 * In Tasklet preview: CSP blocks direct fetch() to external URLs.
 * We route requests through window.tasklet.runCommand(curl ...) which runs
 * in the agent sandbox (no CSP restrictions).
 *
 * In deployed app (GitHub Pages): window.tasklet doesn't exist,
 * so we fall back to direct fetch().
 */

const SUPABASE_URL = 'https://ctbeturbytzfrvxpyiuo.supabase.co';
export const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0YmV0dXJieXR6ZnJ2eHB5aXVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNjg1NzIsImV4cCI6MjA5MDc0NDU3Mn0.ampYahXbbZmE9Y2Wom6UJDT6IwzG12vZiLvrIOV86go';

export const REST = `${SUPABASE_URL}/rest/v1`;

// Detect if running inside Tasklet preview (window.tasklet exists)
const IN_TASKLET =
  typeof window !== 'undefined' &&
  typeof (window as unknown as { tasklet?: unknown }).tasklet !== 'undefined';

/**
 * GET request to Supabase REST API.
 * @param path e.g. "partner_edits?select=partner_id,field,value"
 */
export async function sbGet(path: string): Promise<unknown> {
  if (IN_TASKLET) {
    const result = await window.tasklet.runCommand(
      `curl -sf "${REST}/${path}" -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}"`,
      30,
    );
    if (result.exitCode !== 0) {
      console.error('sbGet failed:', result.log);
      throw new Error(`Supabase query failed: ${result.log}`);
    }
    return JSON.parse(result.log);
  }

  const r = await fetch(`${REST}/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
  return r.json();
}

/**
 * POST/PATCH/DELETE request to Supabase REST API.
 * Uses base64 encoding to safely pass arbitrary JSON through the shell.
 */
export async function sbWrite(
  path: string,
  body: object | object[] | null,
  method = 'POST',
): Promise<void> {
  if (IN_TASKLET) {
    if (body !== null) {
      const json = JSON.stringify(body);
      const b64 = btoa(
        encodeURIComponent(json).replace(
          /%([0-9A-F]{2})/g,
          (_m, p) => String.fromCharCode(parseInt(p, 16)),
        ),
      );
      const tmp = `/tmp/sb_${Date.now()}.json`;
      const result = await window.tasklet.runCommand(
        `printf '%s' "${b64}" | base64 -d > ${tmp} && curl -sf -X ${method} "${REST}/${path}" -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}" -H "Content-Type: application/json" -H "Prefer: resolution=merge-duplicates,return=minimal" -d @${tmp}; rm -f ${tmp}`,
        30,
      );
      if (result.exitCode !== 0) {
        console.error('sbWrite failed:', result.log);
        throw new Error(`Supabase write failed: ${result.log}`);
      }
    } else {
      const result = await window.tasklet.runCommand(
        `curl -sf -X ${method} "${REST}/${path}" -H "apikey: ${SUPABASE_KEY}" -H "Authorization: Bearer ${SUPABASE_KEY}"`,
        30,
      );
      if (result.exitCode !== 0) {
        console.error('sbWrite failed:', result.log);
        throw new Error(`Supabase write failed: ${result.log}`);
      }
    }
    return;
  }

  const r = await fetch(`${REST}/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: body !== null ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${await r.text()}`);
}

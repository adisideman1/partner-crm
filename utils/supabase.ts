/**
 * utils/supabase.ts — Supabase REST client
 *
 * Uses direct fetch() for all environments (Tasklet preview + deployed).
 */

const SUPABASE_URL = 'https://ctbeturbytzfrvxpyiuo.supabase.co';
export const SUPABASE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0YmV0dXJieXR6ZnJ2eHB5aXVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNjg1NzIsImV4cCI6MjA5MDc0NDU3Mn0.ampYahXbbZmE9Y2Wom6UJDT6IwzG12vZiLvrIOV86go';

export const REST = `${SUPABASE_URL}/rest/v1`;

/**
 * GET request to Supabase REST API.
 * @param path e.g. "partner_edits?select=partner_id,field,value"
 */
export async function sbGet(path: string): Promise<unknown> {
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
 */
export async function sbWrite(
  path: string,
  body: object | object[] | null,
  method = 'POST',
): Promise<void> {
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

// Partner edits persistence — reads/writes to Supabase partner_edits table.
// Uses dual-mode client (run_command proxy in Tasklet, direct fetch when deployed).
//
// IMPORTANT: Supabase RLS blocks POST upsert (ON CONFLICT DO UPDATE).
// We use PATCH-then-POST pattern: try to update existing row first,
// fall back to INSERT if no row exists yet.

import { sbGet, sbWrite } from './supabase';

export async function loadAllEdits(): Promise<
  { partner_id: string; field: string; value: string }[]
> {
  const rows = (await sbGet(
    'partner_edits?select=partner_id,field,value',
  )) as { partner_id: string; field: string; value: string }[];
  return rows;
}

/**
 * Save a single field edit. Tries PATCH (update) first, then POST (insert).
 */
export async function saveField(
  partnerId: string,
  field: string,
  value: string,
): Promise<void> {
  const now = new Date().toISOString();
  const encodedPid = encodeURIComponent(partnerId);
  const encodedField = encodeURIComponent(field);
  const filterPath = `partner_edits?partner_id=eq.${encodedPid}&field=eq.${encodedField}`;

  try {
    // Try PATCH first (update existing row)
    const resp = await sbWrite(
      filterPath,
      { value, updated_at: now },
      'PATCH',
      'return=representation',
    );
    const rows = resp ? JSON.parse(resp) : [];
    if (Array.isArray(rows) && rows.length > 0) {
      return; // Updated successfully
    }
  } catch {
    // PATCH failed — fall through to POST
  }

  // No existing row — INSERT new one
  await sbWrite(
    'partner_edits',
    { partner_id: partnerId, field, value, updated_at: now },
    'POST',
    'return=minimal',
  );
}

/**
 * Save multiple field edits for one partner.
 */
export async function saveFields(
  partnerId: string,
  fields: Record<string, string>,
): Promise<void> {
  await Promise.all(
    Object.entries(fields).map(([field, value]) => saveField(partnerId, field, value)),
  );
}

/** Soft-delete a partner by setting deleted=true. Filters them out on next load. */
export async function deletePartner(partnerId: string): Promise<void> {
  await saveField(partnerId, 'deleted', 'true');
}

/** Insert a new conversation log entry into Supabase. */
export async function saveConversation(partnerId: string, entry: {
  title: string; date: string; channel: string; summary: string;
  key_takeaways: string; next_steps: string; logged_by: string;
}): Promise<void> {
  await sbWrite('conversation_log', {
    partner_id: partnerId,
    title: entry.title,
    date: entry.date || null,
    channel: entry.channel,
    summary: entry.summary,
    key_takeaways: entry.key_takeaways,
    next_steps: entry.next_steps,
    logged_by: entry.logged_by,
  });
}

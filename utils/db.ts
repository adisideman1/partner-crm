// Partner edits persistence — reads/writes to Supabase partner_edits table.
// Uses dual-mode client (run_command proxy in Tasklet, direct fetch when deployed).

import { sbGet, sbWrite } from './supabase';

export async function loadAllEdits(): Promise<
  { partner_id: string; field: string; value: string }[]
> {
  const rows = (await sbGet(
    'partner_edits?select=partner_id,field,value',
  )) as { partner_id: string; field: string; value: string }[];
  return rows;
}

export async function saveField(
  partnerId: string,
  field: string,
  value: string,
): Promise<void> {
  await sbWrite('partner_edits', {
    partner_id: partnerId,
    field,
    value,
    updated_at: new Date().toISOString(),
  });
}

export async function saveFields(
  partnerId: string,
  fields: Record<string, string>,
): Promise<void> {
  const now = new Date().toISOString();
  const rows = Object.entries(fields).map(([field, value]) => ({
    partner_id: partnerId,
    field,
    value,
    updated_at: now,
  }));
  await sbWrite('partner_edits', rows);
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

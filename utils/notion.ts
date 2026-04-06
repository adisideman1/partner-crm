/**
 * utils/notion.ts — Supabase-backed data layer
 *
 * Previously called window.tasklet.runTool() to fetch from Notion.
 * Now reads from Supabase `partners_cache` table so the app works
 * as a standalone deployed site (no Tasklet dependency).
 *
 * The `partners_cache` table is synced from Notion by a Tasklet schedule job.
 */

import { Partner, Conversation, OnboardingEntry } from '../types';
import { sbGet } from './supabase';

// alias for readability
const sbFetch = sbGet;

function normalize(s: string): string {
  return (s || '')
    .replace('Graduated', 'Ongoing Management')
    .replace('Paused', 'Archived')
    .replace('⚪ Archived', '📦 Archived')
    .replace(/^Active Onboarding$/, '🔵 Active Onboarding')
    .replace(/^Ongoing Management$/, '🟢 Ongoing Management')
    .replace(/^Prospect$/, '🟡 Prospect')
    .replace(/^Churned$/, '🔴 Churned')
    .replace(/^Self Sufficient$/, '🟣 Self Sufficient')
    .replace(/^Archived$/, '📦 Archived')
    .replace(/^VIP$/, '⭐ VIP');
}

interface CacheRow {
  id: string;
  name: string;
  email: string;
  company: string;
  url: string;
  onboarding_stage: string;
  priority: string;
  account_manager: string;
  app_user_id: string;
  channel_link: string;
  youtube_channel: string;
  popcorn_channel: string;
  use_case: string;
  next_steps: string;
  last_conversation: string;
  next_follow_up: string;
  source: string;
}

function rowToPartner(row: CacheRow): Partner {
  return {
    id: row.id,
    url: row.url || '',
    name: row.name || '',
    email: row.email || '',
    company: row.company || '',
    onboardingStage: normalize(row.onboarding_stage || ''),
    priority: normalize(row.priority || 'Standard'),
    accountManager: row.account_manager || '',
    appUserId: row.app_user_id || '',
    channelLink: row.channel_link || '',
    channelStatus: '',
    youtubeChannel: row.youtube_channel || '',
    popcornChannel: row.popcorn_channel || '',
    useCase: row.use_case || '',
    nextSteps: row.next_steps || '',
    lastConversation: row.last_conversation || '',
    nextFollowUp: row.next_follow_up || '',
    source: (row.source as Partner['source']) || 'crm',
    detailsLoaded: true, // all details come from cache row
  };
}

/**
 * Load all partners from Supabase partners_cache table.
 * Returns full Partner objects (no lazy loading needed).
 */
export async function fetchPartnerList(): Promise<Partner[]> {
  const rows = (await sbFetch(
    'partners_cache?select=*&order=name.asc&limit=200'
  )) as CacheRow[];
  return rows.map(rowToPartner);
}

/**
 * Fetch a single partner detail — already loaded from cache, just return cached data.
 * Kept for API compatibility; in practice detailsLoaded=true so this isn't called.
 */
export async function fetchPartnerDetail(id: string): Promise<Partner | null> {
  try {
    const rows = (await sbFetch(
      `partners_cache?id=eq.${encodeURIComponent(id)}&select=*&limit=1`
    )) as CacheRow[];
    if (!rows.length) return null;
    return rowToPartner(rows[0]);
  } catch (err) {
    console.error(`fetchPartnerDetail(${id}) failed:`, err);
    return null;
  }
}

/**
 * Conversations — not yet cached in Supabase, return empty for standalone app.
 * The Tasklet-hosted version can still fetch these via Notion.
 */
export async function fetchConversationsForPartner(_partnerName: string): Promise<Conversation[]> {
  // Conversations are not cached in Supabase yet.
  // They will appear empty in the standalone app.
  return [];
}

/**
 * Onboarding table data — merged into partners_cache at sync time.
 * Return empty array; the mergeOnboardingData function is a no-op.
 */
export async function fetchOnboardingTable(): Promise<OnboardingEntry[]> {
  return [];
}

/**
 * No-op since onboarding data is already merged into partners_cache.
 */
export function mergeOnboardingData(partners: Partner[], _onboarding: OnboardingEntry[]): Partner[] {
  return partners;
}

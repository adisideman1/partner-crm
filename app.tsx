import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { RefreshCw, Lock, LogOut } from 'lucide-react';

// ---- Password Gate ----
const PASS_HASH = '5a39c3bfa498e8dff5e75bed7fcbc9342b498b73581cdbb63f78a45473c52af6'; // SHA-256 of "CRM2026"
const AUTH_KEY = 'crm_auth';

async function hashPassword(pw: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const PasswordGate: React.FC<{ children: React.ReactNode; onLockRef: React.MutableRefObject<(() => void) | null> }> = ({ children, onLockRef }) => {
  const [authed, setAuthed] = useState(() => localStorage.getItem(AUTH_KEY) === 'true');
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  onLockRef.current = () => { localStorage.removeItem(AUTH_KEY); setAuthed(false); setInput(''); };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setChecking(true);
    setError(false);
    const h = await hashPassword(input);
    if (h === PASS_HASH) {
      localStorage.setItem(AUTH_KEY, 'true');
      setAuthed(true);
    } else {
      setError(true);
    }
    setChecking(false);
  };

  if (authed) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-base-200 to-base-300 p-4">
      <div className="card bg-base-100 shadow-2xl w-full max-w-sm">
        <div className="card-body items-center text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <h2 className="card-title text-2xl">Partner CRM</h2>
          <p className="text-base-content/60 text-sm">Enter password to continue</p>
          <form onSubmit={handleSubmit} className="w-full space-y-3">
            <input
              type="password"
              placeholder="Password"
              className={`input input-bordered w-full ${error ? 'input-error' : ''}`}
              value={input}
              onChange={e => { setInput(e.target.value); setError(false); }}
              autoFocus
            />
            {error && <p className="text-error text-xs">Incorrect password</p>}
            <button type="submit" className="btn btn-primary w-full" disabled={checking || !input}>
              {checking ? <span className="loading loading-spinner loading-sm" /> : 'Unlock'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
import { Partner, Conversation, Filters, STAGE_SORT_ORDER } from './types';
import {
  fetchPartnerList,
  fetchPartnerDetail,
  fetchConversationsForPartner,
  fetchOnboardingTable,
  mergeOnboardingData,
} from './utils/notion';
import { loadAllEdits, saveField, saveFields, deletePartner, saveConversation } from './utils/db';
import { StatsBar } from './components/StatsBar';
import { FilterBar } from './components/FilterBar';
import { PartnerList } from './components/PartnerList';
import { PartnerDetail } from './components/PartnerDetail';
import { KOLTab } from './components/KOLTab';
import { loadAllEdits as loadAllEditsRaw } from './utils/db';

type AppTab = 'partners' | 'kols';

// ---- Persistence helpers ----

const EDITABLE_FIELDS = ['onboardingStage', 'accountManager', 'useCase', 'nextSteps', 'driveFolder', 'nextFollowUp', 'lastConversation'] as const;
type EditableField = typeof EDITABLE_FIELDS[number];

async function loadEdits(): Promise<Record<string, Record<string, string>>> {
  const rows = await loadAllEdits();
  const edits: Record<string, Record<string, string>> = {};
  for (const row of rows) {
    const pid = row.partner_id;
    const field = row.field;
    const value = row.value;
    if (!edits[pid]) edits[pid] = {};
    edits[pid][field] = value;
  }
  return edits;
}

function applyEdits(partners: Partner[], edits: Record<string, Record<string, string>>): Partner[] {
  // Build a set of CRM IDs that have names in the DB (real partners we know about)
  const dbPartnerNames: Record<string, string> = {};
  for (const [pid, fields] of Object.entries(edits)) {
    if (!pid.startsWith('onb-') && !pid.startsWith('kol-') && fields.name) {
      dbPartnerNames[pid] = fields.name;
    }
  }

  // For any onb- partner, check if a matching CRM entry exists in DB by name
  // If so, replace the onb- entry with the CRM one
  const normalizeN = (n: string) => n.replace(/\(.*?\)/g, '').replace(/[^\w\s]/g, '').trim().toLowerCase();
  const result: Partner[] = [];
  const seenIds = new Set<string>();

  for (const p of partners) {
    // Exclude partners flagged as KOL-only or deleted
    if (edits[p.id]?.isKOL === 'true') continue;
    if (edits[p.id]?.deleted === 'true') continue;
    if (p.id.startsWith('onb-')) {
      // Check if a CRM ID exists for this name in DB
      const normP = normalizeN(p.name);
      const matchingCrmId = Object.entries(dbPartnerNames).find(([, name]) => {
        const normDb = normalizeN(name);
        return normDb === normP || normDb.includes(normP) || normP.includes(normDb);
      });
      if (matchingCrmId) {
        // Replace onb- entry with CRM-backed entry
        if (seenIds.has(matchingCrmId[0])) continue; // already added
        seenIds.add(matchingCrmId[0]);
        const stub: Partner = {
          ...p,
          id: matchingCrmId[0],
          name: matchingCrmId[1],
          source: 'crm',
          detailsLoaded: false,
        };
        const e = edits[matchingCrmId[0]];
        if (e) {
          if (e.onboardingStage !== undefined) stub.onboardingStage = e.onboardingStage;
          if (e.accountManager !== undefined) stub.accountManager = e.accountManager;
          if (e.useCase !== undefined) stub.useCase = e.useCase;
          if (e.nextSteps !== undefined) stub.nextSteps = e.nextSteps;
          if (e.driveFolder !== undefined) (stub as any).driveFolder = e.driveFolder;
          if (e.nextFollowUp !== undefined) stub.nextFollowUp = e.nextFollowUp;
          if (e.lastConversation !== undefined) stub.lastConversation = e.lastConversation;
          if (e.channelLink !== undefined) stub.channelLink = e.channelLink;
          if (e.email !== undefined) stub.email = e.email;
          if (e.company !== undefined) stub.company = e.company;
          if (e.appUserId !== undefined) stub.appUserId = e.appUserId;
          if (e.priority !== undefined) stub.priority = e.priority;
        }
        result.push(stub);
        continue;
      }
    }
    if (seenIds.has(p.id)) continue;
    seenIds.add(p.id);
    const e = edits[p.id];
    if (!e) { result.push(p); continue; }
    const updated = { ...p };
    if (e.onboardingStage !== undefined) updated.onboardingStage = e.onboardingStage;
    if (e.accountManager !== undefined) updated.accountManager = e.accountManager;
    if (e.useCase !== undefined) updated.useCase = e.useCase;
    if (e.nextSteps !== undefined) updated.nextSteps = e.nextSteps;
    if (e.driveFolder !== undefined) (updated as any).driveFolder = e.driveFolder;
    if (e.nextFollowUp !== undefined) updated.nextFollowUp = e.nextFollowUp;
    if (e.lastConversation !== undefined) updated.lastConversation = e.lastConversation;
    if (e.channelLink !== undefined && !updated.channelLink) updated.channelLink = e.channelLink;
    if (e.email !== undefined && !updated.email) updated.email = e.email;
    if (e.company !== undefined && !updated.company) updated.company = e.company;
    if (e.appUserId !== undefined && !updated.appUserId) updated.appUserId = e.appUserId;
    if (e.priority !== undefined) updated.priority = e.priority;
    result.push(updated);
  }

  // Add any DB-known CRM partners that weren't returned by search or onboarding
  for (const [pid, name] of Object.entries(dbPartnerNames)) {
    if (!seenIds.has(pid)) {
      // Skip KOL-only or deleted partners
      if (edits[pid]?.isKOL === 'true') continue;
      if (edits[pid]?.deleted === 'true') continue;
      seenIds.add(pid);
      const e = edits[pid] || {};
      result.push({
        id: pid,
        url: pid.startsWith('manual-') ? '' : `https://www.notion.so/${pid.replace(/-/g, '')}`,
        name,
        email: e.email || '',
        company: e.company || '',
        onboardingStage: e.onboardingStage || '🟡 Prospect',
        priority: e.priority || 'Standard',
        accountManager: e.accountManager || '',
        appUserId: e.appUserId || '',
        channelLink: e.channelLink || '',
        channelStatus: '',
        youtubeChannel: e.youtubeChannel || '',
        popcornChannel: e.popcornChannel || '',
        driveFolder: e.driveFolder || '',
        useCase: e.useCase || '',
        nextSteps: e.nextSteps || '',
        lastConversation: e.lastConversation || '',
        nextFollowUp: e.nextFollowUp || '',
        source: 'crm',
        detailsLoaded: true, // manual partners have all data from DB
      });
    }
  }

  return result;
}

function saveEdit(partnerId: string, field: EditableField, value: string) {
  saveField(partnerId, field, value).catch((err) => console.error('Failed to save edit:', err));
}

// ---- Add Partner Modal ----

interface AddPartnerData {
  name: string;
  email: string;
  company: string;
  stage: string;
  manager: string;
}

const AddPartnerModal: React.FC<{ onAdd: (data: AddPartnerData) => void; onClose: () => void }> = ({ onAdd, onClose }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [stage, setStage] = useState('🟡 Prospect');
  const [manager, setManager] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) return;
    onAdd({ name: name.trim(), email: email.trim(), company: company.trim(), stage, manager });
    onClose();
  };

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-sm">
        <h3 className="font-bold text-lg mb-4">Add Partner</h3>
        <div className="space-y-3">
          <label className="label pb-0"><span className="label-text text-xs">Name *</span></label>
          <input
            className="input input-bordered w-full"
            placeholder="Full name"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          />
          <label className="label pb-0"><span className="label-text text-xs">Email</span></label>
          <input
            className="input input-bordered w-full"
            placeholder="email@example.com"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <label className="label pb-0"><span className="label-text text-xs">Company</span></label>
          <input
            className="input input-bordered w-full"
            placeholder="Company name"
            value={company}
            onChange={e => setCompany(e.target.value)}
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="label pb-0"><span className="label-text text-xs">Stage</span></label>
              <select className="select select-bordered w-full select-sm" value={stage} onChange={e => setStage(e.target.value)}>
                {(['🟡 Prospect','🟠 Active Onboarding','🟢 Ongoing Management','🔵 Self Sufficient','🔴 Churned','📦 Archived'] as string[]).map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="label pb-0"><span className="label-text text-xs">Manager</span></label>
              <select className="select select-bordered w-full select-sm" value={manager} onChange={e => setManager(e.target.value)}>
                <option value="">— Unassigned</option>
                {['Tess','Ben','Maria','Cydel','Adi'].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="modal-action">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={handleSubmit} disabled={!name.trim()}>Add Partner</button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
};

// ---- App ----

const App: React.FC<{ onLock?: () => void }> = ({ onLock }) => {
  const [activeTab, setActiveTab] = useState<AppTab>('partners');
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [partnerConversations, setPartnerConversations] = useState<Conversation[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    stage: 'All',
    priority: 'All',
    accountManager: 'All',
    search: '',
  });
  const [showArchived, setShowArchived] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [kolCount, setKolCount] = useState(0);
  // Expansion panel state
  const [expandedPartnerId, setExpandedPartnerId] = useState<string | null>(null);
  const [expandedConversations, setExpandedConversations] = useState<Conversation[]>([]);
  const [loadingExpandConversations, setLoadingExpandConversations] = useState(false);
  const editsRef = useRef<Record<string, Record<string, string>>>({});
  const loadingRef = useRef(false);

  // INITIAL LOAD
  const loadData = useCallback(async (isRefresh = false) => {
    // Prevent double-loading from React StrictMode double-mount
    if (loadingRef.current && !isRefresh) return;
    loadingRef.current = true;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [partnerList, onb, edits] = await Promise.all([
        fetchPartnerList(),
        fetchOnboardingTable(),
        loadEdits(),
      ]);
      editsRef.current = edits;
      // Count KOLs (not deleted)
      const kCount = Object.entries(edits).filter(
        ([, f]) => f.isKOL === 'true' && f.name && f.deleted !== 'true',
      ).length;
      setKolCount(kCount);
      const merged = mergeOnboardingData(partnerList, onb);
      const withEdits = applyEdits(merged, edits);
      setPartners(withEdits);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load data';
      console.error('Failed to load CRM data:', err);
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // LAZY LOAD: Fetch full details when a partner is clicked
  const handleSelectPartner = useCallback(async (partner: Partner) => {
    setSelectedPartner(partner);
    setPartnerConversations([]);

    // Always fetch conversations
    fetchConversationsForPartner(partner.id)
      .then(setPartnerConversations)
      .catch((err) => console.error('Failed to load conversations:', err));

    if (partner.detailsLoaded || partner.id.startsWith('onb-') || partner.id.startsWith('manual-')) {
      return;
    }

    setLoadingDetail(true);
    try {
      const [details, convos] = await Promise.all([
        fetchPartnerDetail(partner.id),
        fetchConversationsForPartner(partner.id),
      ]);

      if (details) {
        const merged: Partner = {
          ...details,
          channelStatus: details.channelStatus || partner.channelStatus, // kept for data compat
          youtubeChannel: details.youtubeChannel || partner.youtubeChannel,
          popcornChannel: details.popcornChannel || partner.popcornChannel,
          appUserId: details.appUserId || partner.appUserId,
          accountManager: details.accountManager || partner.accountManager,
          source: partner.source === 'both' ? 'both' : details.source,
          detailsLoaded: true,
        };
        // Apply any saved edits on top
        const e = editsRef.current[partner.id];
        if (e) {
          if (e.onboardingStage !== undefined) merged.onboardingStage = e.onboardingStage;
          if (e.accountManager !== undefined) merged.accountManager = e.accountManager;
          if (e.useCase !== undefined) merged.useCase = e.useCase;
          if (e.nextSteps !== undefined) merged.nextSteps = e.nextSteps;
          if (e.driveFolder !== undefined) (merged as any).driveFolder = e.driveFolder;
          if (e.nextFollowUp !== undefined) merged.nextFollowUp = e.nextFollowUp;
          if (e.lastConversation !== undefined) merged.lastConversation = e.lastConversation;
          // channelStatus removed — merged into nextSteps
        }
        setSelectedPartner(merged);
        setPartners((prev) => prev.map((p) => (p.id === partner.id ? merged : p)));
      }
      setPartnerConversations(convos);
    } catch (err) {
      console.error('Failed to load partner details:', err);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  // Filter partners — split active from archived
  const { activeFiltered, archivedFiltered } = useMemo(() => {
    const applyFilters = (p: Partner) => {
      if (p.detailsLoaded) {
        if (filters.stage !== 'All' && p.onboardingStage !== filters.stage) return false;
        if (filters.priority !== 'All' && p.priority !== filters.priority) return false;
      }
      if (filters.accountManager !== 'All' && p.accountManager !== filters.accountManager) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const searchable = [p.name, p.company, p.email, p.useCase, p.nextSteps].join(' ').toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    };

    const sortFn = (a: Partner, b: Partner) => {
      const orderA = STAGE_SORT_ORDER[a.onboardingStage] ?? 99;
      const orderB = STAGE_SORT_ORDER[b.onboardingStage] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      if (a.priority === '⭐ VIP' && b.priority !== '⭐ VIP') return -1;
      if (b.priority === '⭐ VIP' && a.priority !== '⭐ VIP') return 1;
      return a.name.localeCompare(b.name);
    };

    const all = partners.filter(applyFilters);
    const active = all.filter((p) => p.onboardingStage !== '📦 Archived').sort(sortFn);
    const archived = all.filter((p) => p.onboardingStage === '📦 Archived').sort(sortFn);
    return { activeFiltered: active, archivedFiltered: archived };
  }, [partners, filters]);

  // Generic edit handler: optimistic update + background persist
  const handleFieldChange = useCallback((partnerId: string, field: EditableField, value: string) => {
    // Optimistic update
    setPartners((prev) =>
      prev.map((p) => (p.id === partnerId ? { ...p, [field]: value } : p))
    );
    setSelectedPartner((prev) =>
      prev && prev.id === partnerId ? { ...prev, [field]: value } : prev
    );
    // Track in ref
    if (!editsRef.current[partnerId]) editsRef.current[partnerId] = {};
    editsRef.current[partnerId][field] = value;
    // Persist
    saveEdit(partnerId, field, value);
  }, []);

  const handleStageChange = useCallback((id: string, v: string) => handleFieldChange(id, 'onboardingStage', v), [handleFieldChange]);
  const handleManagerChange = useCallback((id: string, v: string) => handleFieldChange(id, 'accountManager', v), [handleFieldChange]);
  const handleDescriptionChange = useCallback((id: string, v: string) => handleFieldChange(id, 'useCase', v), [handleFieldChange]);
  const handleNextStepsChange = useCallback((id: string, v: string) => handleFieldChange(id, 'nextSteps', v), [handleFieldChange]);
  const handleDriveFolderChange = useCallback((id: string, v: string) => handleFieldChange(id, 'driveFolder', v), [handleFieldChange]);
  const handleFollowUpChange = useCallback((id: string, v: string) => handleFieldChange(id, 'nextFollowUp', v), [handleFieldChange]);
  // channelStatus handler removed

  // Expansion panel: load conversations when expanding a partner
  const handleExpandPartner = useCallback(async (partner: Partner | null) => {
    if (!partner) {
      setExpandedPartnerId(null);
      setExpandedConversations([]);
      return;
    }
    setExpandedPartnerId(partner.id);
    setExpandedConversations([]);
    setLoadingExpandConversations(true);
    try {
      const convos = await fetchConversationsForPartner(partner.id);
      setExpandedConversations(convos);
    } catch (err) {
      console.error('Failed to load conversations for expansion:', err);
    } finally {
      setLoadingExpandConversations(false);
    }
  }, []);

  const handleAddConversation = useCallback(async (partnerId: string, entry: {
    title: string; date: string; channel: string; summary: string;
    key_takeaways: string; next_steps: string; logged_by: string;
  }) => {
    try {
      await saveConversation(partnerId, entry);
      // Refresh conversations
      const convos = await fetchConversationsForPartner(partnerId);
      setPartnerConversations(convos);
      // Also refresh expanded panel conversations if same partner
      if (expandedPartnerId === partnerId) {
        setExpandedConversations(convos);
      }
      // Auto-update lastConversation to the most recent date
      if (convos.length > 0) {
        const sorted = [...convos].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        if (sorted[0].date) {
          handleFieldChange(partnerId, 'lastConversation', sorted[0].date);
        }
      }
    } catch (err) {
      console.error('Failed to save conversation:', err);
    }
  }, [handleFieldChange, expandedPartnerId]);

  const handleDeletePartner = useCallback(async (id: string) => {
    setPartners(prev => prev.filter(p => p.id !== id));
    setSelectedPartner(prev => prev?.id === id ? null : prev);
    setExpandedPartnerId(prev => prev === id ? null : prev);
    try { await deletePartner(id); } catch (err) { console.error('Failed to delete partner:', err); }
  }, []);

  const handleAddPartner = useCallback(async (data: { name: string; email: string; company: string; stage: string; manager: string }) => {
    const slug = 'manual-' + data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const id = `${slug}-${Date.now().toString(36)}`;
    const fields: Record<string, string> = {
      name: data.name,
      onboardingStage: data.stage || '🟡 Prospect',
    };
    if (data.email) fields.email = data.email;
    if (data.company) fields.company = data.company;
    if (data.manager) fields.accountManager = data.manager;
    try { await saveFields(id, fields); } catch (err) { console.error('Failed to add partner:', err); }
    const newPartner: Partner = {
      id,
      url: '',
      name: data.name,
      email: data.email,
      company: data.company,
      onboardingStage: data.stage || '🟡 Prospect',
      priority: 'Standard',
      accountManager: data.manager,
      appUserId: '',
      channelLink: '',
      channelStatus: '',
      youtubeChannel: '',
      popcornChannel: '',
      driveFolder: '',
      useCase: '',
      nextSteps: '',
      lastConversation: '',
      nextFollowUp: '',
      source: 'manual' as any,
      detailsLoaded: true,
    };
    if (!editsRef.current[id]) editsRef.current[id] = {};
    Object.entries(fields).forEach(([k, v]) => { editsRef.current[id][k] = v; });
    setPartners(prev => [...prev, newPartner]);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <span className="loading loading-spinner loading-lg text-primary" />
        <p className="text-sm text-base-content/60">Loading partners from Notion...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="alert alert-error max-w-md">
          <span>{error}</span>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => loadData()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-4">
      {selectedPartner ? (
        <PartnerDetail
          partner={selectedPartner}
          conversations={partnerConversations}
          loadingDetail={loadingDetail}
          onBack={() => {
            setSelectedPartner(null);
            setPartnerConversations([]);
          }}
          onStageChange={handleStageChange}
          onManagerChange={handleManagerChange}
          onDescriptionChange={handleDescriptionChange}
          onNextStepsChange={handleNextStepsChange}
          onDriveFolderChange={handleDriveFolderChange}
          onFollowUpChange={handleFollowUpChange}
          onAddConversation={handleAddConversation}
        />
      ) : (
        <>
          {/* Tab Navigation */}
          <div className="flex gap-3 mb-1 relative">
            {onLock && (
              <button
                className="btn btn-ghost btn-sm btn-circle absolute -top-1 right-0 opacity-40 hover:opacity-100 tooltip tooltip-left z-10"
                data-tip="Lock CRM"
                onClick={onLock}
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
            <button
              className={`btn btn-lg gap-3 flex-1 text-lg font-bold ${
                activeTab === 'partners'
                  ? 'btn-primary shadow-lg'
                  : 'btn-ghost bg-base-200 hover:bg-base-300'
              }`}
              onClick={() => setActiveTab('partners')}
            >
              🤝 Partners
              <span className={`badge badge-lg ${activeTab === 'partners' ? 'badge-primary-content bg-white/20' : 'badge-ghost'}`}>
                {partners.filter(p => p.onboardingStage !== '📦 Archived').length}
              </span>
            </button>
            <button
              className={`btn btn-lg gap-3 flex-1 text-lg font-bold ${
                activeTab === 'kols'
                  ? 'btn-primary shadow-lg'
                  : 'btn-ghost bg-base-200 hover:bg-base-300'
              }`}
              onClick={() => setActiveTab('kols')}
            >
              🎯 KOLs
              <span className={`badge badge-lg ${activeTab === 'kols' ? 'badge-primary-content bg-white/20' : 'badge-ghost'}`}>
                {kolCount}
              </span>
            </button>
          </div>

          {activeTab === 'partners' && (
            <>
              {/* Stats */}
              <StatsBar partners={partners} />

              {/* Toolbar */}
              <div className="flex items-center justify-between gap-2">
                <FilterBar filters={filters} onFiltersChange={setFilters} />
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    className="btn btn-primary btn-sm gap-1"
                    onClick={() => setShowAddModal(true)}
                  >
                    + Add Partner
                  </button>
                  <button
                    className={`btn btn-ghost btn-sm btn-square ${refreshing ? 'animate-spin' : ''}`}
                    onClick={() => loadData(true)}
                    disabled={refreshing}
                    title="Refresh from Notion"
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
              </div>

              {/* Count */}
              <p className="text-xs text-base-content/50">
                Showing {activeFiltered.length} active partner{activeFiltered.length !== 1 ? 's' : ''}
                {archivedFiltered.length > 0 && ` · ${archivedFiltered.length} archived`}
              </p>

              {/* Active Partner List */}
              <PartnerList
                partners={activeFiltered}
                onSelect={handleSelectPartner}
                selectedId={selectedPartner?.id ?? null}
                onStageChange={handleStageChange}
                onManagerChange={handleManagerChange}
                onDelete={handleDeletePartner}
                expandedId={expandedPartnerId}
                onExpand={handleExpandPartner}
                expandedConversations={expandedConversations}
                loadingExpandConversations={loadingExpandConversations}
                onDescriptionChange={handleDescriptionChange}
                onNextStepsChange={handleNextStepsChange}
                onDriveFolderChange={handleDriveFolderChange}
                onFollowUpChange={handleFollowUpChange}
                onAddConversation={handleAddConversation}
              />

              {/* Archived Section */}
              {archivedFiltered.length > 0 && (
                <div className="mt-2">
                  <button
                    className={`btn btn-sm gap-2 ${showArchived ? 'btn-neutral' : 'btn-ghost'}`}
                    onClick={() => setShowArchived(!showArchived)}
                  >
                    <span className="text-base">📦</span>
                    {showArchived ? 'Hide' : 'Show'} Archived ({archivedFiltered.length})
                  </button>
                  {showArchived && (
                    <div className="mt-2 opacity-75">
                      <PartnerList
                        partners={archivedFiltered}
                        onSelect={handleSelectPartner}
                        selectedId={selectedPartner?.id ?? null}
                        onStageChange={handleStageChange}
                        onManagerChange={handleManagerChange}
                        onDelete={handleDeletePartner}
                        expandedId={expandedPartnerId}
                        onExpand={handleExpandPartner}
                        expandedConversations={expandedConversations}
                        loadingExpandConversations={loadingExpandConversations}
                        onDescriptionChange={handleDescriptionChange}
                        onNextStepsChange={handleNextStepsChange}
                        onDriveFolderChange={handleDriveFolderChange}
                        onFollowUpChange={handleFollowUpChange}
                        onAddConversation={handleAddConversation}
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {activeTab === 'kols' && <KOLTab onCountChange={setKolCount} />}

          {showAddModal && (
            <AddPartnerModal
              onAdd={handleAddPartner}
              onClose={() => setShowAddModal(false)}
            />
          )}
        </>
      )}
    </div>
  );
};

const Root: React.FC = () => {
  const lockRef = useRef<(() => void) | null>(null);
  return (
    <PasswordGate onLockRef={lockRef}>
      <App onLock={() => lockRef.current?.()} />
    </PasswordGate>
  );
};

createRoot(document.getElementById('root')!).render(<Root />);

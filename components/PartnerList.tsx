import React, { useState, useMemo } from 'react';
import { ExternalLink, Star, ChevronRight, ChevronDown, Clock, Lightbulb, Play, Trash2, GripVertical } from 'lucide-react';
import { Partner, Conversation, STAGE_COLORS, STAGE_SORT_ORDER, EDITABLE_STAGES, EDITABLE_MANAGERS } from '../types';
import { PartnerExpandPanel } from './PartnerExpandPanel';

interface PartnerListProps {
  partners: Partner[];
  onSelect: (partner: Partner) => void;
  selectedId: string | null;
  onStageChange: (partnerId: string, newStage: string) => void;
  onManagerChange: (partnerId: string, newManager: string) => void;
  onDelete?: (partnerId: string) => void;
  expandedId: string | null;
  onExpand: (partner: Partner | null) => void;
  expandedConversations: Conversation[];
  loadingExpandConversations: boolean;
  onDescriptionChange: (partnerId: string, val: string) => void;
  onNextStepsChange: (partnerId: string, val: string) => void;
  onDriveFolderChange: (partnerId: string, url: string) => void;
  onFollowUpChange: (partnerId: string, date: string) => void;
  onAddConversation: (partnerId: string, entry: {
    title: string; date: string; channel: string; summary: string;
    key_takeaways: string; next_steps: string; logged_by: string;
  }) => void;
  onReorder?: (partnerIds: string[], stage: string) => void;
  grouped?: boolean;
}

function formatDate(d: string): string {
  if (!d) return '';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function isOverdue(d: string): boolean {
  if (!d) return false;
  const date = new Date(d);
  if (isNaN(date.getTime())) return false;
  return date < new Date();
}

function summarize(text: string, maxWords: number): string {
  if (!text) return '';
  const clean = text.replace(/^[-•*]\s*/gm, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
  const words = clean.split(' ');
  if (words.length <= maxWords) return clean;
  return words.slice(0, maxWords).join(' ') + '…';
}

const openExternal = (e: React.MouseEvent, url: string) => {
  e.preventDefault();
  e.stopPropagation();
  try { (window.top || window).open(url, '_blank'); } catch { window.open(url, '_blank'); }
};

const STAGE_HEADER_COLORS: Record<string, string> = {
  '✅ Signed': 'border-l-primary text-primary',
  '🔵 Negotiations': 'border-l-info text-info',
  '🟢 In Good Discussion': 'border-l-success text-success',
  '🟡 Prospect': 'border-l-warning text-warning',
  '⏳ Wait': 'border-l-neutral text-neutral',
  '🔴 Churned': 'border-l-error text-error',
  '📦 Archived': 'border-l-base-300 text-base-content/40',
};

/* ---- Inline editable Next Steps (click to edit, blur to save) ---- */
const InlineNextSteps: React.FC<{
  value: string;
  partnerId: string;
  onChange: (id: string, val: string) => void;
}> = ({ value, partnerId, onChange }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <span
        className="text-base-content/45 italic text-xs cursor-text hover:text-base-content/70 hover:bg-base-200/50 px-1 py-0.5 rounded transition-colors inline-flex items-center gap-1 max-w-[220px] truncate"
        onClick={(e) => { e.stopPropagation(); setDraft(value); setEditing(true); }}
        title={value || 'Click to add next steps'}
      >
        → {summarize(value, 5) || 'Add next steps…'}
      </span>
    );
  }

  return (
    <input
      autoFocus
      className="input input-xs input-bordered w-48 text-xs italic"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { setEditing(false); if (draft !== value) onChange(partnerId, draft); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') setEditing(false);
      }}
      onClick={(e) => e.stopPropagation()}
      placeholder="Next steps..."
    />
  );
};

const ChannelBadge: React.FC<{ url: string }> = ({ url }) => {
  const isYt = url.includes('youtube.com') || url.includes('youtu.be');
  if (isYt) {
    return (
      <a
        href={url}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors cursor-pointer text-xs"
        onClick={(e) => openExternal(e, url)}
        title="YouTube Channel"
      >
        <Play size={12} /> YouTube
      </a>
    );
  }
  return (
    <a
      href={url}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer text-xs"
      onClick={(e) => openExternal(e, url)}
      title="Channel Link"
    >
      <ExternalLink size={10} /> Channel
    </a>
  );
};

/* ---- Partner Row ---- */
const PartnerRow: React.FC<{
  p: Partner;
  isExpanded: boolean;
  isSelected: boolean;
  isConfirming: boolean;
  onExpand: (partner: Partner | null) => void;
  onSelect: (partner: Partner) => void;
  onStageChange: (id: string, v: string) => void;
  onManagerChange: (id: string, v: string) => void;
  onDelete?: (id: string) => void;
  setConfirmDeleteId: (id: string | null) => void;
  expandedConversations: Conversation[];
  loadingExpandConversations: boolean;
  onDescriptionChange: (id: string, v: string) => void;
  onNextStepsChange: (id: string, v: string) => void;
  onDriveFolderChange: (id: string, v: string) => void;
  onFollowUpChange: (id: string, v: string) => void;
  onAddConversation: (id: string, entry: any) => void;
}> = ({
  p, isExpanded, isSelected, isConfirming, onExpand, onSelect,
  onStageChange, onManagerChange, onDelete, setConfirmDeleteId,
  expandedConversations, loadingExpandConversations,
  onDescriptionChange, onNextStepsChange, onDriveFolderChange, onFollowUpChange, onAddConversation,
}) => {
  const stageClass = STAGE_COLORS[p.onboardingStage] || 'badge-ghost';
  const overdue = isOverdue(p.nextFollowUp);
  const isSigned = p.onboardingStage === '✅ Signed';

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('application/x-crm-partner', JSON.stringify({ id: p.id, name: p.name, type: 'partner' }));
        e.dataTransfer.setData('application/x-cross-tab', JSON.stringify({ id: p.id, name: p.name, fromTab: 'partners' }));
        e.dataTransfer.effectAllowed = 'move';
      }}
      className={`rounded-xl border transition-all cursor-pointer group ${
        isExpanded
          ? 'border-primary/40 shadow-lg bg-base-100 ring-1 ring-primary/20'
          : isSelected
          ? 'border-primary bg-base-100'
          : 'border-base-content/5 bg-base-100 hover:border-base-content/15 hover:shadow-md'
      } ${isSigned ? 'border-l-4 !border-l-primary' : ''}`}
      onClick={() => { setConfirmDeleteId(null); onExpand(isExpanded ? null : p); }}
    >
      <div className="px-4 py-3 space-y-1.5">
        {/* Row 1: Drag handle + Title + Stage + Actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <GripVertical size={14} className="text-base-content/20 shrink-0 cursor-grab active:cursor-grabbing" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className={`font-semibold truncate ${isSigned ? 'text-primary' : ''}`}>
                  {p.company ? `${p.company}, ${p.name}` : p.name}
                </h3>
                {p.priority === '⭐ VIP' && <Star size={13} className="text-warning shrink-0 fill-current" />}
              </div>
              {p.connector && (
                <span className="text-[11px] text-base-content/40 leading-tight">[{p.connector}]</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <select
              className={`select select-bordered select-xs text-xs font-medium ${stageClass}`}
              value={p.onboardingStage}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => { e.stopPropagation(); onStageChange(p.id, e.target.value); }}
            >
              {EDITABLE_STAGES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <span className="flex items-center gap-0" onClick={(e) => e.stopPropagation()}>
              <select
                className="select select-ghost select-xs text-xs py-0 h-6 min-h-0 w-16 pr-5"
                value={p.accountManager || ''}
                onChange={(e) => { e.stopPropagation(); onManagerChange(p.id, e.target.value); }}
              >
                <option value="">—</option>
                {EDITABLE_MANAGERS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
                {p.accountManager && !EDITABLE_MANAGERS.includes(p.accountManager) && p.accountManager !== '' && (
                  <option value={p.accountManager}>{p.accountManager}</option>
                )}
              </select>
            </span>
            {onDelete && (
              isConfirming ? (
                <button
                  className="btn btn-xs btn-error gap-1 animate-pulse"
                  onClick={(e) => { e.stopPropagation(); onDelete(p.id); setConfirmDeleteId(null); }}
                  title="Confirm remove"
                >
                  <Trash2 size={11} /> Remove?
                </button>
              ) : (
                <button
                  className="btn btn-xs btn-ghost btn-square opacity-0 group-hover:opacity-40 hover:!opacity-100 hover:btn-error transition-opacity"
                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(p.id); }}
                  title="Remove"
                >
                  <Trash2 size={12} />
                </button>
              )
            )}
            {isExpanded ? (
              <ChevronDown size={15} className="opacity-60 text-primary" />
            ) : (
              <ChevronRight size={15} className="opacity-30" />
            )}
          </div>
        </div>

        {/* Row 2: Use case + Editable Next Steps + Last Contacted */}
        <div className="flex items-center gap-x-3 text-sm min-h-[20px]">
          {p.useCase && (
            <span className="text-base-content/70 flex items-center gap-1 shrink-0">
              <Lightbulb size={12} className="text-secondary shrink-0" />
              {summarize(p.useCase, 10)}
            </span>
          )}
          <InlineNextSteps
            value={p.nextSteps || ''}
            partnerId={p.id}
            onChange={onNextStepsChange}
          />
          <span className="ml-auto text-xs text-base-content/40 flex items-center gap-1 shrink-0 whitespace-nowrap">
            <Clock size={10} />
            {(p.lastConversation && formatDate(p.lastConversation)) || 'No contact'}
          </span>
        </div>

        {/* Row 3: Badges + metadata */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(p.youtubeChannel || p.channelLink) && (
            <ChannelBadge url={p.youtubeChannel || p.channelLink || ''} />
          )}
          {p.popcornChannel && (
            <a
              href={p.popcornChannel}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-colors cursor-pointer text-xs"
              onClick={(e) => openExternal(e, p.popcornChannel!)}
              title="Popcorn Channel"
            >
              🍿 Popcorn
            </a>
          )}
          {(p as any).driveFolder && (
            <a
              href={(p as any).driveFolder}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors cursor-pointer text-xs"
              onClick={(e) => openExternal(e, (p as any).driveFolder)}
              title="Google Drive Folder"
            >
              📁 Drive
            </a>
          )}
          {p.appUserId && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-base-200 text-base-content/50 text-xs font-mono">🔑 ID</span>
          )}
          {p.nextFollowUp && formatDate(p.nextFollowUp) && (
            <span className={`inline-flex items-center gap-1 text-xs ${overdue ? 'text-error font-semibold' : 'text-base-content/40'}`}>
              📅 {formatDate(p.nextFollowUp)}
              {overdue && ' ⚠️'}
            </span>
          )}
        </div>
      </div>

      {/* Expansion Panel */}
      {isExpanded && (
        <PartnerExpandPanel
          partner={p}
          conversations={expandedConversations}
          loadingConversations={loadingExpandConversations}
          onOpenFullView={() => onSelect(p)}
          onDescriptionChange={onDescriptionChange}
          onNextStepsChange={onNextStepsChange}
          onDriveFolderChange={onDriveFolderChange}
          onFollowUpChange={onFollowUpChange}
          onManagerChange={onManagerChange}
          onAddConversation={onAddConversation}
        />
      )}
    </div>
  );
};

/* ---- Stage Drop Zone with intra-section reordering ---- */
const StageDropZone: React.FC<{
  stage: string;
  partners: Partner[];
  onStageChange: (id: string, stage: string) => void;
  onReorder?: (partnerIds: string[], stage: string) => void;
  renderRow: (p: Partner) => React.ReactNode;
}> = ({ stage, partners: pts, onStageChange, onReorder, renderRow }) => {
  const [dragOver, setDragOver] = useState(false);
  const [dropLineIdx, setDropLineIdx] = useState<number | null>(null);
  const dragCounter = React.useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/x-crm-partner')) {
      e.preventDefault();
      dragCounter.current++;
      setDragOver(true);
    }
  };
  const handleDragLeave = () => {
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setDragOver(false);
      setDropLineIdx(null);
    }
  };
  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('application/x-crm-partner')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleRowDragOver = (e: React.DragEvent, idx: number) => {
    if (!e.dataTransfer.types.includes('application/x-crm-partner')) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    setDropLineIdx(e.clientY < midY ? idx : idx + 1);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current = 0;
    setDragOver(false);
    const savedDropIdx = dropLineIdx;
    setDropLineIdx(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/x-crm-partner'));
      if (!data?.id) return;

      const fromIdx = pts.findIndex(p => p.id === data.id);
      if (fromIdx >= 0 && onReorder && savedDropIdx !== null) {
        // Intra-section reorder
        if (savedDropIdx !== fromIdx && savedDropIdx !== fromIdx + 1) {
          const newOrder = [...pts];
          const [moved] = newOrder.splice(fromIdx, 1);
          const insertAt = savedDropIdx > fromIdx ? savedDropIdx - 1 : savedDropIdx;
          newOrder.splice(insertAt, 0, moved);
          onReorder(newOrder.map(p => p.id), stage);
        }
      } else if (fromIdx < 0) {
        // Cross-section drop — change stage
        onStageChange(data.id, stage);
      }
    } catch {}
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`rounded-lg transition-all duration-200 ${
        dragOver ? 'bg-primary/5 ring-2 ring-primary/30 ring-offset-2 ring-offset-base-100' : ''
      }`}
    >
      <div className={`flex items-center gap-2 mb-2 pl-1 border-l-4 ${STAGE_HEADER_COLORS[stage] || 'border-l-base-300 text-base-content/50'}`}>
        <span className="pl-2 text-xs font-bold uppercase tracking-wider">{stage}</span>
        <span className="text-xs text-base-content/30">({pts.length})</span>
        {dragOver && <span className="text-xs text-primary animate-pulse ml-1">↳ Drop here</span>}
      </div>
      <div className="space-y-1.5">
        {pts.map((p, idx) => (
          <React.Fragment key={p.id}>
            {dropLineIdx === idx && (
              <div className="h-1 bg-primary rounded-full mx-4 my-0.5 shadow-sm shadow-primary/40" />
            )}
            <div onDragOver={(e) => handleRowDragOver(e, idx)}>
              {renderRow(p)}
            </div>
            {idx === pts.length - 1 && dropLineIdx === pts.length && (
              <div className="h-1 bg-primary rounded-full mx-4 my-0.5 shadow-sm shadow-primary/40" />
            )}
          </React.Fragment>
        ))}
      </div>
      {pts.length === 0 && (
        <div className={`text-center py-4 text-xs rounded-lg border border-dashed ${
          dragOver ? 'border-primary/40 text-primary' : 'border-base-content/10 text-base-content/30'
        }`}>
          {dragOver ? 'Release to move here' : 'Drag opportunities here'}
        </div>
      )}
    </div>
  );
};

/* ---- Partner List ---- */
export const PartnerList: React.FC<PartnerListProps> = ({
  partners, onSelect, selectedId, onStageChange, onManagerChange, onDelete,
  expandedId, onExpand, expandedConversations, loadingExpandConversations,
  onDescriptionChange, onNextStepsChange, onDriveFolderChange, onFollowUpChange, onAddConversation,
  onReorder,
  grouped = true,
}) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const stageGroups = useMemo(() => {
    if (!grouped) return null;
    const stageMap = new Map<string, Partner[]>();
    for (const s of EDITABLE_STAGES) {
      if (s !== '📦 Archived' && s !== '🔴 Churned') stageMap.set(s, []);
    }
    for (const p of partners) {
      const stage = p.onboardingStage || '🟡 Prospect';
      if (!stageMap.has(stage)) stageMap.set(stage, []);
      stageMap.get(stage)!.push(p);
    }
    return [...stageMap.entries()]
      .sort((a, b) => (STAGE_SORT_ORDER[a[0]] ?? 99) - (STAGE_SORT_ORDER[b[0]] ?? 99))
      .map(([stage, pts]) => ({ stage, partners: pts }));
  }, [partners, grouped]);

  if (partners.length === 0) {
    return (
      <div className="text-center py-12 text-base-content/60">
        <p className="text-lg">No opportunities found</p>
        <p className="text-sm mt-1">Try adjusting your filters</p>
      </div>
    );
  }

  const renderRow = (p: Partner) => (
    <PartnerRow
      key={p.id}
      p={p}
      isExpanded={expandedId === p.id}
      isSelected={selectedId === p.id}
      isConfirming={confirmDeleteId === p.id}
      onExpand={onExpand}
      onSelect={onSelect}
      onStageChange={onStageChange}
      onManagerChange={onManagerChange}
      onDelete={onDelete}
      setConfirmDeleteId={setConfirmDeleteId}
      expandedConversations={expandedConversations}
      loadingExpandConversations={loadingExpandConversations}
      onDescriptionChange={onDescriptionChange}
      onNextStepsChange={onNextStepsChange}
      onDriveFolderChange={onDriveFolderChange}
      onFollowUpChange={onFollowUpChange}
      onAddConversation={onAddConversation}
    />
  );

  if (stageGroups && stageGroups.length > 1) {
    return (
      <div className="space-y-5">
        {stageGroups.map(({ stage, partners: pts }) => (
          <StageDropZone
            key={stage}
            stage={stage}
            partners={pts}
            onStageChange={onStageChange}
            onReorder={onReorder}
            renderRow={renderRow}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {partners.map(renderRow)}
    </div>
  );
};
